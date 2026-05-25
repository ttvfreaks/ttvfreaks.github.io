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
      var update = {};
      if (winner === 'none') {
        update['gameWinners.' + gameKey] = firebase.firestore.FieldValue.delete();
      } else {
        update['gameWinners.' + gameKey] = winner;
      }
      return db.collection('taa-rooms').doc(code).update(update);
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
      return db.collection('taa-rooms').doc(code).update({ timer: data });
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
