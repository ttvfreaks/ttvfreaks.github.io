(function () {
  'use strict';

  var firebaseConfig = {
    apiKey: "AIzaSyAwQQcO3nVXK9b6sAdj2lLfY7Uiuyby0nM",
    authDomain: "borya-taa.firebaseapp.com",
    projectId: "borya-taa",
    storageBucket: "borya-taa.firebasestorage.app",
    messagingSenderId: "642385345711",
    appId: "1:642385345711:web:60a80d1f1a2113adeca85a"
  };

  firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();

  function generateCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = '';
    for (var i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  window.TAASync = {
    createRoom: function (config) {
      var code = generateCode();
      return db.collection('taa-rooms').doc(code).set({
        roomConfig: config,
        gameWinners: {},
        gameOrder: {},
        wins: { streamer: 0, opponent: 0 },
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      }).then(function () {
        return code;
      });
    },

    joinRoom: function (code, onUpdate) {
      return db.collection('taa-rooms').doc(code.toUpperCase()).onSnapshot(function (snap) {
        if (!snap.exists) {
          onUpdate({ error: 'not_found' });
          return;
        }
        var data = snap.data();
        onUpdate({
          roomConfig: data.roomConfig,
          gameWinners: data.gameWinners || {},
          gameOrder: data.gameOrder || {},
          wins: data.wins || { streamer: 0, opponent: 0 },
          eventLog: data.eventLog || [],
          coinFlip: data.coinFlip || null,
          diceRoll: data.diceRoll || null,
          rps: data.rps || null,
          timer: data.timer || null,
          wheel: data.wheel || null,
        });
      });
    },

    updateGameWinner: function (code, gameKey, winner) {
      var docRef = db.collection('taa-rooms').doc(code);
      return db.runTransaction(function (tx) {
        return tx.get(docRef).then(function (doc) {
          if (!doc.exists) return;
          var data = doc.data();
          var gameWinners = Object.assign({}, data.gameWinners || {});
          var gameOrder = Object.assign({}, data.gameOrder || {});
          var eventLog = (data.eventLog || []).slice();
          var config = data.roomConfig || {};
          var prevWinner = gameWinners[gameKey];

          // Get game name from config
          var parts = gameKey.split(':');
          var cat = parts[0];
          var idx = parseInt(parts[1]);
          var gameName = (config.games && config.games[cat] && config.games[cat][idx]) || gameKey;

          if (winner === 'none') {
            delete gameWinners[gameKey];
            delete gameOrder[gameKey];
          } else {
            gameWinners[gameKey] = winner;
            if (!gameOrder.hasOwnProperty(gameKey)) {
              var maxOrder = 0;
              for (var k in gameOrder) {
                if (gameOrder[k] > maxOrder) maxOrder = gameOrder[k];
              }
              gameOrder[gameKey] = maxOrder + 1;
              eventLog.push({
                type: 'match_played',
                data: {
                  gameKey: gameKey,
                  gameName: gameName,
                  winner: winner,
                  order: maxOrder + 1,
                  streamerName: config.streamerName || 'Стример #1',
                  opponentName: config.opponentName || 'Стример #2',
                },
                timestamp: firebase.firestore.Timestamp.now().toMillis(),
              });
            }
          }

          var wins = { streamer: 0, opponent: 0 };
          for (var key in gameWinners) {
            if (gameWinners[key] === 'streamer') wins.streamer++;
            else if (gameWinners[key] === 'opponent') wins.opponent++;
          }

          tx.update(docRef, {
            gameWinners: gameWinners,
            wins: wins,
            gameOrder: gameOrder,
            eventLog: eventLog,
          });
        });
      });
    },

    calculateWins: function (gameWinners) {
      var wins = { streamer: 0, opponent: 0 };
      for (var key in gameWinners) {
        if (gameWinners[key] === 'streamer') wins.streamer++;
        else if (gameWinners[key] === 'opponent') wins.opponent++;
      }
      return wins;
    },

    // ===== MINI-GAMES =====
    updateCoinFlip: function (code, data) {
      return db.collection('taa-rooms').doc(code).update({ coinFlip: data });
    },

    updateDiceRoll: function (code, data) {
      return db.collection('taa-rooms').doc(code).update({ diceRoll: data });
    },

    updateRPSChoice: function (code, field, choice) {
      var self = this;
      var docRef = db.collection('taa-rooms').doc(code);
      return db.runTransaction(function (transaction) {
        return transaction.get(docRef).then(function (doc) {
          if (!doc.exists) throw new Error('Room not found');
          var data = doc.data();
          var rps = data.rps || {};
          var updateData = {};
          updateData['rps.' + field] = choice;

          // Проверяем, выбрал ли уже оппонент
          var otherField = field === 'streamerChoice' ? 'opponentChoice' : 'streamerChoice';
          var otherChoice = rps[otherField];

          // Вычисляем победителя только если оба выбрали и победитель ещё не определён
          if (otherChoice && choice && !rps.result) {
            var sChoice = field === 'streamerChoice' ? choice : otherChoice;
            var oChoice = field === 'streamerChoice' ? otherChoice : choice;
            var result = self.calculateRPSWinner(sChoice, oChoice);
            var sName = data.roomConfig && data.roomConfig.streamerName || 'Стример #1';
            var oName = data.roomConfig && data.roomConfig.opponentName || 'Стример #2';
            var ts = Date.now();

            updateData['rps.result'] = result;
            updateData['rps.history'] = firebase.firestore.FieldValue.arrayUnion({
              streamer: sChoice,
              opponent: oChoice,
              winner: result,
              timestamp: ts,
            });
            updateData['eventLog'] = firebase.firestore.FieldValue.arrayUnion({
              type: 'rps',
              data: {
                streamer: sChoice,
                opponent: oChoice,
                winner: result,
                streamerName: sName,
                opponentName: oName,
              },
              timestamp: ts,
            });
          }

          transaction.update(docRef, updateData);
        });
      });
    },

    finishRPS: function (code, result) {
      return db.collection('taa-rooms').doc(code).update({
        'rps.result': result,
      });
    },

    addRPSHistory: function (code, entry) {
      return db.collection('taa-rooms').doc(code).update({
        'rps.history': firebase.firestore.FieldValue.arrayUnion(entry),
      });
    },

    addEventLog: function (code, entry) {
      return db.collection('taa-rooms').doc(code).update({
        'eventLog': firebase.firestore.FieldValue.arrayUnion(entry),
      });
    },

    resetRPS: function (code) {
      return db.collection('taa-rooms').doc(code).update({
        'rps.streamerChoice': null,
        'rps.opponentChoice': null,
        'rps.result': null,
      });
    },

    updateTimer: function (code, data) {
      var docRef = db.collection('taa-rooms').doc(code);
      if (data === null) {
        return docRef.update({
          timer: firebase.firestore.FieldValue.delete(),
          timerVersion: firebase.firestore.FieldValue.increment(1),
        });
      }
      return docRef.set({
        timer: {
          startedAt: firebase.firestore.FieldValue.serverTimestamp(),
          duration: data.duration || 0,
        },
        timerVersion: firebase.firestore.FieldValue.increment(1),
      }, { merge: true });
    },

    updateWheel: function (code, data) {
      return db.collection('taa-rooms').doc(code).update({ wheel: data });
    },

    calculateRPSWinner: function (c1, c2) {
      if (c1 === c2) return 'draw';
      if (
        (c1 === 'камень' && c2 === 'ножницы') ||
        (c1 === 'ножницы' && c2 === 'бумага') ||
        (c1 === 'бумага' && c2 === 'камень')
      ) return 'streamer';
      return 'opponent';
    },

    pickWheelResult: function (games) {
      return games[Math.floor(Math.random() * games.length)];
    },
  };
})();
