(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var ROOM = params.get('room');
  if (!ROOM) { document.body.textContent = 'No room code'; return; }

  var firebaseConfig = {
    apiKey: "AIzaSyAwQQcO3nVXK9b6sAdj2lLfY7Uiuyby0nM",
    authDomain: "borya-taa.firebaseapp.com",
    projectId: "borya-taa",
    storageBucket: "borya-taa.firebasestorage.app",
    messagingSenderId: "642385345711",
    appId: "1:642385345711:web:60a80d1f1a2113adeca85a"
  };
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  var db = firebase.firestore();

  db.collection('taa-rooms').doc(ROOM).onSnapshot(function (snap) {
    if (!snap.exists) return;
    var data = snap.data();
    var config = data.roomConfig || {};
    var wins = data.wins || { streamer: 0, opponent: 0 };

    document.getElementById('score-s-name').textContent = config.streamerName || 'Стример #1';
    document.getElementById('score-s-num').textContent = wins.streamer;
    document.getElementById('score-o-name').textContent = config.opponentName || 'Стример #2';
    document.getElementById('score-o-num').textContent = wins.opponent;
  });
})();
