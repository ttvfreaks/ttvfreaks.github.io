(function () {
  'use strict';

  var state = {
    running: false,
    channel: '',
    ws: null,
    animFrame: null,
    particles: [],
    emotes7tv: new Map(),
    emoteSize: 48,
    emoteTTLMin: 5000,
    emoteTTLMax: 10000,
    bounceStrength: 0.7,
    collisionStrength: 0.6,
    container: null,
    reconnectTimer: null,
    fetchedChannels: {},
    engine: null,
    wallBodies: [],
  };

  var CONFIG = {
    IRC_URL: 'wss://irc-ws.chat.twitch.tv:443',
    MAX_EMOTES_PER_MSG: 8,
    RECONNECT_DELAY: 5000,
    GRAVITY_SCALE: 0.0035,
    RESTITUTION_BASE: 0.4,
    FRICTION: 0.5,
    FRICTION_STATIC: 0.8,
    FRICTION_AIR: 0.006,
    DENSITY_BASE: 0.001,
    WALL_RESTITUTION: 0.4,
    WALL_FRICTION: 0.6,
  };

  function dispatchStatus(msg) {
    window.dispatchEvent(new CustomEvent('emote-rain-status', { detail: msg }));
  }

  function readSettings() {
    try {
      var saved = localStorage.getItem('taa-settings');
      if (saved) {
        var s = JSON.parse(saved);
        state.emoteSize = s.emoteSize || 48;
        state.emoteTTLMin = (s.emoteTTLMin || 5) * 1000;
        state.emoteTTLMax = (s.emoteTTLMax || 10) * 1000;
        state.bounceStrength = s.bounceStrength || 0.7;
        state.collisionStrength = s.collisionStrength || 0.6;
        if (state.emoteTTLMax < state.emoteTTLMin) state.emoteTTLMax = state.emoteTTLMin;
        console.log('[EmoteRain] settings loaded');
      }
    } catch (e) {}
  }

  /* ===== MATTER.JS PHYSICS ===== */
  function initPhysics() {
    if (state.engine) return;
    if (!window.Matter) {
      console.warn('[EmoteRain] Matter.js not loaded');
      return;
    }
    var M = window.Matter;
    state.engine = M.Engine.create({
      gravity: { x: 0, y: 1, scale: CONFIG.GRAVITY_SCALE },
      enableSleeping: true,
    });
    buildWalls();
  }

  function buildWalls() {
    if (!state.engine || !window.Matter) return;
    var M = window.Matter;
    state.wallBodies.forEach(function (b) { M.Composite.remove(state.engine.world, b); });
    state.wallBodies = [];

    var w = window.innerWidth;
    var h = window.innerHeight;
    var thick = 60;
    var opts = {
      isStatic: true,
      restitution: CONFIG.WALL_RESTITUTION,
      friction: CONFIG.WALL_FRICTION,
    };

    var floor = M.Bodies.rectangle(w / 2, h + thick / 2, w + thick * 2, thick, opts);
    var left = M.Bodies.rectangle(-thick / 2, h / 2, thick, h * 2, opts);
    var right = M.Bodies.rectangle(w + thick / 2, h / 2, thick, h * 2, opts);

    state.wallBodies = [floor, left, right];
    M.Composite.add(state.engine.world, state.wallBodies);
  }

  /* ===== 7TV EMOTES ===== */
  var CDN_PROXY = 'https://cdn.rte.net.ru/';

  function load7TVEmotes(data) {
    var emoteSet = data.emote_set || data;
    var emotes = (emoteSet.emotes || []);
    emotes.forEach(function (em) {
      if (em.id && em.data && em.data.host) {
        state.emotes7tv.set(em.name, CDN_PROXY + 'https://cdn.7tv.app/emote/' + em.id + '/4x.webp');
      }
    });
    dispatchStatus('7TV эмоутов загружено: ' + state.emotes7tv.size);
    console.log('[EmoteRain] 7TV loaded ' + state.emotes7tv.size + ' emotes');
  }

  function fetch7TVEmotes(twitchId) {
    if (state.fetchedChannels[twitchId]) return;
    dispatchStatus('Загрузка 7TV эмоутов...');
    var body = JSON.stringify({
      operationName: 'GetUserByConnection',
      variables: { platform: 'TWITCH', id: twitchId },
      query: 'query GetUserByConnection($platform: ConnectionPlatform!, $id: String!) { user: userByConnection(platform: $platform, id: $id) { id emote_sets { id emotes { id name data { host { url } } } } } }',
    });

    return fetch('https://7tv.io/v3/gql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    })
      .then(function (res) {
        console.log('[EmoteRain] 7tv.io/gql response status:', res.status);
        if (!res.ok) {
          return res.text().then(function (t) { throw new Error('HTTP ' + res.status); });
        }
        return res.json();
      })
      .then(function (json) {
        var user = json.data && json.data.user;
        if (!user) throw new Error('no user in response: ' + JSON.stringify(json.errors || json));
        var allEmotes = [];
        (user.emote_sets || []).forEach(function (set) {
          (set.emotes || []).forEach(function (em) { allEmotes.push(em); });
        });
        console.log('[EmoteRain] 7tv.io/gql loaded ' + allEmotes.length + ' emotes from ' + (user.emote_sets || []).length + ' sets');
        state.fetchedChannels[twitchId] = true;
        load7TVEmotes({ emote_set: { emotes: allEmotes } });
      })
      .catch(function (e) {
        console.warn('[EmoteRain] 7tv.io/gql failed: ' + e.message);
        window.dispatchEvent(new CustomEvent('emote-rain-error', { detail: 'Ошибка 7TV: ' + e.message }));
      });
  }

  /* ===== TWITCH IRC ===== */
  function connectIRC() {
    if (state.ws) disconnectIRC();

    var ws = new WebSocket(CONFIG.IRC_URL);
    state.ws = ws;
    var nick = 'justinfan' + Math.floor(Math.random() * 99999);

    dispatchStatus('Подключение к чату Twitch...');

    ws.onopen = function () {
      console.log('[EmoteRain] IRC connected, joining #' + state.channel);
      dispatchStatus('Подключено к Twitch, вход в чат #' + state.channel);
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      ws.send('NICK ' + nick);
      ws.send('JOIN #' + state.channel);
    };

    ws.onmessage = function (event) {
      var lines = event.data.split('\r\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line) continue;
        if (line.indexOf('PING') === 0) {
          var payload = line.match(/:(.+)/);
          ws.send('PONG ' + (payload ? ':' + payload[1] : ':tmi.twitch.tv'));
          continue;
        }
        if (line.indexOf('ROOMSTATE') !== -1) {
          var roomMatch = line.match(/room-id=(\d+)/);
          if (roomMatch) {
            console.log('[EmoteRain] got twitch room-id:', roomMatch[1]);
            fetch7TVEmotes(roomMatch[1]);
          }
        }
        if (line.indexOf('PRIVMSG') !== -1) {
          handleIRCMessage(line);
        }
      }
    };

    ws.onclose = function () {
      console.log('[EmoteRain] IRC disconnected');
      state.ws = null;
      if (state.running) {
        dispatchStatus('Потеряно соединение с Twitch, переподключение...');
        console.log('[EmoteRain] IRC reconnecting in ' + CONFIG.RECONNECT_DELAY + 'ms');
        state.reconnectTimer = setTimeout(function () { connectIRC(); }, CONFIG.RECONNECT_DELAY);
      }
    };

    ws.onerror = function (e) {
      console.warn('[EmoteRain] IRC error:', e);
      window.dispatchEvent(new CustomEvent('emote-rain-error', { detail: 'Ошибка подключения к Twitch IRC' }));
    };
  }

  function disconnectIRC() {
    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
    }
    if (state.ws) {
      try { state.ws.close(); } catch (e) {}
      state.ws = null;
    }
  }

  function handleIRCMessage(line) {
    var roomIdMatch = line.match(/room-id=(\d+)/);
    if (roomIdMatch) fetch7TVEmotes(roomIdMatch[1]);
    var emotesMatch = line.match(/emotes=([^;\s]+)/);
    var msgMatch = line.match(/ PRIVMSG #[^ ]+ :(.+)$/);
    if (!msgMatch) return;
    var message = msgMatch[1];

    if (emotesMatch) {
      var emotesStr = emotesMatch[1];
      if (emotesStr && emotesStr !== '/') {
        var entries = emotesStr.split('/');
        var spawned = 0;
        for (var e = 0; e < entries.length && spawned < CONFIG.MAX_EMOTES_PER_MSG; e++) {
          var parts = entries[e].split(':');
          if (parts.length < 2) continue;
          var emoteId = parts[0];
          var ranges = parts[1].split(',');
          for (var r = 0; r < ranges.length && spawned < CONFIG.MAX_EMOTES_PER_MSG; r++) {
            var pos = ranges[r].split('-').map(Number);
            var name = message.slice(pos[0], pos[1] + 1);
            if (name) {
              spawnEmote(name, 'https://static-cdn.jtvnw.net/emoticons/v2/' + emoteId + '/default/dark/3.0');
              spawned++;
            }
          }
        }
      }
    }

    var words = message.split(/\s+/);
    for (var w = 0; w < words.length; w++) {
      var url = state.emotes7tv.get(words[w]);
      if (url) {
        spawnEmote(words[w], url);
      }
    }
  }

  /* ===== EMOTE SPAWN ===== */
  var spawnCount = 0;

  function spawnEmote(name, url) {
    if (!state.running || !state.engine || !window.Matter) return;
    spawnCount++;

    var img = document.createElement('img');
    img.className = 'emote-rain-particle';
    img.alt = name;
    img.draggable = false;

    var ttl = state.emoteTTLMin + Math.random() * (state.emoteTTLMax - state.emoteTTLMin);

    var particle = {
      el: img,
      born: Date.now(),
      ttl: ttl,
      body: null,
      bodyW: 0,
      bodyH: 0,
    };
    state.particles.push(particle);

    var M = window.Matter;

    function initBody(w, h) {
      var baseSize = state.emoteSize;
      var ar = w / h;
      var bodyW, bodyH;
      if (ar >= 1) {
        bodyW = baseSize;
        bodyH = Math.max(baseSize / ar, baseSize * 0.3);
      } else {
        bodyH = baseSize;
        bodyW = Math.max(baseSize * ar, baseSize * 0.3);
      }

      var maxDim = Math.max(bodyW, bodyH);
      var margin = maxDim;
      var x = margin + Math.random() * (window.innerWidth - margin * 2);
      if (x + bodyW > window.innerWidth) x = window.innerWidth - bodyW - margin;
      if (x < margin) x = margin;

      var restitution = CONFIG.RESTITUTION_BASE * state.bounceStrength;
      var density = CONFIG.DENSITY_BASE * (0.5 + state.collisionStrength);

      var body = M.Bodies.rectangle(x, -bodyH, bodyW, bodyH, {
        restitution: restitution,
        friction: CONFIG.FRICTION,
        frictionStatic: CONFIG.FRICTION_STATIC,
        frictionAir: CONFIG.FRICTION_AIR,
        density: density,
        chamfer: { radius: Math.min(4, bodyW * 0.1, bodyH * 0.1) },
      });

      M.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 2,
        y: Math.random() * 1 + 1.5,
      });

      M.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);
      M.Composite.add(state.engine.world, body);

      particle.body = body;
      particle.bodyW = bodyW;
      particle.bodyH = bodyH;

      img.src = url;
      img.style.width = bodyW + 'px';
      img.style.height = bodyH + 'px';
      state.container.appendChild(img);
    }

    var loaded = false;
    img.onload = function () {
      if (loaded) return;
      loaded = true;
      initBody(img.naturalWidth || state.emoteSize, img.naturalHeight || state.emoteSize);
    };
    img.onerror = function () {
      if (loaded) return;
      loaded = true;
      initBody(state.emoteSize, state.emoteSize);
    };

    if (img.complete && img.naturalWidth > 0) {
      img.onload();
    } else {
      img.src = url;
    }
  }

  /* ===== PHYSICS UPDATE ===== */
  var TICK_MS = 16.667;

  function updateParticles() {
    if (!state.engine || !window.Matter) return;
    var M = window.Matter;
    var now = Date.now();

    M.Engine.update(state.engine, TICK_MS);

    for (var i = state.particles.length - 1; i >= 0; i--) {
      var p = state.particles[i];
      if (!p.body) continue;

      var age = now - p.born;

      if (age > p.ttl) {
        p.el.remove();
        M.Composite.remove(state.engine.world, p.body);
        state.particles.splice(i, 1);
        continue;
      }

      p.el.style.left = (p.body.position.x - p.bodyW / 2) + 'px';
      p.el.style.top = (p.body.position.y - p.bodyH / 2) + 'px';
      p.el.style.transform = 'rotate(' + (p.body.angle * 180 / Math.PI) + 'deg)';

      var fadeStart = p.ttl * 0.7;
      if (age > fadeStart) {
        p.el.style.opacity = 1 - (age - fadeStart) / (p.ttl - fadeStart);
      }
    }
  }

  function animate() {
    if (!state.running) return;
    updateParticles();
    state.animFrame = requestAnimationFrame(animate);
  }

  /* ===== PUBLIC API ===== */
  window.emoteRain = {
    start: function (channel) {
      console.log('[EmoteRain] START requested for channel:', channel);
      if (state.running) this.stop();

      channel = channel.trim().toLowerCase();
      if (!channel) { console.warn('[EmoteRain] empty channel'); return; }

      state.channel = channel;
      readSettings();

      state.container = document.getElementById('emote-rain-container');
      if (!state.container) {
        state.container = document.createElement('div');
        state.container.id = 'emote-rain-container';
        document.body.appendChild(state.container);
      }

      initPhysics();
      buildWalls();

      state.running = true;
      state.fetchedChannels = {};
      spawnCount = 0;
      dispatchStatus('Дождь эмоутов запущен для #' + channel);

      connectIRC();
      state.animFrame = requestAnimationFrame(animate);
    },

    stop: function () {
      console.log('[EmoteRain] STOP');
      state.running = false;
      disconnectIRC();

      if (state.animFrame) {
        cancelAnimationFrame(state.animFrame);
        state.animFrame = null;
      }

      for (var i = 0; i < state.particles.length; i++) {
        state.particles[i].el.remove();
        if (state.engine && window.Matter && state.particles[i].body) {
          window.Matter.Composite.remove(state.engine.world, state.particles[i].body);
        }
      }
      state.particles = [];
      state.emotes7tv.clear();
      state.fetchedChannels = {};
      spawnCount = 0;
      dispatchStatus('Дождь эмоутов остановлен');
    },

    isRunning: function () {
      return state.running;
    },

    updateSettings: function () {
      readSettings();
    },
  };

  window.addEventListener('resize', function () {
    if (state.engine && window.Matter) buildWalls();
  });
})();
