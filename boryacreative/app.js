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
    { key: 'streamer', title: data.categories[1] || 'Стример #1' },
    { key: 'neutral', title: data.categories[0] || 'Нейтральные' },
    { key: 'opponent', title: data.categories[2] || 'Стример #2' },
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
        if (isSynced) {
          TAASync.updateGameWinner(state.battle.syncCode, gameKey, newWinner);
        } else {
          applyGameWinner(card, newWinner);
          state.battle.wins = recalcWins();
          updateScoreDisplay();
        }
      });

      const nameSpan = document.createElement('span');
      nameSpan.className = 'game-name';
      nameSpan.textContent = name;

      const btnO = document.createElement('button');
      btnO.className = 'game-btn game-btn-o';
      btnO.title = 'Победа ' + data.opponentName;
      btnO.addEventListener('click', function (e) {
        e.stopPropagation();
        const card = this.parentElement;
        const gameKey = card.dataset.gameKey;
        const current = card.dataset.winner;
        const newWinner = current === 'opponent' ? 'none' : 'opponent';
        if (isSynced) {
          TAASync.updateGameWinner(state.battle.syncCode, gameKey, newWinner);
        } else {
          applyGameWinner(card, newWinner);
          state.battle.wins = recalcWins();
          updateScoreDisplay();
        }
      });

      card.appendChild(btnS);
      card.appendChild(nameSpan);
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
  document.querySelectorAll('.overview-game').forEach(function (card) {
    var key = card.dataset.gameKey;
    if (key && data.gameWinners.hasOwnProperty(key)) {
      applyGameWinner(card, data.gameWinners[key]);
    }
  });
  if (window.TAASync) {
    state.battle.wins = TAASync.calculateWins(data.gameWinners);
  }
  updateScoreDisplay();
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

// ===== HELPERS =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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
});
