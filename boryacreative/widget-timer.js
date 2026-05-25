(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var ROOM = params.get('room');
  if (!ROOM) return;

  var firebaseConfig = {
    apiKey: "AIzaSyAwQQcO3nVXK9b6sAdj2lLfY7Uiuyby0nM",
    authDomain: "borya-taa.firebaseapp.com",
    projectId: "borya-taa",
    storageBucket: "borya-taa.firebasestorage.app",
    messagingSenderId: "642385345711",
    appId: "1:642385345711:web:60a80d1f1a2113adeca85a"
  };
  firebase.initializeApp(firebaseConfig, 'timer');
  var db = firebase.firestore();

  var interval = null;
  var currentTimer = null;

  db.collection('taa-rooms').doc(ROOM).onSnapshot(function (snap) {
    if (!snap.exists) return;
    var data = snap.data();
    var timer = data.timer;
    if (!timer) {
      if (interval) { clearInterval(interval); interval = null; }
      document.getElementById('timer-display').textContent = '';
      return;
    }
    currentTimer = timer;
    startCountdown();
  });

  function startCountdown() {
    if (interval) clearInterval(interval);
    interval = setInterval(tick, 200);
    tick();
  }

  function tick() {
    if (!currentTimer) return;
    var now = Date.now();
    var startedAt = currentTimer.startedAt ? currentTimer.startedAt.toMillis() : now;
    var elapsed = Math.floor((now - startedAt) / 1000);
    var remaining = Math.max(0, currentTimer.duration - elapsed);
    var mins = Math.floor(remaining / 60);
    var secs = remaining % 60;
    var display = document.getElementById('timer-display');
    display.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');

    if (remaining === 0) {
      display.classList.add('zero');
      playSound();
      clearInterval(interval);
      interval = null;
      setTimeout(function () { display.textContent = ''; }, 10000);
    } else {
      display.classList.remove('zero');
    }
  }

  function playSound() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  }
})();
