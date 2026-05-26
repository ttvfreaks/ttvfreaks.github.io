// ===== STATE =====
const state = {
  currentMode: 'prep',
  prep: {
    streamer: '',
    opponent: '',
    categories: ['Нейтральные игры', 'Игры стримера #1', 'Игры стримера #2'],
    games: { neutral: [], streamer: [], opponent: [] },
  },
  battle: {
    data: null,
    phase: 'upload',
    queue: [],
    index: -1,
    isTyping: false,
    wins: { streamer: 0, opponent: 0 },
    syncCode: null,
    syncUnsub: null,
    pendingData: null,
  },
};

const DEFAULT_SETTINGS = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 16,
  fontSizeHeading: 26,
  fontSizeGame: 14,
  fontSizeBattle: 64,
  fontSizeScore: 26,
  bgColor: '#0e0e10',
  bgImage: '',
  textColor: '#efeff1',
  accentColor: '#ff0000',
  opponentColor: '#0066ff',
  bgOpacity: 100,
  radiusCard: 8,
  radiusElement: 6,
  customCSS: '/* Ваши кастомные стили */\nbody {\n  background: linear-gradient(135deg, #0e0e10, #1a0808);\n}',
  emoteChannel: '',
  emoteSize: 48,
  emoteTTLMin: 5,
  emoteTTLMax: 10,
  bounceStrength: 0.7,
  collisionStrength: 0.6,
};

const NICKNAME_PLACEHOLDERS = [
  "BORYACREATIVE", "Lekheeey", "OdinPrimeOfficial", "MEGAZHIZHA", "HELP ахаха а почему L перевёрнута",
  "AHAH WW", "469"
]

let settings = {};
let typewriterTimer = null;

// ===== SETTINGS =====
function loadSettings() {
  try {
    const saved = localStorage.getItem('taa-settings');
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (e) { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings() {
  try {
    localStorage.setItem('taa-settings', JSON.stringify(settings));
  } catch (e) {
    alert('Не удалось сохранить настройки. Возможно, превышен лимит localStorage.');
  }
}

function applySettings() {
  const root = document.documentElement;
  root.style.setProperty('--font-family', settings.fontFamily);
  root.style.setProperty('--font-size', settings.fontSize + 'px');
  root.style.setProperty('--font-size-heading', settings.fontSizeHeading + 'px');
  root.style.setProperty('--font-size-game', settings.fontSizeGame + 'px');
  root.style.setProperty('--font-size-battle', settings.fontSizeBattle + 'px');
  root.style.setProperty('--font-size-score', settings.fontSizeScore + 'px');
  root.style.setProperty('--color-opponent', settings.opponentColor);
  root.style.setProperty('--bg-primary', settings.bgColor);
  root.style.setProperty('--text-primary', settings.textColor);
  root.style.setProperty('--accent', settings.accentColor);
  root.style.setProperty('--accent-hover', darkenColor(settings.accentColor, 0.8));
  root.style.setProperty('--accent-dim', settings.accentColor + '26');
  root.style.setProperty('--bg-opacity', (settings.bgOpacity / 100).toString());
  root.style.setProperty('--radius-card', settings.radiusCard + 'px');
  root.style.setProperty('--radius-element', settings.radiusElement + 'px');

  if (settings.bgImage) {
    root.style.setProperty('--bg-image', 'url(' + settings.bgImage + ')');
  } else {
    root.style.setProperty('--bg-image', 'none');
  }

  const customStyle = document.getElementById('custom-css-style');
  if (customStyle) customStyle.remove();
  if (settings.customCSS && settings.customCSS.trim() !== DEFAULT_SETTINGS.customCSS.trim()) {
    const style = document.createElement('style');
    style.id = 'custom-css-style';
    style.textContent = settings.customCSS;
    document.head.appendChild(style);
  }
}

function darkenColor(hex, factor) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.round((num >> 16) * factor);
  const g = Math.round(((num >> 8) & 0xff) * factor);
  const b = Math.round((num & 0xff) * factor);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function populateSettingsUI() {
  document.getElementById('set-font-family').value = settings.fontFamily;
  document.getElementById('set-font-size').value = settings.fontSize;
  document.getElementById('set-font-size-val').textContent = settings.fontSize;
  document.getElementById('set-font-size-heading').value = settings.fontSizeHeading;
  document.getElementById('set-font-size-heading-val').textContent = settings.fontSizeHeading;
  document.getElementById('set-font-size-game').value = settings.fontSizeGame;
  document.getElementById('set-font-size-game-val').textContent = settings.fontSizeGame;
  document.getElementById('set-font-size-battle').value = settings.fontSizeBattle;
  document.getElementById('set-font-size-battle-val').textContent = settings.fontSizeBattle;
  document.getElementById('set-font-size-score').value = settings.fontSizeScore;
  document.getElementById('set-font-size-score-val').textContent = settings.fontSizeScore;
  document.getElementById('set-bg-color').value = settings.bgColor;
  document.getElementById('set-bg-color-hex').textContent = settings.bgColor;
  document.getElementById('set-text-color').value = settings.textColor;
  document.getElementById('set-text-color-hex').textContent = settings.textColor;
  document.getElementById('set-accent-color').value = settings.accentColor;
  document.getElementById('set-accent-color-hex').textContent = settings.accentColor;
  document.getElementById('set-opponent-color').value = settings.opponentColor;
  document.getElementById('set-opponent-color-hex').textContent = settings.opponentColor;
  document.getElementById('set-bg-opacity').value = settings.bgOpacity;
  document.getElementById('set-bg-opacity-val').textContent = settings.bgOpacity;
  document.getElementById('set-radius-card').value = settings.radiusCard;
  document.getElementById('set-radius-card-val').textContent = settings.radiusCard;
  document.getElementById('set-radius-element').value = settings.radiusElement;
  document.getElementById('set-radius-element-val').textContent = settings.radiusElement;
  document.getElementById('set-custom-css').value = settings.customCSS;
  document.getElementById('set-emote-channel').value = settings.emoteChannel || '';
  document.getElementById('set-emote-size').value = settings.emoteSize;
  document.getElementById('set-emote-size-val').textContent = settings.emoteSize;
  document.getElementById('set-emote-ttl-min').value = settings.emoteTTLMin;
  document.getElementById('set-emote-ttl-min-val').textContent = settings.emoteTTLMin;
  document.getElementById('set-emote-ttl-max').value = settings.emoteTTLMax;
  document.getElementById('set-emote-ttl-max-val').textContent = settings.emoteTTLMax;
  document.getElementById('set-bounce-strength').value = Math.round(settings.bounceStrength * 10);
  document.getElementById('set-bounce-strength-val').textContent = settings.bounceStrength;
  document.getElementById('set-collision-strength').value = Math.round(settings.collisionStrength * 10);
  document.getElementById('set-collision-strength-val').textContent = settings.collisionStrength;
  updateDualTTLFIll();

  if (settings.bgImage) {
    document.getElementById('set-bg-image-name').textContent = 'Изображение загружено';
  } else {
    document.getElementById('set-bg-image-name').textContent = 'Файл не выбран';
  }
}

function gatherSettingsFromUI() {
  return {
    fontFamily: document.getElementById('set-font-family').value,
    fontSize: parseInt(document.getElementById('set-font-size').value),
    fontSizeHeading: parseInt(document.getElementById('set-font-size-heading').value),
    fontSizeGame: parseInt(document.getElementById('set-font-size-game').value),
    fontSizeBattle: parseInt(document.getElementById('set-font-size-battle').value),
    fontSizeScore: parseInt(document.getElementById('set-font-size-score').value),
    bgColor: document.getElementById('set-bg-color').value,
    bgImage: settings.bgImage,
    textColor: document.getElementById('set-text-color').value,
    accentColor: document.getElementById('set-accent-color').value,
    opponentColor: document.getElementById('set-opponent-color').value,
    bgOpacity: parseInt(document.getElementById('set-bg-opacity').value),
    radiusCard: parseInt(document.getElementById('set-radius-card').value),
    radiusElement: parseInt(document.getElementById('set-radius-element').value),
    customCSS: document.getElementById('set-custom-css').value,
    emoteChannel: document.getElementById('set-emote-channel').value,
    emoteSize: parseInt(document.getElementById('set-emote-size').value),
    emoteTTLMin: parseInt(document.getElementById('set-emote-ttl-min').value),
    emoteTTLMax: Math.max(parseInt(document.getElementById('set-emote-ttl-min').value), parseInt(document.getElementById('set-emote-ttl-max').value)),
    bounceStrength: parseInt(document.getElementById('set-bounce-strength').value) / 10,
    collisionStrength: parseInt(document.getElementById('set-collision-strength').value) / 10,
  };
}

function setupSettings() {
  // Tabs
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('settings-' + tab.dataset.tab).classList.add('active');
    });
  });

  // Range live values
  document.getElementById('set-font-size').addEventListener('input', function () {
    document.getElementById('set-font-size-val').textContent = this.value;
  });
  document.getElementById('set-font-size-heading').addEventListener('input', function () {
    document.getElementById('set-font-size-heading-val').textContent = this.value;
  });
  document.getElementById('set-font-size-game').addEventListener('input', function () {
    document.getElementById('set-font-size-game-val').textContent = this.value;
  });
  document.getElementById('set-font-size-battle').addEventListener('input', function () {
    document.getElementById('set-font-size-battle-val').textContent = this.value;
  });
  document.getElementById('set-font-size-score').addEventListener('input', function () {
    document.getElementById('set-font-size-score-val').textContent = this.value;
  });
  document.getElementById('set-bg-opacity').addEventListener('input', function () {
    document.getElementById('set-bg-opacity-val').textContent = this.value;
  });
  document.getElementById('set-radius-card').addEventListener('input', function () {
    document.getElementById('set-radius-card-val').textContent = this.value;
  });
  document.getElementById('set-radius-element').addEventListener('input', function () {
    document.getElementById('set-radius-element-val').textContent = this.value;
  });

  // Color hex display
  document.getElementById('set-bg-color').addEventListener('input', function () {
    document.getElementById('set-bg-color-hex').textContent = this.value;
  });
  document.getElementById('set-text-color').addEventListener('input', function () {
    document.getElementById('set-text-color-hex').textContent = this.value;
  });
  document.getElementById('set-accent-color').addEventListener('input', function () {
    document.getElementById('set-accent-color-hex').textContent = this.value;
  });
  document.getElementById('set-opponent-color').addEventListener('input', function () {
    document.getElementById('set-opponent-color-hex').textContent = this.value;
  });

  // Background image
  document.getElementById('set-bg-image-btn').addEventListener('click', function (e) {
    e.stopPropagation();
    document.getElementById('set-bg-image-input').click();
  });
  document.getElementById('set-bg-image-input').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      settings.bgImage = e.target.result;
      applySettings();
      document.getElementById('set-bg-image-name').textContent = file.name;
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('set-bg-image-clear').addEventListener('click', function (e) {
    e.stopPropagation();
    settings.bgImage = '';
    applySettings();
    document.getElementById('set-bg-image-name').textContent = 'Файл не выбран';
    document.getElementById('set-bg-image-input').value = '';
  });

  // Save
  document.getElementById('settings-save').addEventListener('click', function () {
    settings = gatherSettingsFromUI();
    applySettings();
    saveSettings();
    if (window.emoteRain) window.emoteRain.updateSettings();
    const btn = this;
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Сохранено!';
    setTimeout(() => { btn.innerHTML = orig; }, 1500);
  });

  // Emote range live values
  document.getElementById('set-emote-size').addEventListener('input', function () {
    document.getElementById('set-emote-size-val').textContent = this.value;
  });
  document.getElementById('set-emote-ttl-min').addEventListener('input', function () {
    var max = document.getElementById('set-emote-ttl-max');
    if (parseInt(this.value) > parseInt(max.value)) {
      max.value = this.value;
      document.getElementById('set-emote-ttl-max-val').textContent = this.value;
    }
    document.getElementById('set-emote-ttl-min-val').textContent = this.value;
    updateDualTTLFIll();
  });
  document.getElementById('set-emote-ttl-max').addEventListener('input', function () {
    var min = document.getElementById('set-emote-ttl-min');
    if (parseInt(this.value) < parseInt(min.value)) {
      this.value = min.value;
    }
    document.getElementById('set-emote-ttl-max-val').textContent = this.value;
    updateDualTTLFIll();
  });
  document.getElementById('set-bounce-strength').addEventListener('input', function () {
    document.getElementById('set-bounce-strength-val').textContent = (parseInt(this.value) / 10).toFixed(1);
  });
  document.getElementById('set-collision-strength').addEventListener('input', function () {
    document.getElementById('set-collision-strength-val').textContent = (parseInt(this.value) / 10).toFixed(1);
  });

  function updateEmoteNavIcon() {
    var toggle = document.getElementById('nav-emote-toggle');
    if (!toggle) return;
    if (window.emoteRain && window.emoteRain.isRunning()) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
  }

  function showEmoteToast(msg, type) {
    var toast = document.getElementById('emote-toast');
    if (!toast) return;
    var label = '';
    if (type === 'success') label = 'УСПЕХ';
    else if (type === 'warning') label = 'ВНИМАНИЕ';
    else label = 'ОШИБКА';
    toast.className = 'emote-toast show ' + (type || 'error');
    toast.innerHTML = '<span class="toast-label">' + label + '</span><span class="toast-msg">' + escapeHtml(msg) + '</span>';
    clearTimeout(toast._hide);
    toast._hide = setTimeout(function () { toast.classList.remove('show'); }, 4000);
  }

  function startEmoteRain(notifyError) {
    var channel = document.getElementById('set-emote-channel').value.trim();
    if (!channel) {
      switchMode('settings');
      document.querySelectorAll('.settings-tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.settings-pane').forEach(function (p) { p.classList.remove('active'); });
      document.querySelector('.settings-tab[data-tab="emotes"]').classList.add('active');
      document.getElementById('settings-emotes').classList.add('active');
      showEmoteToast('Настройте свой канал, чтобы включить дождь из эмоутов', 'warning');
      return;
    }
    settings = gatherSettingsFromUI();
    applySettings();
    saveSettings();
    if (window.emoteRain) {
      window.emoteRain.updateSettings();
      window.emoteRain.start(channel);
      document.getElementById('emote-rain-status').textContent = 'Активен';
      document.getElementById('emote-rain-status').style.color = 'var(--accent)';
      updateEmoteNavIcon();
    }
  }

  // Emote rain start/stop
  document.getElementById('emote-rain-start').addEventListener('click', function () {
    startEmoteRain();
  });
  document.getElementById('emote-rain-stop').addEventListener('click', function () {
    if (window.emoteRain) {
      window.emoteRain.stop();
      document.getElementById('emote-rain-status').textContent = 'Остановлен';
      document.getElementById('emote-rain-status').style.color = 'var(--text-muted)';
      updateEmoteNavIcon();
    }
  });
  document.getElementById('nav-emote-toggle').addEventListener('click', function () {
    if (window.emoteRain && window.emoteRain.isRunning()) {
      window.emoteRain.stop();
      document.getElementById('emote-rain-status').textContent = 'Остановлен';
      document.getElementById('emote-rain-status').style.color = 'var(--text-muted)';
      updateEmoteNavIcon();
    } else {
      startEmoteRain();
    }
  });

  window.addEventListener('emote-rain-error', function (e) {
    showEmoteToast('' + (e.detail || 'неизвестная ошибка'), 'error');
  });

  window.addEventListener('emote-rain-status', function (e) {
    showEmoteToast('' + (e.detail || ''), 'success');
  });

  // Reset
  document.getElementById('settings-reset').addEventListener('click', function () {
    if (!confirm('Сбросить все настройки до стандартных?')) return;
    settings = { ...DEFAULT_SETTINGS };
    populateSettingsUI();
    applySettings();
    saveSettings();
  });
}

// ===== MODE SWITCHING =====
function setupModeSwitch() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      switchMode(mode);
    });
  });
}

function switchMode(mode) {
  state.currentMode = mode;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.nav-btn[data-mode="' + mode + '"]').classList.add('active');
  document.querySelectorAll('.mode').forEach(m => m.classList.remove('active'));
  document.getElementById('mode-' + mode).classList.add('active');

  if (mode === 'prep') syncPrepUI();
  if (mode === 'battle') updateBattlePhase();
  if (mode === 'faq') markChangelogSeen();
}

function updateBattlePhase() {
  document.querySelectorAll('.battle-phase').forEach(p => p.classList.remove('active'));
  if (state.battle.phase === 'upload') {
    document.getElementById('battle-upload').classList.add('active');
  } else if (state.battle.phase === 'sync') {
    document.getElementById('battle-sync').classList.add('active');
  } else if (state.battle.phase === 'reveal') {
    document.getElementById('battle-reveal').classList.add('active');
  } else if (state.battle.phase === 'overview') {
    document.getElementById('battle-overview').classList.add('active');
  }
}

// ===== PREPARATION =====
function getCategoryTitle(key) {
  if (key === 'neutral') return state.prep.categories[0];
  const name = key === 'streamer' ? state.prep.streamer : state.prep.opponent;
  const fallback = key === 'streamer' ? 'Игры стримера #1' : 'Игры стримера #2';
  return name ? 'Игры ' + name : fallback;
}

function updateCategoryTitles() {
  state.prep.categories[1] = state.prep.streamer ? 'Игры ' + state.prep.streamer : 'Игры стримера #1';
  state.prep.categories[2] = state.prep.opponent ? 'Игры ' + state.prep.opponent : 'Игры стримера #2';
  document.querySelectorAll('.prep-cat-title-static').forEach(function (el) {
    el.textContent = getCategoryTitle(el.dataset.cat);
  });
}

function initPrep() {
  const container = document.getElementById('prep-categories');
  const keys = ['neutral', 'streamer', 'opponent'];
  const opponentColor = getComputedStyle(document.documentElement).getPropertyValue('--color-opponent').trim() || '#0066ff';
  const colors = ['#ffaa00', '#ff0000', opponentColor];

  container.innerHTML = '';
  keys.forEach(function (key, i) {
    const col = document.createElement('div');
    col.className = 'prep-cat';
    col.dataset.cat = key;

    const titleHtml = (i === 0)
      ? '<input class="prep-cat-title" type="text" value="' + state.prep.categories[i] + '">'
      : '<span class="prep-cat-title-static" data-cat="' + key + '">' + getCategoryTitle(key) + '</span>';

    col.innerHTML = [
      '<div class="prep-cat-header">',
      '  <div class="prep-cat-color" style="background:' + colors[i] + '"></div>',
      '  ' + titleHtml,
      '</div>',
      '<div class="prep-cat-games"></div>',
      '<div class="prep-cat-add">',
      '  <input class="prep-cat-input" type="text" placeholder="Название игры" spellcheck="false">',
      '  <button class="btn btn-primary btn-small prep-cat-add-btn">+</button>',
      '</div>',
    ].join('');

    if (i === 0) {
      const titleInput = col.querySelector('.prep-cat-title');
      titleInput.addEventListener('input', function () {
        state.prep.categories[0] = this.value;
      });
    }

    const addInput = col.querySelector('.prep-cat-input');
    const addBtn = col.querySelector('.prep-cat-add-btn');
    const addGame = function () {
      const name = addInput.value.trim();
      if (!name) return;
      state.prep.games[key].push(name);
      addInput.value = '';
      syncPrepCategoryUI(key);
      addInput.focus();
    };
    addBtn.addEventListener('click', addGame);
    addInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addGame();
    });

    container.appendChild(col);
    syncPrepCategoryUI(key);
  });

  // Player names
  document.getElementById('prep-streamer').addEventListener('input', function () {
    state.prep.streamer = this.value;
    updateCategoryTitles();
  });
  document.getElementById('prep-opponent').addEventListener('input', function () {
    state.prep.opponent = this.value;
    updateCategoryTitles();
  });

  // Import
  document.getElementById('prep-import-btn').addEventListener('click', function () {
    document.getElementById('prep-file-input').click();
  });
  document.getElementById('prep-file-input').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!validateConfig(data)) throw new Error('Invalid format');
        loadPrepData(data);
      } catch (err) {
        alert('Ошибка при загрузке JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    this.value = '';
  });

  // Export
  document.getElementById('prep-export-btn').addEventListener('click', exportPrepJSON);
}

function validateConfig(data) {
  return data && typeof data === 'object' &&
    typeof data.streamerName === 'string' &&
    typeof data.opponentName === 'string' &&
    Array.isArray(data.categories) && data.categories.length === 3 &&
    data.games && typeof data.games === 'object' &&
    Array.isArray(data.games.neutral) &&
    Array.isArray(data.games.streamer) &&
    Array.isArray(data.games.opponent);
}

function loadPrepData(data) {
  state.prep.streamer = data.streamerName || '';
  state.prep.opponent = data.opponentName || '';
  state.prep.categories[0] = data.categories[0] || 'Нейтральные игры';
  state.prep.categories[1] = state.prep.streamer ? 'Игры ' + state.prep.streamer : 'Игры стримера #1';
  state.prep.categories[2] = state.prep.opponent ? 'Игры ' + state.prep.opponent : 'Игры стримера #2';
  state.prep.games = {
    neutral: [...(data.games.neutral || [])],
    streamer: [...(data.games.streamer || [])],
    opponent: [...(data.games.opponent || [])],
  };

  document.getElementById('prep-streamer').value = state.prep.streamer;
  document.getElementById('prep-opponent').value = state.prep.opponent;

  const neutralTitle = document.querySelector('.prep-cat-title');
  if (neutralTitle) neutralTitle.value = state.prep.categories[0];
  updateCategoryTitles();

  ['neutral', 'streamer', 'opponent'].forEach(key => syncPrepCategoryUI(key));
}

function syncPrepCategoryUI(key) {
  const col = document.querySelector('.prep-cat[data-cat="' + key + '"]');
  if (!col) return;
  const gamesContainer = col.querySelector('.prep-cat-games');
  const games = state.prep.games[key];

  if (games.length === 0) {
    gamesContainer.innerHTML = '<div class="prep-cat-empty">Пока нет игр</div>';
    return;
  }

  gamesContainer.innerHTML = '';
  games.forEach((name, idx) => {
    const item = document.createElement('div');
    item.className = 'prep-game';
    item.innerHTML = `
      <span class="prep-game-name">${escapeHtml(name)}</span>
      <button class="prep-game-del" data-cat="${key}" data-idx="${idx}">&times;</button>
    `;
    item.querySelector('.prep-game-del').addEventListener('click', function () {
      const cat = this.dataset.cat;
      const index = parseInt(this.dataset.idx);
      state.prep.games[cat].splice(index, 1);
      syncPrepCategoryUI(cat);
    });
    gamesContainer.appendChild(item);
  });
}

function syncPrepUI() {
  document.getElementById('prep-streamer').value = state.prep.streamer;
  document.getElementById('prep-opponent').value = state.prep.opponent;
  document.getElementById('prep-streamer').placeholder = "Например: " + NICKNAME_PLACEHOLDERS[Math.floor(Math.random() * NICKNAME_PLACEHOLDERS.length)];
  document.getElementById('prep-opponent').placeholder = "Например: " + NICKNAME_PLACEHOLDERS[Math.floor(Math.random() * NICKNAME_PLACEHOLDERS.length)];
  document.getElementById('set-emote-channel').placeholder = "Например: " + NICKNAME_PLACEHOLDERS[Math.floor(Math.random() * NICKNAME_PLACEHOLDERS.length)];
  const neutralTitle = document.querySelector('.prep-cat-title');
  if (neutralTitle) neutralTitle.value = state.prep.categories[0];
  updateCategoryTitles();
  ['neutral', 'streamer', 'opponent'].forEach(key => syncPrepCategoryUI(key));
}

function exportPrepJSON() {
  updateCategoryTitles();
  const data = {
    streamerName: state.prep.streamer || 'Стример #1',
    opponentName: state.prep.opponent || 'Стример #2',
    categories: state.prep.categories,
    games: {
      neutral: state.prep.games.neutral,
      streamer: state.prep.games.streamer,
      opponent: state.prep.games.opponent,
    },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'taa_config.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== BATTLE MODE =====
function setupBattle() {
  const dropzone = document.getElementById('battle-dropzone');
  const fileInput = document.getElementById('battle-file-input');
  const revealEl = document.getElementById('battle-reveal');
  const overviewEl = document.getElementById('battle-overview');

  // Drag & drop
  dropzone.addEventListener('dragover', function (e) {
    e.preventDefault();
    this.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', function () {
    this.classList.remove('dragover');
  });
  dropzone.addEventListener('drop', function (e) {
    e.preventDefault();
    this.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) loadBattleFile(file);
  });

  // Click to upload
  dropzone.addEventListener('click', function () {
    fileInput.click();
  });
  fileInput.addEventListener('change', function () {
    if (this.files[0]) loadBattleFile(this.files[0]);
    this.value = '';
  });

  // Reveal click
  revealEl.addEventListener('click', handleRevealClick);

  // Reset buttons
  document.getElementById('battle-reset-reveal').addEventListener('click', function (e) {
    e.stopPropagation();
    resetBattle();
  });
  document.getElementById('battle-reset-overview').addEventListener('click', function () {
    resetBattle();
  });

  // Reveal skip
  document.getElementById('reveal-skip-btn').addEventListener('click', function (e) {
    e.stopPropagation();
    if (state.battle.phase !== 'reveal') return;
    stopTypewriter();
    state.battle.index = state.battle.queue.length;
    showBattleOverview();
  });

  // Sync
  document.getElementById('sync-join-btn').addEventListener('click', handleSyncJoin);
  document.getElementById('sync-start-btn').addEventListener('click', handleSyncStart);
  document.getElementById('sync-refresh-btn').addEventListener('click', function () {
    if (state.battle.syncData) {
      applySyncData(state.battle.syncData);
      if (window._taaRenderMiniLog) window._taaRenderMiniLog(state.battle.syncData);
      var icon = this.querySelector('i');
      icon.className = 'fas fa-check';
      setTimeout(function () { icon.className = 'fas fa-sync'; }, 1500);
    }
  });
  document.getElementById('sync-copy-btn').addEventListener('click', function () {
    var code = document.getElementById('sync-code-big').textContent;
    if (!code) return;
    navigator.clipboard.writeText(code).then(function () {
      var icon = document.querySelector('#sync-copy-btn i');
      if (!icon) return;
      icon.className = 'fas fa-check';
      setTimeout(function () { icon.className = 'fas fa-copy'; }, 1500);
    }).catch(function () {
      var icon = document.querySelector('#sync-copy-btn i');
      if (!icon) return;
      icon.className = 'fas fa-times';
      setTimeout(function () { icon.className = 'fas fa-copy'; }, 1500);
    });
  });
  document.getElementById('sync-code-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleSyncJoin();
  });
  document.getElementById('sync-copy-code-btn').addEventListener('click', function () {
    var code = state.battle.syncCode || document.getElementById('sync-code-big').textContent;
    if (!code) return;
    navigator.clipboard.writeText(code).then(function () {
      var icon = document.querySelector('#sync-copy-code-btn i');
      if (icon) { icon.className = 'fas fa-check'; setTimeout(function () { icon.className = 'fas fa-copy'; }, 1500); }
    }).catch(function () {
      var icon = document.querySelector('#sync-copy-code-btn i');
      if (icon) { icon.className = 'fas fa-times'; setTimeout(function () { icon.className = 'fas fa-copy'; }, 1500); }
    });
  });

  // Copy widget URLs
  function copyWidgetUrl(path, btn) {
    var code = state.battle.syncCode;
    if (!code) return;
    var url = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/') + path + '?room=' + code;
    navigator.clipboard.writeText(url).then(function () {
      var icon = btn.querySelector('i');
      if (icon) { icon.className = 'fas fa-check'; setTimeout(function () { icon.className = 'fas fa-copy'; }, 1500); }
    }).catch(function () {
      var icon = btn.querySelector('i');
      if (icon) { icon.className = 'fas fa-times'; setTimeout(function () { icon.className = 'fas fa-copy'; }, 1500); }
    });
  }
  var scoreBtn = document.getElementById('copy-score-url');
  if (scoreBtn) {
    scoreBtn.addEventListener('click', function () {
      copyWidgetUrl('widget-score.html', this);
    });
  }
  var timerBtn = document.getElementById('copy-timer-url');
  if (timerBtn) {
    timerBtn.addEventListener('click', function () {
      copyWidgetUrl('widget-timer.html', this);
    });
  }
}

function loadBattleFile(file) {
  if (!file.name.endsWith('.json')) {
    alert('Пожалуйста, выберите JSON-файл.');
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!validateConfig(data)) throw new Error('Неверный формат JSON');
      autoCreateRoom(data);
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };
  reader.onerror = function () {
    alert('Ошибка при чтении файла.');
  };
  reader.readAsText(file);
}

function autoCreateRoom(data) {
  if (!window.TAASync) {
    startBattle(data);
    return;
  }
  state.battle.pendingData = data;
  var config = {
    streamerName: data.streamerName,
    opponentName: data.opponentName,
    categories: data.categories,
    games: data.games,
  };
  TAASync.createRoom(config).then(function (code) {
    state.battle.syncCode = code;
    state.battle.syncUnsub = TAASync.joinRoom(code, onSyncUpdate);
    if (window._taaClearMiniLog) window._taaClearMiniLog();
    if (window._taaSubscribeMiniLog) window._taaSubscribeMiniLog();
    document.getElementById('battle-upload').classList.remove('active');
    document.getElementById('sync-code-big').textContent = code;
    document.getElementById('battle-sync').classList.add('active');
  }).catch(function (err) {
    console.warn('[Sync] createRoom failed:', err);
    startBattle(data);
  });
}

function handleSyncJoin() {
  if (!window.TAASync) {
    showJoinStatus('Firebase не подключён', 'error');
    return;
  }
  var code = document.getElementById('sync-code-input').value.trim().toUpperCase();
  if (!code || code.length !== 4) {
    showJoinStatus('Введите 4-символьный код', 'error');
    return;
  }

  showJoinStatus('Подключение...', '');
  var isFirst = true;
  state.battle.syncUnsub = TAASync.joinRoom(code, function (data) {
    if (data && data.error === 'not_found') {
      showJoinStatus('Комната не найдена', 'error');
      return;
    }
    if (data) {
      hideJoinStatus();
      state.battle.syncCode = code;
      document.getElementById('sync-code-big').textContent = code;
      if (window._taaClearMiniLog) window._taaClearMiniLog();
      if (window._taaSubscribeMiniLog) window._taaSubscribeMiniLog();
      if (isFirst) {
        isFirst = false;
        state.battle.data = data.roomConfig;
        state.battle.syncData = data;
        startBattle(data.roomConfig);
      } else {
        onSyncUpdate(data);
      }
    }
  });
}

function handleSyncStart() {
  var data = state.battle.pendingData;
  if (!data) return;
  startBattle(data);
}

function onSyncUpdate(data) {
  if (!data || !data.roomConfig) return;
  state.battle.syncData = data;
  if (state.battle.phase === 'overview') {
    applySyncData(data);
  }
}

function showJoinStatus(msg, type) {
  var el = document.getElementById('sync-join-status');
  el.textContent = msg;
  el.className = 'sync-status' + (type ? ' ' + type : '');
  el.style.display = 'block';
}

function hideJoinStatus() {
  document.getElementById('sync-join-status').style.display = 'none';
}

function startBattle(data) {
  state.battle.data = data;
  state.battle.index = -1;
  state.battle.queue = buildGameQueue(data);
  state.battle.phase = 'reveal';
  state.battle.isTyping = false;
  state.battle.wins = { streamer: 0, opponent: 0 };

  document.getElementById('battle-upload').classList.remove('active');
  document.getElementById('battle-sync').classList.remove('active');
  document.getElementById('battle-reveal').classList.add('active');
  document.getElementById('battle-overview').classList.remove('active');

  document.getElementById('reveal-name').textContent = '';
  document.getElementById('reveal-cat').textContent = '';
  document.getElementById('reveal-counter').textContent = '';
  document.getElementById('reveal-hint').classList.remove('hidden');

  // Set score names for later
  document.getElementById('score-s-name').textContent = data.streamerName || 'Стример #1';
  document.getElementById('score-o-name').textContent = data.opponentName || 'Стример #2';
  updateScoreDisplay();
}

function buildGameQueue(data) {
  const queue = [];
  data.games.neutral.forEach(name => {
    queue.push({ category: data.categories[0], name, catKey: 'neutral' });
  });
  data.games.streamer.forEach(name => {
    queue.push({ category: data.categories[1], name, catKey: 'streamer' });
  });
  data.games.opponent.forEach(name => {
    queue.push({ category: data.categories[2], name, catKey: 'opponent' });
  });
  return queue;
}

function handleRevealClick() {
  if (state.battle.phase !== 'reveal') return;

  if (state.battle.isTyping) {
    stopTypewriter();
    const game = state.battle.queue[state.battle.index];
    if (game) {
      document.getElementById('reveal-name').textContent = game.name;
      document.getElementById('reveal-name').classList.remove('typing');
    }
    state.battle.isTyping = false;
    return;
  }

  state.battle.index++;

  if (state.battle.index >= state.battle.queue.length) {
    showBattleOverview();
    return;
  }

  const game = state.battle.queue[state.battle.index];
  document.getElementById('reveal-cat').textContent = game.category;
  document.getElementById('reveal-counter').textContent =
    (state.battle.index + 1) + ' / ' + state.battle.queue.length;
  document.getElementById('reveal-hint').classList.add('hidden');
  document.getElementById('reveal-name').classList.remove('typing');

  state.battle.isTyping = true;
  typewriteText(document.getElementById('reveal-name'), game.name, 55)
    .then(() => {
      state.battle.isTyping = false;
    });
}

function showBattleOverview() {
  state.battle.phase = 'overview';
  document.getElementById('battle-reveal').classList.remove('active');
  document.getElementById('battle-overview').classList.add('active');

  if (state.battle.syncCode && window.TAASync && !state.battle.syncUnsub) {
    state.battle.syncUnsub = TAASync.joinRoom(state.battle.syncCode, onSyncUpdate);
  }

  const data = state.battle.data;
  const cats = [
    { key: 'streamer', title: data.streamerName || 'Стример #1' },
    { key: 'neutral', title: data.categories[0] || 'Нейтральные' },
    { key: 'opponent', title: data.opponentName || 'Стример #2' },
  ];

  const isSynced = !!(state.battle.syncCode && window.TAASync);

  cats.forEach(({ key, title }) => {
    const col = document.querySelector('.overview-col[data-cat="' + key + '"]');
    const titleEl = col.querySelector('.overview-col-title');
    const gamesEl = col.querySelector('.overview-games');

    titleEl.textContent = title;
    gamesEl.innerHTML = '';

    const gameList = data.games[key] || [];
    if (gameList.length === 0) {
      col.style.display = 'none';
      return;
    }
    col.style.display = 'flex';

    gameList.forEach((name, idx) => {
      const gameKey = key + ':' + idx;
      const card = document.createElement('div');
      card.className = 'overview-game';
      card.dataset.winner = 'none';
      card.dataset.gameKey = gameKey;

      const btnS = document.createElement('button');
      btnS.className = 'game-btn game-btn-s';
      btnS.title = 'Победа ' + data.streamerName;
      btnS.addEventListener('click', function (e) {
        e.stopPropagation();
        const card = this.parentElement;
        const gameKey = card.dataset.gameKey;
        const current = card.dataset.winner;
        const newWinner = current === 'streamer' ? 'none' : 'streamer';
        applyGameWinner(card, newWinner);
        if (isSynced) {
          TAASync.updateGameWinner(state.battle.syncCode, gameKey, newWinner);
        }
        state.battle.wins = recalcWins();
        updateScoreDisplay();
      });

      const nameSpan = document.createElement('span');
      nameSpan.className = 'game-name';
      nameSpan.textContent = name;

      const orderBadge = document.createElement('span');
      orderBadge.className = 'game-order-badge';
      orderBadge.textContent = '';

      const btnO = document.createElement('button');
      btnO.className = 'game-btn game-btn-o';
      btnO.title = 'Победа ' + data.opponentName;
      btnO.addEventListener('click', function (e) {
        e.stopPropagation();
        const card = this.parentElement;
        const gameKey = card.dataset.gameKey;
        const current = card.dataset.winner;
        const newWinner = current === 'opponent' ? 'none' : 'opponent';
        applyGameWinner(card, newWinner);
        if (isSynced) {
          TAASync.updateGameWinner(state.battle.syncCode, gameKey, newWinner);
        }
        state.battle.wins = recalcWins();
        updateScoreDisplay();
      });

      card.appendChild(btnS);
      card.appendChild(nameSpan);
      card.appendChild(orderBadge);
      card.appendChild(btnO);
      gamesEl.appendChild(card);
    });
  });

  if (isSynced && state.battle.syncData) {
    applySyncData(state.battle.syncData);
  }

  document.getElementById('battle-score').classList.remove('hidden');
  updateScoreDisplay();
}

function applyGameWinner(card, winner) {
  card.dataset.winner = 'none';
  card.classList.remove('winner-streamer', 'winner-opponent');
  card.querySelector('.game-btn-s').classList.remove('active');
  card.querySelector('.game-btn-o').classList.remove('active');
  if (winner === 'streamer') {
    card.dataset.winner = 'streamer';
    card.classList.add('winner-streamer');
    card.querySelector('.game-btn-s').classList.add('active');
  } else if (winner === 'opponent') {
    card.dataset.winner = 'opponent';
    card.classList.add('winner-opponent');
    card.querySelector('.game-btn-o').classList.add('active');
  }
}

function recalcWins() {
  var wins = { streamer: 0, opponent: 0 };
  document.querySelectorAll('.overview-game').forEach(function (card) {
    var w = card.dataset.winner;
    if (w === 'streamer') wins.streamer++;
    else if (w === 'opponent') wins.opponent++;
  });
  return wins;
}

function applySyncData(data) {
  if (!data.gameWinners) return;
  var gameOrder = data.gameOrder || {};
  document.querySelectorAll('.overview-game').forEach(function (card) {
    var key = card.dataset.gameKey;
    if (key && data.gameWinners.hasOwnProperty(key)) {
      applyGameWinner(card, data.gameWinners[key]);
    } else {
      applyGameWinner(card, 'none');
    }
    // Apply order badge
    var badge = card.querySelector('.game-order-badge');
    if (badge) {
      var order = gameOrder[key];
      if (order) {
        badge.textContent = order;
        badge.style.display = '';
      } else {
        badge.textContent = '';
        badge.style.display = 'none';
      }
    }
  });
  if (window.TAASync) {
    state.battle.wins = TAASync.calculateWins(data.gameWinners);
  }
  updateScoreDisplay();
  renderMatchHistory(data);
}

function renderMatchHistory(data) {
  var container = document.getElementById('match-history');
  var list = document.getElementById('match-list');
  if (!container || !list) return;
  var gameOrder = data.gameOrder || {};
  var gameWinners = data.gameWinners || {};
  var config = data.roomConfig || {};
  var entries = [];
  for (var key in gameOrder) {
    var order = gameOrder[key];
    var winner = gameWinners[key];
    if (!winner) continue;
    var parts = key.split(':');
    var cat = parts[0];
    var idx = parseInt(parts[1]);
    var gameName = (config.games && config.games[cat] && config.games[cat][idx]) || key;
    var winnerName = winner === 'streamer' ? (config.streamerName || 'Стример #1') : (config.opponentName || 'Стример #2');
    entries.push({ order: order, gameName: gameName, winner: winner, winnerName: winnerName });
  }
  entries.sort(function (a, b) { return a.order - b.order; });
  if (entries.length === 0) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');
  var html = '';
  entries.forEach(function (e) {
    var cls = e.winner === 'streamer' ? 'match-entry-streamer' : 'match-entry-opponent';
    html += '<div class="match-entry ' + cls + '">' +
      '<span class="match-order">#' + e.order + '</span>' +
      '<span class="match-game">' + escapeHtml(e.gameName) + '</span>' +
      '<span class="match-winner">' + escapeHtml(e.winnerName) + '</span>' +
    '</div>';
  });
  list.innerHTML = html;
}

function resetBattle() {
  if (state.battle.syncUnsub) {
    state.battle.syncUnsub();
  }
  state.battle = {
    data: null,
    phase: 'upload',
    queue: [],
    index: -1,
    isTyping: false,
    wins: { streamer: 0, opponent: 0 },
    syncCode: null,
    syncUnsub: null,
    pendingData: null,
  };
  stopTypewriter();

  document.getElementById('battle-upload').classList.add('active');
  document.getElementById('battle-sync').classList.remove('active');
  document.getElementById('battle-reveal').classList.remove('active');
  document.getElementById('battle-overview').classList.remove('active');

  document.getElementById('reveal-name').textContent = '';
  document.getElementById('reveal-cat').textContent = '';
  document.getElementById('reveal-counter').textContent = '';

  document.getElementById('battle-score').classList.add('hidden');

  document.querySelectorAll('.overview-col').forEach(col => { col.style.display = 'flex'; });
}

function updateScoreDisplay() {
  document.getElementById('score-s-num').textContent = state.battle.wins.streamer;
  document.getElementById('score-o-num').textContent = state.battle.wins.opponent;
}

// ===== TYPEWRITER =====
function typewriteText(element, text, speed) {
  return new Promise(resolve => {
    element.textContent = '';
    element.classList.add('typing');
    let i = 0;

    function type() {
      if (i < text.length) {
        element.textContent += text[i];
        i++;
        typewriterTimer = setTimeout(type, speed);
      } else {
        element.classList.remove('typing');
        resolve();
      }
    }

    type();
  });
}

function stopTypewriter() {
  if (typewriterTimer) {
    clearTimeout(typewriterTimer);
    typewriterTimer = null;
  }
}

// ===== CHANGELOG BADGE =====
function checkChangelogBadge() {
  const entries = document.querySelectorAll('.changelog-entry');
  if (!entries.length) return;
  const latestId = entries[0].dataset.id;
  const seen = localStorage.getItem('taa-changelog-seen');
  if (seen !== latestId) {
    document.getElementById('faq-badge').classList.add('show');
  }
}

function markChangelogSeen() {
  const entries = document.querySelectorAll('.changelog-entry');
  if (!entries.length) return;
  const latestId = entries[0].dataset.id;
  localStorage.setItem('taa-changelog-seen', latestId);
  document.getElementById('faq-badge').classList.remove('show');
}

// ===== MINI-GAMES =====
function setupMiniGames() {
   var identitySelect = document.getElementById('mg-identity-select');
   var gamesBtn = document.getElementById('mg-games-btn');
   var wheelBtn = document.getElementById('mg-wheel-btn');
   var timerBtn = document.getElementById('mg-timer-btn');
   if (!identitySelect || !gamesBtn || !wheelBtn || !timerBtn) return;

  function getCurrentIdentity() {
    return identitySelect.value;
  }

  function getNameForIdentity(id) {
    var data = state.battle.data;
    if (!data) return id === 'streamer' ? 'Стример #1' : 'Стример #2';
    return id === 'streamer' ? data.streamerName : data.opponentName;
  }

  function logEvent(type, data) {
    if (!state.battle.syncCode || !window.TAASync) return;
    TAASync.addEventLog(state.battle.syncCode, {
      type: type,
      data: data,
      timestamp: Date.now(),
    });
  }

  function timeAgo(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 30) return 'только что';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ч назад';
    return Math.floor(diff / 86400) + ' дн назад';
  }

  function updateLogTimes() {
    document.querySelectorAll('.log-time[data-ts]').forEach(function (el) {
      var ts = parseInt(el.dataset.ts);
      if (!ts) return;
      el.textContent = timeAgo(ts);
    });
  }
  setInterval(updateLogTimes, 30000);

  // ===== MINI-GAMES POPUP =====
  gamesBtn.addEventListener('click', function () {
    showMiniGamesPopup();
  });

  function showMiniGamesPopup() {
    var existing = document.querySelector('.mg-popup-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.className = 'mg-popup-overlay';
    overlay.innerHTML =
      '<div class="mg-popup">' +
        '<div class="mg-popup-header">' +
          '<h3>Мини-игры</h3>' +
          '<button class="mg-popup-close">&times;</button>' +
        '</div>' +
        '<div class="mg-popup-tabs">' +
          '<button class="btn btn-primary mg-tab active" data-tab="coin">Монетка</button>' +
          '<button class="btn btn-primary mg-tab" data-tab="dice">Кубик</button>' +
          '<button class="btn btn-primary mg-tab" data-tab="rps">КНБ</button>' +
        '</div>' +
        '<div class="mg-popup-body">' +
          '<div class="mg-tab-content active" id="mg-tab-coin">' +
            '<p style="text-align:center;color:var(--text-secondary);margin-bottom:16px;">Нажмите, чтобы бросить монетку</p>' +
            '<button class="btn btn-primary" id="mg-do-coinflip" style="display:block;margin:0 auto;">' +
              '<i class="fas fa-coins"></i> Бросить монетку</button>' +
            '<div id="mg-coin-result" class="mg-coin-container" style="display:none;">' +
              '<div class="mg-coin" id="mg-coin-inner">' +
                '<div class="mg-coin-face front"><span class="coin-icon">🪙</span>ОРЁЛ</div>' +
                '<div class="mg-coin-face back"><span class="coin-icon">🪙</span>РЕШКА</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="mg-tab-content" id="mg-tab-dice">' +
            '<div style="display:flex;gap:12px;align-items:flex-end;justify-content:center;margin-bottom:12px;">' +
              '<label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;color:var(--text-secondary);">' +
                'Стороны:' +
                '<input type="number" id="mg-dice-sides" value="6" min="2" max="1000" style="width:80px;text-align:center;font-size:18px;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);border-radius:4px;padding:4px;">' +
              '</label>' +
              '<button class="btn btn-primary" id="mg-do-diceroll">' +
                '<i class="fas fa-dice"></i> Бросить</button>' +
            '</div>' +
            '<div id="mg-dice-result" class="mg-dice-container" style="display:none;">' +
              '<div class="mg-dice" id="mg-dice-inner">' +
                '<div class="mg-dice-face"><span class="dice-icon">🎲</span><span class="dice-number" id="mg-dice-number">?</span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="mg-tab-content" id="mg-tab-rps">' +
            '<p id="mg-rps-status" style="text-align:center;color:var(--text-secondary);margin-bottom:8px;min-height:1.4em;">Выберите фигуру</p>' +
            '<div id="mg-rps-opponent-choice" style="text-align:center;font-size:13px;color:var(--text-muted);margin-bottom:8px;display:none;"></div>' +
            '<div id="mg-rps-choices" style="display:flex;gap:12px;justify-content:center;">' +
              '<button class="btn btn-primary mg-rps-btn" data-choice="камень" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 16px;min-width:80px;">' +
                '<span style="font-size:32px;">🪨</span> Камень</button>' +
              '<button class="btn btn-primary mg-rps-btn" data-choice="ножницы" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 16px;min-width:80px;">' +
                '<span style="font-size:32px;">✂️</span> Ножницы</button>' +
              '<button class="btn btn-primary mg-rps-btn" data-choice="бумага" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 16px;min-width:80px;">' +
                '<span style="font-size:32px;">📄</span> Бумага</button>' +
            '</div>' +
            '<div id="mg-rps-result" style="text-align:center;margin-top:12px;font-size:20px;font-weight:800;display:none;"></div>' +
            '<div id="mg-rps-countdown" style="text-align:center;margin-top:8px;font-size:14px;color:var(--text-muted);display:none;"></div>' +
            '<button class="btn btn-secondary btn-small" id="mg-rps-newround" style="display:none;margin:10px auto 0;">' +
              '<i class="fas fa-redo"></i> Новый раунд</button>' +
            '<div id="mg-rps-history" style="margin-top:10px;max-height:150px;overflow-y:auto;border-top:1px solid var(--border);padding-top:8px;"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.querySelector('.mg-popup-close').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });

    // Tabs
    overlay.querySelectorAll('.mg-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        overlay.querySelectorAll('.mg-tab').forEach(function (t) { t.classList.remove('active'); });
        overlay.querySelectorAll('.mg-tab-content').forEach(function (c) { c.classList.remove('active'); });
        this.classList.add('active');
        var content = document.getElementById('mg-tab-' + this.dataset.tab);
        if (content) content.classList.add('active');
      });
    });

    // Coin flip with 3D animation
    overlay.querySelector('#mg-do-coinflip').addEventListener('click', function () {
      if (!state.battle.syncCode || !window.TAASync) return;
      var btn = this;
      btn.disabled = true;
      var flipper = getNameForIdentity(getCurrentIdentity());
      var result = Math.random() < 0.5 ? 'орёл' : 'решка';
      TAASync.updateCoinFlip(state.battle.syncCode, { flipper: flipper, result: result });
      logEvent('coinflip', { flipper: flipper, result: result });
      var container = document.getElementById('mg-coin-result');
      var inner = document.getElementById('mg-coin-inner');
      if (container && inner) {
        container.style.display = 'block';
        var angle = 0;
        var interval = setInterval(function () {
          angle += 180;
          inner.style.transform = 'rotateY(' + angle + 'deg)';
        }, 100);
        setTimeout(function () {
          clearInterval(interval);
          var fullSpins = Math.ceil(angle / 360);
          var finalAngle = (result === 'орёл') ? (fullSpins * 360) : (fullSpins * 360 + 180);
          inner.style.transform = 'rotateY(' + finalAngle + 'deg)';
          btn.disabled = false;
        }, 800);
      } else {
        btn.disabled = false;
      }
    });

    // Dice roll with 3D animation
    overlay.querySelector('#mg-do-diceroll').addEventListener('click', function () {
      if (!state.battle.syncCode || !window.TAASync) return;
      var btn = this;
      btn.disabled = true;
      var sides = parseInt(document.getElementById('mg-dice-sides').value) || 6;
      if (sides < 2) sides = 2;
      if (sides > 1000) sides = 1000;
      var roller = getNameForIdentity(getCurrentIdentity());
      var result = Math.floor(Math.random() * sides) + 1;
      TAASync.updateDiceRoll(state.battle.syncCode, { roller: roller, sides: sides, result: result });
      logEvent('diceroll', { roller: roller, sides: sides, result: result });
      var container = document.getElementById('mg-dice-result');
      var inner = document.getElementById('mg-dice-inner');
      var numEl = document.getElementById('mg-dice-number');
      if (container && inner && numEl) {
        container.style.display = 'block';
        var angleX = 0, angleY = 0;
        var interval = setInterval(function () {
          angleX += 45;
          angleY += 60;
          inner.style.transform = 'rotateX(' + angleX + 'deg) rotateY(' + angleY + 'deg) scale(1.1)';
          numEl.textContent = Math.floor(Math.random() * sides) + 1;
        }, 80);
        setTimeout(function () {
          clearInterval(interval);
          inner.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
          numEl.textContent = result;
          btn.disabled = false;
        }, 800);
      } else {
        btn.disabled = false;
      }
    });

    // RPS button handlers
    overlay.querySelectorAll('.mg-rps-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        submitRPSChoice(this.dataset.choice);
      });
    });
    var newRoundBtn = overlay.querySelector('#mg-rps-newround');
    if (newRoundBtn) {
      newRoundBtn.addEventListener('click', function () {
        newRPSRound();
      });
    }

    // RPS — переработанная версия
    var savedRPS = null; // последние данные rps из Firebase
    var rpsResetTimeout = null; // таймаут автосброса после результата
    var rpsCountdownInterval = null; // интервал обратного отсчёта

    // Подписка на RPS живёт постоянно
    function subscribeRPS() {
      if (state.battle._rpsUnsub) state.battle._rpsUnsub();
      if (!state.battle.syncCode || !window.TAASync) return;
      state.battle._rpsUnsub = TAASync.joinRoom(state.battle.syncCode, function (data) {
        if (!data) return;
        savedRPS = data.rps || null;
        renderRPSTab(data);
      });
    }

    // Эмодзи для фигур
    var RPS_EMOJIS = { камень: '🪨', ножницы: '✂️', бумага: '📄' };

    function renderRPSTab(data) {
      var tab = document.getElementById('mg-tab-rps');
      if (!tab || !tab.classList.contains('active')) return;

      var rps = data.rps || {};
      var config = data.roomConfig || {};
      var sName = config.streamerName || 'Стример #1';
      var oName = config.opponentName || 'Стример #2';
      var identity = getCurrentIdentity();
      var myField = identity === 'streamer' ? 'streamerChoice' : 'opponentChoice';
      var oppField = identity === 'streamer' ? 'opponentChoice' : 'streamerChoice';
      var myName = identity === 'streamer' ? sName : oName;
      var oppName = identity === 'streamer' ? oName : sName;
      var myChoice = rps[myField] || null;
      var oppChoice = rps[oppField] || null;
      var result = rps.result || null;

      var statusEl = document.getElementById('mg-rps-status');
      var choicesRow = document.getElementById('mg-rps-choices');
      var resultEl = document.getElementById('mg-rps-result');
      var newRoundEl = document.getElementById('mg-rps-newround');
      var historyEl = document.getElementById('mg-rps-history');

      if (!statusEl || !choicesRow) return;

      // Очищаем предыдущий таймер обратного отсчёта
      if (rpsCountdownInterval) {
        clearInterval(rpsCountdownInterval);
        rpsCountdownInterval = null;
      }
      var countdownEl = document.getElementById('mg-rps-countdown');
      if (countdownEl) {
        countdownEl.style.display = 'none';
        countdownEl.textContent = '';
      }

      // Статус
      if (result) {
        if (result === identity) statusEl.innerHTML = '<strong style="color:var(--accent);font-size:16px;">🏆 Победа!</strong>';
        else if (result === 'draw') statusEl.innerHTML = '<strong style="font-size:16px;">🤝 Ничья!</strong>';
        else statusEl.innerHTML = '<strong style="color:var(--color-opponent);font-size:16px;">💔 Поражение...</strong>';
      } else if (myChoice && oppChoice) {
        statusEl.textContent = 'Оба выбрали. Определяем победителя...';
      } else if (myChoice) {
        statusEl.textContent = 'Вы выбрали ' + myChoice + '. Ожидание ' + oppName + '...';
      } else if (oppChoice) {
        statusEl.innerHTML = oppName + ' уже выбрал фигуру. <strong>Ваш ход!</strong>';
      } else {
        statusEl.textContent = 'Выберите фигуру';
      }

      // Кнопки выбора
      var btns = choicesRow.querySelectorAll('.mg-rps-btn');
      btns.forEach(function (btn) {
        var choice = btn.dataset.choice;
        btn.disabled = !!myChoice || !!result;
        btn.classList.toggle('active', choice === myChoice);
        btn.style.opacity = (myChoice && choice !== myChoice) ? '0.4' : '1';
      });

      // Отображение выбора оппонента: секретно до окончания раунда
      var oppDisplay = document.getElementById('mg-rps-opponent-choice');
      if (oppDisplay) {
        if (result) {
          // После раунда показываем фигуру оппонента
          oppDisplay.textContent = oppName + ': ' + RPS_EMOJIS[oppChoice] + ' ' + oppChoice;
          oppDisplay.style.display = 'block';
        } else {
          // Во время раунда показываем только "?"
          oppDisplay.textContent = oppName + ': ?';
          oppDisplay.style.display = 'block';
        }
      }

      // Результат + Новый раунд
      if (resultEl) {
        if (result) {
          var resultText = '';
          if (result === identity) resultText = '🏆 Победил ' + myName + '!';
          else if (result === 'draw') resultText = '🤝 Ничья!';
          else resultText = '💔 Победил ' + oppName + '!';
          resultEl.textContent = resultText;
          resultEl.style.display = 'block';

          // Автоматически сбрасываем состояние через 5 секунд после показа результата + обратный отсчёт
          if (rpsResetTimeout) clearTimeout(rpsResetTimeout);
          if (rpsCountdownInterval) clearInterval(rpsCountdownInterval);
          var secondsLeft = 5;
          if (countdownEl) {
            countdownEl.style.display = 'block';
            countdownEl.textContent = 'Новый раунд через ' + secondsLeft + '...';
          }
          rpsCountdownInterval = setInterval(function () {
            secondsLeft--;
            if (countdownEl) {
              if (secondsLeft > 0) {
                countdownEl.textContent = 'Новый раунд через ' + secondsLeft + '...';
              } else {
                countdownEl.textContent = '';
                countdownEl.style.display = 'none';
              }
            }
            if (secondsLeft <= 0) {
              clearInterval(rpsCountdownInterval);
              rpsCountdownInterval = null;
            }
          }, 1000);
          rpsResetTimeout = setTimeout(function () {
            if (window.TAASync && state.battle.syncCode) {
              TAASync.resetRPS(state.battle.syncCode);
              savedRPS = null;
            }
          }, 5000);
        } else {
          resultEl.textContent = '';
          resultEl.style.display = 'none';
        }
      }

      if (newRoundEl) {
        newRoundEl.style.display = result ? 'block' : 'none';
      }

      // История
      if (historyEl) {
        var history = rps.history || [];
        if (history.length > 0) {
          var sWins = history.filter(function (e) { return e.winner === 'streamer'; }).length;
          var oWins = history.filter(function (e) { return e.winner === 'opponent'; }).length;
          var draws = history.filter(function (e) { return e.winner === 'draw'; }).length;
          historyEl.innerHTML =
            '<div style="display:flex;gap:16px;font-size:13px;font-weight:700;margin-bottom:8px;padding:6px 10px;background:var(--bg-card);border-radius:6px;">' +
              '<span style="color:var(--accent);">' + escapeHtml(sName) + ': ' + sWins + '</span>' +
              '<span style="color:var(--text-muted);">Ничьи: ' + draws + '</span>' +
              '<span style="color:var(--color-opponent);">' + escapeHtml(oName) + ': ' + oWins + '</span>' +
            '</div>' +
            history.slice(-10).reverse().map(function (entry) {
              var w = '';
              if (entry.winner === 'streamer') w = sName + ' победил';
              else if (entry.winner === 'opponent') w = oName + ' победил';
              else w = 'Ничья';
              var timeStr = entry.timestamp ? formatLocalTime(entry.timestamp) : '';
              return '<div style="font-size:13px;color:var(--text-secondary);padding:3px 8px;border-left:2px solid ' +
                (entry.winner === 'streamer' ? 'var(--accent)' : entry.winner === 'opponent' ? 'var(--color-opponent)' : 'var(--text-muted)') + ';">' +
                '<span style="color:var(--text-muted);font-size:11px;">' + escapeHtml(timeStr) + '</span> — ' +
                escapeHtml(sName) + ' ' + RPS_EMOJIS[entry.streamer] + ' vs ' + RPS_EMOJIS[entry.opponent] + ' ' + escapeHtml(oName) +
                ' — <strong>' + w + '</strong>' +
              '</div>';
            }).join('');
        } else {
          historyEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:8px 0;">Пока нет сыгранных раундов</div>';
        }
      }
    }

    // Запускаем подписку при открытии
    subscribeRPS();
  }

  function submitRPSChoice(choice) {
    if (!state.battle.syncCode || !window.TAASync) return;
    var field = getCurrentIdentity() === 'streamer' ? 'streamerChoice' : 'opponentChoice';
    TAASync.updateRPSChoice(state.battle.syncCode, field, choice);
  }

  function newRPSRound() {
    if (!state.battle.syncCode || !window.TAASync) return;
    TAASync.resetRPS(state.battle.syncCode);
    savedRPS = null;
  }

   // ===== WHEEL MODAL =====
   wheelBtn.addEventListener('click', function () {
     showWheelModal();
   });

   // ===== TIMER MODAL =====
   timerBtn.addEventListener('click', function () {
     showTimerModal();
   });

  function showWheelModal() {
    if (!state.battle.data || !state.battle.syncCode) {
      alert('Загрузите список игр');
      return;
    }
    var games = state.battle.data.games || {};
    var allGames = [];
    var categories = {
      neutral: 'Нейтральные',
      streamer: state.battle.data.streamerName || 'Стример #1',
      opponent: state.battle.data.opponentName || 'Стример #2',
    };
    ['neutral', 'streamer', 'opponent'].forEach(function (key) {
      (games[key] || []).forEach(function (g) { allGames.push({ name: g, cat: key }); });
    });
    if (allGames.length === 0) { alert('Нет игр для колеса'); return; }

    var existing = document.querySelector('.wheel-modal-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.className = 'wheel-modal-overlay';
    overlay.innerHTML =
      '<div class="wheel-modal">' +
        '<div class="wheel-modal-header">' +
          '<h3>Колесо случайной игры</h3>' +
          '<button class="mg-popup-close">&times;</button>' +
        '</div>' +
        '<div class="wheel-modal-body" id="wheel-body">' +
          '<div class="wheel-game-columns" id="wheel-game-list"></div>' +
          '<button class="btn btn-primary wheel-spin-btn" id="wheel-spin-btn">' +
            '<span class="spin-btn"><i class="fas fa-sync-alt"></i> Крутить колесо</span></button>' +
          '<div class="wheel-slot-machine" id="wheel-slot" style="display:none; margin: 0 auto;">' +
            '<div class="wheel-strip" id="wheel-strip"></div>' +
          '</div>' +
          '<div class="wheel-result-display" id="wheel-result-display" style="display:none;"></div>' +
        '</div>' +
        '<div class="wheel-modal-footer" id="wheel-footer" style="display:none;"></div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.querySelector('.mg-popup-close').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });

    // Build game selection list — 3 columns with select-all buttons
    // Order: streamer | neutral (center) | opponent
    var listEl = document.getElementById('wheel-game-list');
    var syncData = state.battle.syncData || {};
    var gameWinners = syncData.gameWinners || {};
    ['streamer', 'neutral', 'opponent'].forEach(function (key) {
      var items = games[key] || [];
      if (items.length === 0) return;
      var col = document.createElement('div');
      col.className = 'wheel-game-column';
      var title = document.createElement('div');
      title.className = 'wheel-game-group-title';
      title.innerHTML = categories[key] +
        '<button class="wheel-select-all" data-cat="' + key + '">все</button>';
      col.appendChild(title);
      items.forEach(function (g, idx) {
        var gameKey = key + ':' + idx;
        var isPlayed = !!gameWinners[gameKey];
        var row = document.createElement('div');
        row.className = 'wheel-game-item' + (isPlayed ? ' played' : '');
        var checked = (!isPlayed && key === 'neutral') ? 'checked' : '';
        var disabled = isPlayed ? 'disabled' : '';
        var inputId = 'wg-' + key + '-' + idx;
        row.innerHTML =
          '<input type="checkbox" id="' + inputId + '" value="' + escapeHtml(g) + '" data-cat="' + key + '" ' + checked + ' ' + disabled + '>' +
          '<label for="' + inputId + '">' + escapeHtml(g) + (isPlayed ? ' <span style="color:var(--text-muted);font-size:11px;">(сыграна)</span>' : '') + '</label>';
        col.appendChild(row);
      });
      listEl.appendChild(col);
    });

    // Select-all / select-none toggle (only affects enabled checkboxes)
    listEl.querySelectorAll('.wheel-select-all').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = this.dataset.cat;
        var cbs = Array.from(listEl.querySelectorAll('input[data-cat="' + cat + '"]:not(:disabled)'));
        if (cbs.length === 0) return;
        var allChecked = cbs.every(function (cb) { return cb.checked; });
        cbs.forEach(function (cb) { cb.checked = !allChecked; });
        this.textContent = allChecked ? 'все' : 'снять';
      });
    });

    // Spin button
    document.getElementById('wheel-spin-btn').addEventListener('click', function () {
      var checked = listEl.querySelectorAll('input[type="checkbox"]:checked');
      if (checked.length === 0) { alert('Выберите хотя бы одну игру'); return; }

      var selectedGames = [];
      checked.forEach(function (cb) { selectedGames.push(cb.value); });

      var roller = getNameForIdentity(getCurrentIdentity());
      var result = TAASync.pickWheelResult(selectedGames);

      // Hide selection, show wheel
      listEl.style.display = 'none';
      document.getElementById('wheel-spin-btn').style.display = 'none';
      document.getElementById('wheel-slot').style.display = 'block';

      // Populate strip
      var strip = document.getElementById('wheel-strip');
      strip.innerHTML = '';
      selectedGames.concat(selectedGames).concat(selectedGames).forEach(function (g) {
        var div = document.createElement('div');
        div.className = 'wheel-strip-item';
        div.textContent = g;
        strip.appendChild(div);
      });

      // Submit to Firebase
      TAASync.updateWheel(state.battle.syncCode, { games: selectedGames, roller: roller, result: null });

      // Animate
      var itemHeight = 60;
      var targetIndex = selectedGames.indexOf(result);
      if (targetIndex === -1) targetIndex = 0;
      var targetOffset = (selectedGames.length + targetIndex) * itemHeight;

      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      strip.offsetHeight;
      strip.style.transition = 'transform 4.7s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      strip.style.transform = 'translateY(-' + targetOffset + 'px)';

      setTimeout(function () {
        document.getElementById('wheel-slot').style.display = 'none';
        var resEl = document.getElementById('wheel-result-display');
        resEl.textContent = result;
        resEl.style.display = 'block';
        var footEl = document.getElementById('wheel-footer');
        footEl.textContent = 'Крутил: ' + escapeHtml(roller);
        footEl.style.display = 'block';

        var sName = state.battle.data && state.battle.data.streamerName || 'Стример #1';
        var oName = state.battle.data && state.battle.data.opponentName || 'Стример #2';
        TAASync.updateWheel(state.battle.syncCode, { games: selectedGames, roller: roller, result: result });
        logEvent('wheel', { roller: roller, result: result, streamerName: sName, opponentName: oName });
      }, 5000);
    });
  }

  // ===== TIMER MODAL =====
  function showTimerModal() {
    if (!state.battle.syncCode) { alert('Подключитесь к комнате'); return; }

    var existing = document.querySelector('.mg-popup-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.className = 'mg-popup-overlay';
    overlay.innerHTML =
      '<div class="mg-popup">' +
        '<div class="mg-popup-header">' +
          '<h3>Таймер</h3>' +
          '<button class="mg-popup-close">&times;</button>' +
        '</div>' +
        '<div class="mg-popup-body mg-timer-body">' +
          '<div class="mg-timer-inputs">' +
            '<label class="mg-timer-label">Минуты' +
              '<input type="number" class="mg-timer-input" id="mg-timer-minutes" value="5" min="0" max="99">' +
            '</label>' +
            '<span class="mg-timer-sep">:</span>' +
            '<label class="mg-timer-label">Секунды' +
              '<input type="number" class="mg-timer-input" id="mg-timer-seconds" value="0" min="0" max="59">' +
            '</label>' +
          '</div>' +
          '<div id="mg-timer-preview" class="mg-timer-preview">05:00</div>' +
          '<div class="mg-timer-actions">' +
            '<button class="btn btn-primary" id="mg-timer-start"><i class="fas fa-play"></i> Запустить</button>' +
            '<button class="btn btn-danger" id="mg-timer-stop"><i class="fas fa-stop"></i> Стоп</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.querySelector('.mg-popup-close').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });

    var minutesInput = document.getElementById('mg-timer-minutes');
    var secondsInput = document.getElementById('mg-timer-seconds');
    var startBtn = document.getElementById('mg-timer-start');
    var stopBtn = document.getElementById('mg-timer-stop');
    var previewEl = document.getElementById('mg-timer-preview');

    function updatePreview() {
      var m = parseInt(minutesInput.value) || 0;
      var s = parseInt(secondsInput.value) || 0;
      previewEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    minutesInput.addEventListener('input', updatePreview);
    secondsInput.addEventListener('input', updatePreview);

    // Check current timer state
    var syncData = state.battle.syncData || {};
    var timerInterval = null;
    var currentTimer = null;

    function clearTimerInterval() {
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      currentTimer = null;
    }

    function startTimerDisplay(timer) {
      currentTimer = timer;
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(function () {
        if (!currentTimer) return;
        var now = Date.now();
        var startedAt = currentTimer.startedAt ? currentTimer.startedAt.toMillis() : now;
        var elapsed = Math.floor((now - startedAt) / 1000);
        var remaining = Math.max(0, currentTimer.duration - elapsed);
        var mins = Math.floor(remaining / 60);
        var secs = remaining % 60;
        previewEl.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        if (remaining === 0) {
          clearTimerInterval();
        }
      }, 200);
    }

    function setTimerUI(timer) {
      if (timer) {
        startBtn.style.display = 'none';
        stopBtn.style.display = '';
        startTimerDisplay(timer);
      } else {
        clearTimerInterval();
        startBtn.style.display = '';
        stopBtn.style.display = 'none';
        updatePreview();
      }
    }

    if (syncData.timer) {
      setTimerUI(syncData.timer);
    } else {
      setTimerUI(null);
    }

    // Subscribe to timer changes while modal is open
    var timerUnsub = TAASync.joinRoom(state.battle.syncCode, function (data) {
      if (!data) return;
      setTimerUI(data.timer || null);
    });

    startBtn.addEventListener('click', function () {
      var m = parseInt(minutesInput.value) || 0;
      var s = parseInt(secondsInput.value) || 0;
      var total = m * 60 + s;
      if (total < 1) { alert('Введите время больше 0'); return; }
      if (total > 3600) { alert('Максимум 60 минут'); return; }

      TAASync.updateTimer(state.battle.syncCode, { duration: total });
      logEvent('timer_start', { starter: getNameForIdentity(getCurrentIdentity()), minutes: m, seconds: s, duration: total });
    });

    stopBtn.addEventListener('click', function () {
      TAASync.updateTimer(state.battle.syncCode, null);
      logEvent('timer_stop', { stopper: getNameForIdentity(getCurrentIdentity()) });
    });

    // Cleanup subscription on close
    overlay.addEventListener('remove', function () {
      if (timerUnsub) { timerUnsub(); timerUnsub = null; }
    });
    var origRemove = overlay.remove.bind(overlay);
    overlay.remove = function () {
      clearTimerInterval();
      if (timerUnsub) timerUnsub();
      origRemove();
    };
  }

  // ===== MINI LOG =====
  var miniLogEl = document.getElementById('mg-mini-log');
  if (miniLogEl) {
    miniLogEl.addEventListener('click', function () {
      showLogModal();
    });
  }

  function renderMiniLog(data) {
    if (!miniLogEl) return;
    var events = data.eventLog || [];
    if (events.length === 0) {
      miniLogEl.innerHTML = '<div class="mg-mini-log-empty">Нет событий</div>';
      return;
    }
    var lastEvents = events.slice(-5).reverse();
    var html = '';
    lastEvents.forEach(function (entry) {
      var icon = '';
      var text = '';
      switch (entry.type) {
        case 'coinflip':
          icon = '🪙';
          text = (entry.data.flipper || '???') + ' — ' + (entry.data.result || '?').toUpperCase();
          break;
        case 'diceroll':
          icon = '🎲';
          text = (entry.data.roller || '???') + ' — ' + (entry.data.result || '?') + ' (d' + (entry.data.sides || '?') + ')';
          break;
        case 'rps':
          icon = '✂️';
          var w = entry.data.winner;
          if (w === 'streamer') text = 'Победил ' + (entry.data.streamerName || 'Стример #1');
          else if (w === 'opponent') text = 'Победил ' + (entry.data.opponentName || 'Стример #2');
          else text = 'Ничья';
          break;
        case 'wheel':
          icon = '🎡';
          text = (entry.data.roller || '???') + ' — ' + (entry.data.result || '?');
          break;
        case 'timer_start':
          icon = '⏱️';
          text = (entry.data.starter || '???') + ' запустил таймер на ' + entry.data.minutes + ':' + String(entry.data.seconds).padStart(2, '0');
          break;
        case 'timer_stop':
          icon = '⏹️';
          text = (entry.data.stopper || '???') + ' остановил таймер';
          break;
        case 'match_played':
          icon = '🎮';
          text = '#' + entry.data.order + ' ' + (entry.data.gameName || '???') + ' — победил ' + (entry.data.winner === 'streamer' ? (entry.data.streamerName || 'Стример #1') : (entry.data.opponentName || 'Стример #2'));
          break;
        default:
          icon = '❓';
          text = JSON.stringify(entry.data).substring(0, 40);
      }
      var ts = entry.timestamp || Date.now();
      var fullTime = formatLocalTime(ts);
      var ago = timeAgo(ts);
      html += '<div class="mg-mini-log-entry" title="' + escapeHtml(fullTime) + '"><span class="log-time" data-ts="' + ts + '">' + ago + '</span> <span class="log-icon">' + icon + '</span><span class="log-text">' + escapeHtml(text) + '</span></div>';
    });
    if (events.length > 5) {
      html += '<div class="mg-mini-log-more">+ ещё ' + (events.length - 5) + ' событий...</div>';
    }
    miniLogEl.innerHTML = html;
    updateLogTimes();
  }

  // Subscribe to eventLog updates for mini log
  var miniLogUnsub = null;
  function subscribeMiniLog() {
    if (miniLogUnsub) miniLogUnsub();
    if (!state.battle.syncCode || !window.TAASync) return;
    miniLogUnsub = TAASync.joinRoom(state.battle.syncCode, function (data) {
      if (!data || !data.roomConfig) return;
      renderMiniLog(data);
    });
  }

  // ===== LOG MODAL =====
  var logUnsub = null;

  function showLogModal() {
    var existing = document.querySelector('.log-modal-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.className = 'log-modal-overlay';
    overlay.innerHTML =
      '<div class="log-modal">' +
        '<div class="log-modal-header">' +
          '<h3>Лог действий</h3>' +
          '<button class="mg-popup-close">&times;</button>' +
        '</div>' +
        '<div class="log-modal-body" id="log-modal-body">' +
          '<div style="text-align:center;color:var(--text-muted);padding:40px 0;">Загрузка...</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var closeBtn = overlay.querySelector('.mg-popup-close');
    closeBtn.addEventListener('click', function () { overlay.remove(); if (logUnsub) logUnsub(); logUnsub = null; });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) { overlay.remove(); if (logUnsub) logUnsub(); logUnsub = null; } });

    // Subscribe to eventLog
    if (state.battle.syncCode) {
      logUnsub = TAASync.joinRoom(state.battle.syncCode, function (data) {
        if (!data || !data.roomConfig) return;
        renderLog(data);
        updateLogTimes();
      });
    }
  }

  function renderLog(data) {
    var body = document.getElementById('log-modal-body');
    if (!body) return;
    var events = data.eventLog || [];
    var config = data.roomConfig || {};
    var sName = config.streamerName || 'Стример #1';
    var oName = config.opponentName || 'Стример #2';

    if (events.length === 0) {
      body.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px 0;">Пока нет действий</div>';
      return;
    }

    var html = '<div class="log-list">';
    // Show newest first
    var sorted = events.slice().reverse();
    sorted.forEach(function (entry) {
      var ts = entry.timestamp || Date.now();
      var ago = timeAgo(ts);
      var fullTime = formatLocalTime(ts);
      var icon = '';
      var text = '';
      var cls = '';

      switch (entry.type) {
        case 'coinflip':
          icon = '🪙';
          text = escapeHtml(entry.data.flipper) + ' бросил монетку — <strong>' + entry.data.result.toUpperCase() + '</strong>';
          break;
        case 'diceroll':
          icon = '🎲';
          text = escapeHtml(entry.data.roller) + ' бросил d' + entry.data.sides + ' — <strong>' + entry.data.result + '</strong>';
          break;
        case 'rps':
          icon = '✂️';
          var winnerText = '';
          if (entry.data.winner === 'streamer') winnerText = 'Победил ' + escapeHtml(entry.data.streamerName);
          else if (entry.data.winner === 'opponent') winnerText = 'Победил ' + escapeHtml(entry.data.opponentName);
          else winnerText = 'Ничья';
          text = 'КНБ: ' + escapeHtml(entry.data.streamerName) + ' (' + entry.data.streamer + ') vs ' +
            escapeHtml(entry.data.opponentName) + ' (' + entry.data.opponent + ') — <strong>' + winnerText + '</strong>';
          cls = entry.data.winner === 'streamer' ? 'log-streamer-win' : (entry.data.winner === 'opponent' ? 'log-opponent-win' : '');
          break;
        case 'wheel':
          icon = '🎡';
          var wheelRoller = entry.data.roller || 'Unknown';
          text = escapeHtml(wheelRoller) + ' крутил колесо — <strong>' + escapeHtml(entry.data.result) + '</strong>';
          break;
        case 'timer_start':
          icon = '⏱️';
          text = escapeHtml(entry.data.starter || '???') + ' запустил таймер на <strong>' + entry.data.minutes + ':' + String(entry.data.seconds).padStart(2, '0') + '</strong>';
          break;
        case 'timer_stop':
          icon = '⏹️';
          text = escapeHtml(entry.data.stopper || '???') + ' остановил таймер';
          break;
        case 'match_played':
          icon = '🎮';
          text = '<strong>#' + entry.data.order + '</strong> ' + escapeHtml(entry.data.gameName || '???') + ' — победил ' + (entry.data.winner === 'streamer' ? escapeHtml(entry.data.streamerName || 'Стример #1') : escapeHtml(entry.data.opponentName || 'Стример #2'));
          cls = entry.data.winner === 'streamer' ? 'log-streamer-win' : (entry.data.winner === 'opponent' ? 'log-opponent-win' : '');
          break;
        default:
          icon = '❓';
          text = JSON.stringify(entry.data);
      }

      html += '<div class="log-entry ' + cls + '">' +
        '<span class="log-time" data-ts="' + ts + '" title="' + escapeHtml(fullTime) + '">' + ago + '</span>' +
        '<span class="log-icon">' + icon + '</span>' +
        '<span class="log-text">' + text + '</span>' +
      '</div>';
    });
    html += '</div>';
    body.innerHTML = html;
  }

  // ===== BAR VISIBILITY =====
  function showMiniGamesBars() {
    var el = document.getElementById('mg-bottom-bar');
    if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
    subscribeMiniLog();
  }

  function hideMiniGamesBars() {
    var el = document.getElementById('mg-bottom-bar');
    if (el) { el.classList.add('hidden'); el.classList.remove('active'); }
  }

  var _origUpdatePhase = window.updateBattlePhase;
  window.updateBattlePhase = function () {
    _origUpdatePhase();
    if (state.battle.phase === 'sync' || state.battle.phase === 'overview') {
      showMiniGamesBars();
    } else {
      hideMiniGamesBars();
    }
  };

  var _origShowOverview = window.showBattleOverview;
  window.showBattleOverview = function () {
    _origShowOverview();
    if (identitySelect && state.battle.data) {
      identitySelect.options[0].text = state.battle.data.streamerName || 'Стример #1';
      identitySelect.options[1].text = state.battle.data.opponentName || 'Стример #2';
    }
  };

  // Export for global access
  window._taaSubscribeMiniLog = subscribeMiniLog;
  window._taaRenderMiniLog = renderMiniLog;
  window._taaClearMiniLog = function () {
    if (miniLogUnsub) { miniLogUnsub(); miniLogUnsub = null; }
    if (miniLogEl) { miniLogEl.innerHTML = '<div class="mg-mini-log-empty">Нет событий</div>'; }
  };

  // Показываем сразу, если уже в правильной фазе
  if (state.battle.phase === 'sync' || state.battle.phase === 'overview') {
    showMiniGamesBars();
  }
}

// ===== HELPERS =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Форматирует UTC-таймстамп в локальное время с указанием часового пояса
function formatLocalTime(timestamp) {
  var d = timestamp ? new Date(timestamp) : new Date();
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var h = pad(d.getHours());
  var m = pad(d.getMinutes());
  var s = pad(d.getSeconds());
  var tz = -d.getTimezoneOffset();
  var tzSign = tz >= 0 ? '+' : '-';
  var tzH = pad(Math.floor(Math.abs(tz) / 60));
  var tzM = pad(Math.abs(tz) % 60);
  return h + ':' + m + ':' + s + ' UTC' + tzSign + tzH + ':' + tzM;
}

function updateDualTTLFIll() {
  var min = document.getElementById('set-emote-ttl-min');
  var max = document.getElementById('set-emote-ttl-max');
  if (!min || !max) return;
  var fill = document.getElementById('dual-ttl-fill');
  if (!fill) return;
  var pMin = ((parseInt(min.value) - parseInt(min.min)) / (parseInt(min.max) - parseInt(min.min))) * 100;
  var pMax = ((parseInt(max.value) - parseInt(max.min)) / (parseInt(max.max) - parseInt(max.min))) * 100;
  fill.style.left = pMin + '%';
  fill.style.width = (pMax - pMin) + '%';
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function () {
  settings = loadSettings();
  applySettings();
  populateSettingsUI();

  initPrep();
  setupSettings();
  setupBattle();
  setupModeSwitch();
  checkChangelogBadge();

  syncPrepUI();
  setupMiniGames();
});
