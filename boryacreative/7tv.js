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
    emoteTTL: 10000,
    container: null,
    reconnectTimer: null,
    proxyUrl: '',
    msgCount: 0,
  };

  var CONFIG = {
    IRC_URL: 'wss://irc-ws.chat.twitch.tv:443',
    GRAVITY: 0.3,
    WALL_BOUNCE: 0.5,
    GROUND_BOUNCE: 0.25,
    FRICTION: 0.985,
    COLLISION_PUSH: 0.4,
    MAX_EMOTES_PER_MSG: 8,
    RECONNECT_DELAY: 5000,
  };

  function readSettings() {
    try {
      var saved = localStorage.getItem('taa-settings');
      if (saved) {
        var s = JSON.parse(saved);
        state.emoteSize = s.emoteSize || 48;
        state.emoteTTL = (s.emoteTTL || 10) * 1000;
        state.proxyUrl = s.emote7tvProxy || '';
        console.log('[EmoteRain] settings loaded: size=' + state.emoteSize + ' ttl=' + state.emoteTTL + ' proxy=' + (state.proxyUrl || 'none'));
      }
    } catch (e) {}
  }

  /* ===== 7TV API (через Cloudflare Worker для обхода CORS) ===== */
  function fetch7TVEmotes(channel) {
    var apiUrl = 'https://api.7tv.io/v3/users/twitch/' + encodeURIComponent(channel);

    var url = state.proxyUrl
      ? state.proxyUrl + '?url=' + encodeURIComponent(apiUrl)
      : apiUrl;

    console.log('[EmoteRain] fetching 7TV emotes from:', url);

    return fetch(url)
      .then(function (res) {
        console.log('[EmoteRain] 7TV API response status:', res.status);
        if (!res.ok) throw new Error('7TV API error ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var emotes = (data.emote_set && data.emote_set.emotes) || [];
        console.log('[EmoteRain] 7TV raw emotes count:', emotes.length);
        state.emotes7tv.clear();
        emotes.forEach(function (em) {
          var hostUrl = em.data && em.data.host && em.data.host.url;
          if (hostUrl) {
            state.emotes7tv.set(em.name, 'https:' + hostUrl + '/' + em.id + '/4x.webp');
          }
        });
        console.log('[EmoteRain] 7TV loaded ' + state.emotes7tv.size + ' emotes. Names:', Array.from(state.emotes7tv.keys()));
      })
      .catch(function (e) {
        console.warn('[EmoteRain] 7TV fetch failed: ' + e.message);
      });
  }

  /* ===== TWITCH IRC ===== */
  function connectIRC() {
    if (state.ws) disconnectIRC();

    var ws = new WebSocket(CONFIG.IRC_URL);
    state.ws = ws;
    var nick = 'justinfan' + Math.floor(Math.random() * 99999);

    ws.onopen = function () {
      console.log('[EmoteRain] IRC connected, joining #' + state.channel);
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
        if (line.indexOf('PRIVMSG') !== -1) {
          handleIRCMessage(line);
        }
      }
    };

    ws.onclose = function () {
      console.log('[EmoteRain] IRC disconnected');
      state.ws = null;
      if (state.running) {
        console.log('[EmoteRain] IRC reconnecting in ' + CONFIG.RECONNECT_DELAY + 'ms');
        state.reconnectTimer = setTimeout(function () { connectIRC(); }, CONFIG.RECONNECT_DELAY);
      }
    };

    ws.onerror = function (e) {
      console.warn('[EmoteRain] IRC error:', e);
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
    var emotesMatch = line.match(/emotes=([^;\s]+)/);
    var msgMatch = line.match(/ PRIVMSG #[^ ]+ :(.+)$/);
    if (!msgMatch) return;
    var message = msgMatch[1];

    if (emotesMatch) {
      var emotesStr = emotesMatch[1];
      if (emotesStr && emotesStr !== '/') {
        var entries = emotesStr.split('/');
        var spawned = 0;
        console.log('[EmoteRain] IRC msg with emotes:', message.replace(/\u200B/g, '').trim());
        for (var e = 0; e < entries.length && spawned < CONFIG.MAX_EMOTES_PER_MSG; e++) {
          var parts = entries[e].split(':');
          if (parts.length < 2) continue;
          var emoteId = parts[0];
          var ranges = parts[1].split(',');
          for (var r = 0; r < ranges.length && spawned < CONFIG.MAX_EMOTES_PER_MSG; r++) {
            var pos = ranges[r].split('-').map(Number);
            var name = message.slice(pos[0], pos[1] + 1);
            if (name) {
              console.log('[EmoteRain] detected twitch emote:', name, '(id=' + emoteId + ')');
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
        console.log('[EmoteRain] detected 7tv emote:', words[w]);
        spawnEmote(words[w], url);
      }
    }
  }

  /* ===== EMOTE RAIN ===== */
  var spawnCount = 0;

  function spawnEmote(name, url) {
    if (!state.running) return;

    spawnCount++;
    console.log('[EmoteRain] spawn #' + spawnCount + ': ' + name);

    var size = state.emoteSize;
    var margin = size;
    var x = margin + Math.random() * (window.innerWidth - margin * 2);

    var img = document.createElement('img');
    img.className = 'emote-rain-particle';
    img.src = url;
    img.alt = name;
    img.draggable = false;
    img.style.width = size + 'px';
    img.style.height = size + 'px';

    state.container.appendChild(img);

    state.particles.push({
      x: x,
      y: -size,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2,
      size: size,
      el: img,
      born: Date.now(),
      rotation: (Math.random() - 0.5) * 0.1,
      ang: 0,
    });
  }

  function updateParticles() {
    var now = Date.now();
    var ttl = state.emoteTTL;
    var gravity = CONFIG.GRAVITY;
    var friction = CONFIG.FRICTION;
    var wallBounce = CONFIG.WALL_BOUNCE;
    var groundBounce = CONFIG.GROUND_BOUNCE;
    var push = CONFIG.COLLISION_PUSH;
    var w = window.innerWidth;
    var h = window.innerHeight;

    for (var i = state.particles.length - 1; i >= 0; i--) {
      var p = state.particles[i];
      var age = now - p.born;

      if (age > ttl) {
        p.el.remove();
        state.particles.splice(i, 1);
        continue;
      }

      p.vy += gravity;
      p.vx *= friction;
      p.ang += p.rotation;

      p.x += p.vx;
      p.y += p.vy;

      var half = p.size / 2;

      if (p.x - half < 0) {
        p.x = half;
        p.vx = -p.vx * wallBounce;
      } else if (p.x + half > w) {
        p.x = w - half;
        p.vx = -p.vx * wallBounce;
      }

      if (p.y + half > h) {
        p.y = h - half;
        p.vy = -p.vy * groundBounce;
        if (Math.abs(p.vy) < 0.5) p.vy = 0;
      }

      for (var j = i + 1; j < state.particles.length; j++) {
        var other = state.particles[j];
        var dx = other.x - p.x;
        var dy = other.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var minDist = (p.size + other.size) / 2;

        if (dist < minDist && dist > 0.01) {
          var overlap = (minDist - dist) / 2;
          var nx = dx / dist;
          var ny = dy / dist;
          p.x -= nx * overlap;
          p.y -= ny * overlap;
          other.x += nx * overlap;
          other.y += ny * overlap;
          p.vx -= nx * push;
          p.vy -= ny * push;
          other.vx += nx * push;
          other.vy += ny * push;
        }
      }

      var fadeStart = ttl * 0.65;
      if (age > fadeStart) {
        p.el.style.opacity = 1 - (age - fadeStart) / (ttl - fadeStart);
      }

      p.el.style.left = (p.x - half) + 'px';
      p.el.style.top = (p.y - half) + 'px';
      p.el.style.transform = 'rotate(' + p.ang + 'rad)';
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

      state.running = true;
      spawnCount = 0;
      console.log('[EmoteRain] animation loop started');

      var self = this;
      fetch7TVEmotes(channel).then(function () {
        console.log('[EmoteRain] 7TV fetch done, connecting IRC...');
        if (state.running) connectIRC();
      });

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

      console.log('[EmoteRain] removing ' + state.particles.length + ' particles');
      for (var i = 0; i < state.particles.length; i++) {
        state.particles[i].el.remove();
      }
      state.particles = [];
      spawnCount = 0;
    },

    isRunning: function () {
      return state.running;
    },

    updateSettings: function () {
      readSettings();
    },
  };
})();
