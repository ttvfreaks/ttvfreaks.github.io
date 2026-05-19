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
  };
})();
