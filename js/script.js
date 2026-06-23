// Полакофон — marathon page logic

// =============================================================================
// Configuration
// =============================================================================

const SHEET_ID = '1apyQjoJi3rmENWAo5yHD55OMQ8nbxM9VrW13jEIraaU';
const SHEET_GID = 0;
const MEMES_GID = 199348167; // НЕ ТРОГАТЬ
const DIGEST_GID = 1011757384;

// Timezone offset in hours from UTC (e.g., 3 for Moscow UTC+3, -5 for New York UTC-5)
const TIMEZONE_OFFSET = 3;
const MARATHON_START_STR = '2026-06-23T09:22:46'; // start time in the above timezone
const SUBMIT_WORKER_URL = 'https://dawn-fog-df0b.klabisotloveschina.workers.dev/';

// Constructed from offset — change TIMEZONE_OFFSET and MARATHON_START_STR above only
const tzSign = TIMEZONE_OFFSET >= 0 ? '+' : '-';
const tzPadded = String(Math.abs(TIMEZONE_OFFSET)).padStart(2, '0');
const MARATHON_START = new Date(`${MARATHON_START_STR}${tzSign}${tzPadded}:00`);

// =============================================================================
// Google Sheets loader
// =============================================================================

async function loadSheet(sheetID, gid = 0) {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch sheet data');
  }
  return await response.text();
}

function parseCSV(csvText) {
  const rows = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    current += ch;
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === '\n' && !inQuotes) {
      rows.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) rows.push(current.trim());

  if (rows.length < 2) return [];

  const headers = parseCSVRow(rows[0]);

  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const values = parseCSVRow(rows[i]);
    if (values.length === 0) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim().toLowerCase()] = (values[idx] || '').trim();
    });
    data.push(row);
  }
  return data;
}

function parseCSVRow(row) {
  const regex = /,(?=(?:[^"]*"[^"]*")*(?![^"]*"))/;
  const cols = row.split(regex);
  return cols.map(c => c.replace(/^"|"$/g, ''));
}

// =============================================================================
// Activity rendering
// =============================================================================

function renderActivities(data) {
  const ungrouped = document.getElementById('ungrouped-activities');
  const grouped = document.getElementById('grouped-activities');

  ungrouped.innerHTML = '';
  grouped.innerHTML = '';

  const nonEmpty = data.filter(row => row.activity);
  const groups = {};
  const standalone = [];

  nonEmpty.forEach(row => {
    if (!row.group) {
      standalone.push(row);
    } else {
      if (!groups[row.group]) groups[row.group] = [];
      groups[row.group].push(row);
    }
  });

  // Render standalone stickers
  standalone.forEach(row => {
    const sticker = document.createElement('a');
    sticker.className = 'sticker';
    const status = (row.status || '').trim().toLowerCase();

    if (status === 'ок') {
      sticker.classList.add('sticker-done');
    } else if (status) {
      const statusSpan = document.createElement('span');
      statusSpan.className = 'sticker-status sticker-label';
      statusSpan.textContent = row.status.trim();
      sticker.appendChild(statusSpan);
    }

    if (row.vod_url) {
      sticker.href = row.vod_url;
      sticker.target = '_blank';
      const icon = document.createElement('i');
      icon.className = 'fas fa-video';
      sticker.appendChild(icon);
    }

    const nameSpan = document.createElement('span');
    nameSpan.textContent = row.activity;
    sticker.appendChild(nameSpan);

    ungrouped.appendChild(sticker);
  });

  // Render grouped groups
  Object.keys(groups).forEach(groupName => {
    const section = document.createElement('div');
    section.className = 'group';

    const heading = document.createElement('h3');
    heading.textContent = groupName;
    section.appendChild(heading);

    const list = document.createElement('ol');
    groups[groupName].forEach(row => {
      const item = document.createElement('li');
      const status = (row.status || '').trim().toLowerCase();

      const contentWrap = document.createElement('span');
      contentWrap.className = 'activity-content';

      if (status === 'ок') {
        item.classList.add('activity-completed');
      } else if (status) {
        const statusSpan = document.createElement('span');
        statusSpan.className = 'activity-status';
        statusSpan.textContent = row.status.trim();
        contentWrap.appendChild(statusSpan);
      }

      if (row.vod_url) {
        const link = document.createElement('a');
        link.href = row.vod_url;
        link.target = '_blank';
        link.className = 'activity-vod';
        const icon = document.createElement('i');
        icon.className = 'fas fa-video';
        link.appendChild(icon);
        const text = document.createTextNode(' ' + row.activity);
        link.appendChild(text);
        contentWrap.appendChild(link);
      } else {
        const nameSpan = document.createElement('span');
        nameSpan.className = 'activity-name';
        nameSpan.textContent = row.activity;
        contentWrap.appendChild(nameSpan);
      }

      item.appendChild(contentWrap);
      list.appendChild(item);
    });

    section.appendChild(list);
    grouped.appendChild(section);
  });
}

// =============================================================================
// Timer
// =============================================================================

function updateTimer() {
  const now = new Date();
  const diff = now - MARATHON_START;

  if (diff < 0) {
    document.getElementById('timer-display').innerHTML = 'Марафон ещё не начался';
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const display = document.getElementById('timer-display');
  display.innerHTML = `
    <span class="timer-days">${days}</span>
    <span class="timer-days-label">дн</span>
    <div class="timer-hms">
      <span>${String(hours).padStart(2, '0')}</span><span class="unit">ч</span>
      <span>${String(minutes).padStart(2, '0')}</span><span class="unit">мин</span>
      <span>${String(seconds).padStart(2, '0')}</span><span class="unit">сек</span>
    </div>
  `;
}

// =============================================================================
// Stream status (via decapi.me)
// =============================================================================

// НЕ ТРОГАЙ РАДИ ВСЕГО СВЯТОГО
const STREAMER = 'melharucos';
// const STREAMER = 'segall';

let streamUptimeBase = 0;
let streamUptimeFetchedAt = 0;
let streamUptimeTimer = null;

function parseUptimeSeconds(str) {
  let total = 0;
  const h = str.match(/(\d+)\s*hours?/);
  const m = str.match(/(\d+)\s*minutes?/);
  const s = str.match(/(\d+)\s*seconds?/);
  if (h) total += parseInt(h[1]) * 3600;
  if (m) total += parseInt(m[1]) * 60;
  if (s) total += parseInt(s[1]);
  return total;
}

function formatUptime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [];
  if (h) parts.push(`${h}ч`);
  if (m) parts.push(`${m}мин`);
  parts.push(`${s}сек`);
  return parts.join(' ');
}

function updateStreamUptime() {
  const el = document.getElementById('status-uptime');
  if (!streamUptimeBase) { el.textContent = ''; return; }
  const elapsed = Math.floor((Date.now() - streamUptimeFetchedAt) / 1000);
  el.textContent = '· ' + formatUptime(streamUptimeBase + elapsed);
}

async function fetchStreamStatus() {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const titleEl = document.getElementById('status-title');
  const gameEl = document.getElementById('status-game');
  const uptimeEl = document.getElementById('status-uptime');
  try {
    const [liveRes, gameRes, titleRes] = await Promise.all([
      fetch(`https://decapi.me/twitch/uptime/${STREAMER}`),
      fetch(`https://decapi.me/twitch/game/${STREAMER}`),
      fetch(`https://decapi.me/twitch/title/${STREAMER}`),
    ]);
    const uptime = (await liveRes.text()).trim();
    const game = (await gameRes.text()).trim();
    const title = (await titleRes.text()).trim();

    const isOffline = !uptime || /offline|not live|is not/i.test(uptime);
    if (isOffline) {
      dot.className = 'status-dot';
      text.textContent = 'offline';
      titleEl.textContent = title || '';
      gameEl.textContent = game || '';
      uptimeEl.textContent = '';
      streamUptimeBase = 0;
      if (streamUptimeTimer) clearInterval(streamUptimeTimer);
    } else {
      dot.className = 'status-dot live';
      text.textContent = 'online';
      titleEl.textContent = title || '';
      gameEl.textContent = game || '';
      streamUptimeBase = parseUptimeSeconds(uptime);
      streamUptimeFetchedAt = Date.now();
      updateStreamUptime();
      if (streamUptimeTimer) clearInterval(streamUptimeTimer);
      streamUptimeTimer = setInterval(updateStreamUptime, 1000);
    }
  } catch {
    dot.className = 'status-dot';
    text.textContent = '—';
    titleEl.textContent = '';
    gameEl.textContent = '';
    uptimeEl.textContent = '';
  }
}

// =============================================================================
// Memes
// =============================================================================

function getMemeColumnCount() {
  const w = window.innerWidth;
  if (w < 500) return 2;
  if (w < 768) return 3;
  return 4;
}

async function renderMemes(data) {
  const list = document.getElementById('memes-list');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  list.innerHTML = '';

  const rotations = [0.5, -0.5, 1, -1, 0.3, -0.8, 1.2, -1.2];

  function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.classList.add('visible');
  }

  function closeLightbox() {
    lightbox.classList.remove('visible');
    lightboxImg.src = '';
  }

  lightbox.addEventListener('click', closeLightbox);
  document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
  });

  const cols = getMemeColumnCount();
  const columns = [];

  const entries = await Promise.all(data.map(row => {
    return new Promise(resolve => {
      const vals = Object.values(row);
      const url = (vals[0] || '').trim();
      if (!url) { resolve(null); return; }
      const img = new Image();
      img.onload = () => resolve({ url, aspect: img.naturalWidth / img.naturalHeight });
      img.onerror = () => resolve({ url, aspect: 1 });
      img.src = url;
    });
  }));

  const filtered = entries.filter(Boolean);

  if (filtered.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'memes-placeholder';
    msg.textContent = 'скоро тут что-то будет!';
    list.appendChild(msg);
    return;
  }

  for (let i = 0; i < cols; i++) {
    const col = document.createElement('div');
    col.className = 'memes-column';
    columns.push(col);
    list.appendChild(col);
  }

  // Force layout, then measure column width
  void list.offsetWidth;
  const gapPx = 0.8 * parseFloat(getComputedStyle(document.documentElement).fontSize) || 12.8;
  const columnWidth = columns[0].offsetWidth || (list.offsetWidth - gapPx * (cols - 1)) / cols;

  // Distribute to the shortest column
  const columnHeights = new Array(cols).fill(0);

  filtered.forEach(({ url, aspect }, idx) => {
    const renderedH = columnWidth / aspect;
    const colIdx = columnHeights.indexOf(Math.min(...columnHeights));
    columnHeights[colIdx] += renderedH;

    const link = document.createElement('a');
    link.href = '#';
    link.className = 'meme-link';
    link.style.setProperty('--r', `${rotations[idx % rotations.length]}deg`);
    link.addEventListener('click', e => {
      e.preventDefault();
      openLightbox(url);
    });

    const img = document.createElement('img');
    img.className = 'meme-img';
    img.loading = 'lazy';
    img.src = url;
    link.appendChild(img);

    columns[colIdx].appendChild(link);
  });
}

// =============================================================================
// Submit meme button
// =============================================================================

function initSubmitButton() {
  const btn = document.createElement('button');
  btn.className = 'submit-btn';
  btn.textContent = 'предложить...';
  btn.setAttribute('aria-label', 'Предложить идею');
  document.body.appendChild(btn);

  const overlay = document.createElement('div');
  overlay.className = 'submit-overlay';
  overlay.id = 'submit-overlay';
  document.body.appendChild(overlay);

  const popover = document.createElement('div');
  popover.className = 'submit-popover';
  popover.id = 'submit-popover';
  popover.innerHTML = `
    <button type="button" class="submit-close" id="submit-close">&times;</button>
    <h2>предложить идею</h2>
    <label for="submit-nick">ваш ник</label>
    <input type="text" id="submit-nick" placeholder="необязательно..." autocomplete="off">
    <label for="submit-text">текст</label>
    <textarea id="submit-text" placeholder="предложение, пожелание, дополнение, ссылка на мем

я не смогу в соло обновлять сайт, поэтому будет классно если кто-то будет скидывать сюда важную инфу
    
спасибо!"></textarea>
    <div class="submit-action">
      <span class="submit-feedback" id="submit-feedback"></span>
      <button class="submit-send" id="submit-send">Отправить</button>
    </div>
  `;
  overlay.appendChild(popover);

  let closeTimer = null;
  const closeBtn = document.getElementById('submit-close');
  const sendBtn = document.getElementById('submit-send');
  const nickInput = document.getElementById('submit-nick');
  const textInput = document.getElementById('submit-text');
  const feedbackEl = document.getElementById('submit-feedback');

  function openForm() {
    overlay.classList.add('visible');
    nickInput.focus();
  }

  function closeForm() {
    if (closeTimer) clearTimeout(closeTimer);
    overlay.classList.remove('visible');
    feedbackEl.className = 'submit-feedback';
    feedbackEl.textContent = '';
    sendBtn.disabled = false;
    sendBtn.textContent = 'Отправить';
  }

  btn.addEventListener('click', () => {
    if (overlay.classList.contains('visible')) {
      closeForm();
    } else {
      openForm();
    }
  });

  closeBtn.addEventListener('click', closeForm);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeForm();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeForm();
  });

  sendBtn.addEventListener('click', async () => {
    const nick = nickInput.value.trim();
    const text = textInput.value.trim();

    if (!text) {
      feedbackEl.className = 'submit-feedback error';
      feedbackEl.textContent = 'Напиши что-нибудь';
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'отправляется...';
    feedbackEl.className = 'submit-feedback';
    feedbackEl.textContent = '';

    try {
      const res = await fetch(SUBMIT_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick, text }),
      });
      if (res.ok) {
        feedbackEl.className = 'submit-feedback success';
        feedbackEl.textContent = 'Отправлено, спасибо ♥';
        nickInput.value = '';
        textInput.value = '';
        closeTimer = setTimeout(closeForm, 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        feedbackEl.className = 'submit-feedback error';
        feedbackEl.textContent = data.error || 'Что-то пошло не так. Попробуй ещё раз.';
        sendBtn.disabled = false;
        sendBtn.textContent = 'Отправить';
      }
    } catch {
      feedbackEl.className = 'submit-feedback error';
      feedbackEl.textContent = 'Что-то пошло не так. Попробуй ещё раз.';
      sendBtn.disabled = false;
      sendBtn.textContent = 'Отправить';
    }
  });
}

// =============================================================================
// Digest
// =============================================================================

function parseDigestCSV(csvText) {
  const rows = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    current += ch;
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === '\n' && !inQuotes) {
      rows.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) rows.push(current.trim());

  if (rows.length === 0) return [];

  const first = rows[0].toLowerCase();
  const hasHeaders = /^(timestamp|time|час)/i.test(first);
  const startIdx = hasHeaders ? 1 : 0;

  const data = [];
  for (let i = startIdx; i < rows.length; i++) {
    const cols = parseCSVRow(rows[i]);
    if (cols.length < 2) continue;
    data.push({
      time: (cols[0] || '').trim(),
      fullText: (cols[1] || '').trim(),
      bullets: (cols[2] || '').trim(),
    });
  }
  return data;
}

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDigestDate(timestamp) {
  const m = timestamp.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return '';
  return `${parseInt(m[3], 10)} ${MONTHS_RU[parseInt(m[2], 10) - 1]}`;
}

function formatDigestRange(timestamp) {
  const m = timestamp.match(/_(\d{2})(\d{2})-(\d{2})(\d{2})/);
  if (!m) return timestamp;
  return `${m[1]}:${m[2]}–${m[3]}:${m[4]}`;
}

function formatDigestShort(timestamp) {
  const m = timestamp.match(/_(\d{2})\d{2}/);
  return m ? `${m[1]}ч` : timestamp;
}

let digestData = [];

function getReadDigests() {
  try {
    return JSON.parse(localStorage.getItem('polakofon_digest_read') || '[]');
  } catch {
    return [];
  }
}

function markDigestRead(timestamp) {
  const read = getReadDigests();
  if (!read.includes(timestamp)) {
    read.push(timestamp);
    localStorage.setItem('polakofon_digest_read', JSON.stringify(read));
  }
}

function renderDigest(data) {
  digestData = data;
  const container = document.getElementById('digest-timeline');
  container.innerHTML = '';

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="memes-placeholder">дайджест скоро появится!</div>';
    return;
  }

  const lastIdx = data.length - 1;
  const readTimestamps = getReadDigests();
  markDigestRead(data[lastIdx].time);

  // Header: hours timeline
  const header = document.createElement('div');
  header.className = 'digest-header';
  header.innerHTML = `
    <div class="digest-hours" id="digest-hours">
      ${data.map((entry, i) => {
        const isUnread = i !== lastIdx && !readTimestamps.includes(entry.time);
        return `
          <button class="digest-hour${i === lastIdx ? ' active' : ''}${isUnread ? ' digest-hour-unread' : ''}" data-index="${i}">
            <span class="digest-hour-date">${formatDigestDate(entry.time)}</span>
            <span class="digest-hour-time">${i === lastIdx ? formatDigestRange(entry.time) : formatDigestShort(entry.time)}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
  container.appendChild(header);

  // Carousel wrap with arrows
  const wrap = document.createElement('div');
  wrap.className = 'digest-carousel-wrap';
  wrap.innerHTML = `
    <button class="digest-arrow digest-arrow-prev" id="digest-arrow-prev">‹</button>
    <button class="digest-arrow digest-arrow-next" id="digest-arrow-next"${lastIdx === 0 ? ' disabled' : ''}>›</button>
    <div class="digest-carousel" id="digest-carousel">
      ${data.map((entry, i) => {
        const bullets = entry.bullets ? entry.bullets.split('; ').filter(Boolean) : [];
        const date = formatDigestDate(entry.time);
        const range = formatDigestRange(entry.time);
        return `
          <div class="digest-card${i === lastIdx ? ' active' : ''}" data-index="${i}">
            <div class="digest-card-header">
              <span class="digest-card-date">${date}</span>
              <span class="digest-card-time">${range}</span>
            </div>
            ${bullets.length ? `<div class="digest-bullets-wrap"><ul class="digest-bullets">${bullets.map(b => `<li>${b}</li>`).join('')}</ul></div>` : ''}
            <p class="digest-text">${entry.fullText}</p>
          </div>
        `;
      }).join('')}
    </div>
  `;
  container.appendChild(wrap);

  // Force initial snap to last card
  requestAnimationFrame(() => {
    const carousel = document.getElementById('digest-carousel');
    const cards = carousel.querySelectorAll('.digest-card');
    const lastCard = cards[cards.length - 1];
    if (lastCard) lastCard.scrollIntoView({ behavior: 'instant', inline: 'center' });
  });

  initDigestNavigation();
}

function initDigestNavigation() {
  const carousel = document.getElementById('digest-carousel');
  const prevBtn = document.getElementById('digest-arrow-prev');
  const nextBtn = document.getElementById('digest-arrow-next');
  const hoursEl = document.getElementById('digest-hours');

  // Debounced scroll handler
  let scrollTimer;
  carousel.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => updateActiveDigestFromScroll(carousel), 150);
  }, { passive: true });

  // Arrow clicks
  prevBtn.addEventListener('click', () => navigateDigest(-1));
  nextBtn.addEventListener('click', () => navigateDigest(1));

  // Drag-to-scroll for hours strip
  let isDown = false;
  let startX;
  let scrollLeft;
  let didDrag = false;

  function onPointerDown(e) {
    if (e.pointerType !== 'mouse') return;
    isDown = true;
    startX = e.pageX - hoursEl.offsetLeft;
    scrollLeft = hoursEl.scrollLeft;
    didDrag = false;
    hoursEl.classList.add('grabbing');
  }

  function onPointerMove(e) {
    if (!isDown || e.pointerType !== 'mouse') return;
    const x = e.pageX - hoursEl.offsetLeft;
    const walk = (x - startX) * 1.5;
    hoursEl.scrollLeft = scrollLeft - walk;
    if (Math.abs(walk) > 3) didDrag = true;
  }

  function onPointerUp(e) {
    if (!isDown) return;
    if (e.pointerType && e.pointerType !== 'mouse') return;
    isDown = false;
    hoursEl.classList.remove('grabbing');
  }

  hoursEl.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);

  // Timeline clicks (skip if was a drag)
  hoursEl.addEventListener('click', (e) => {
    if (didDrag) return;
    const btn = e.target.closest('.digest-hour');
    if (btn) goToDigest(parseInt(btn.dataset.index), carousel);
  });

  // Keyboard navigation when digest section is visible
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const digestSection = document.querySelector('.tab-section[data-tab="digest"]');
    if (!digestSection) return;
    const isDesktop = window.innerWidth >= 768;
    if (!isDesktop && !digestSection.classList.contains('active')) return;
    if (!document.querySelector('.digest-card')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    navigateDigest(e.key === 'ArrowLeft' ? -1 : 1);
  });
}

function navigateDigest(delta) {
  const active = document.querySelector('.digest-card.active');
  if (!active) return;
  const cards = document.querySelectorAll('.digest-card');
  const next = Math.max(0, Math.min(cards.length - 1, parseInt(active.dataset.index) + delta));
  goToDigest(next, document.getElementById('digest-carousel'));
}

function goToDigest(index, carousel) {
  carousel = carousel || document.getElementById('digest-carousel');
  const cards = carousel.querySelectorAll('.digest-card');
  if (index < 0 || index >= cards.length) return;
  setActiveDigest(index, carousel);
  cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

function updateActiveDigestFromScroll(carousel) {
  const cards = carousel.querySelectorAll('.digest-card');
  if (!cards.length) return;
  const center = carousel.scrollLeft + carousel.clientWidth / 2;
  let closest = 0;
  let closestDist = Infinity;
  cards.forEach((card, i) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const dist = Math.abs(cardCenter - center);
    if (dist < closestDist) { closestDist = dist; closest = i; }
  });
  setActiveDigest(closest, carousel);
}

function setActiveDigest(index, carousel) {
  const cards = carousel.querySelectorAll('.digest-card');
  const hours = document.querySelectorAll('.digest-hour');
  const prevBtn = document.getElementById('digest-arrow-prev');
  const nextBtn = document.getElementById('digest-arrow-next');

  cards.forEach((c, i) => {
    c.classList.toggle('active', i === index);
  });
  hours.forEach((h, i) => {
    const entry = digestData[i];
    h.classList.toggle('active', i === index);
    const timeSpan = h.querySelector('.digest-hour-time');
    const dateSpan = h.querySelector('.digest-hour-date');
    if (timeSpan) {
      timeSpan.textContent = i === index ? formatDigestRange(entry.time) : formatDigestShort(entry.time);
    }
    if (dateSpan) {
      dateSpan.textContent = formatDigestDate(entry.time);
    }
  });

  const entry = digestData[index];
  if (entry) {
    markDigestRead(entry.time);
    hours[index].classList.remove('digest-hour-unread');
  }

  const hoursScroll = document.getElementById('digest-hours');
  if (hoursScroll && hours[index]) {
    hours[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === cards.length - 1;
}

// =============================================================================
// Tab switching
// =============================================================================

function initTabs() {
  const btns = document.querySelectorAll('.tab-btn');
  const sections = document.querySelectorAll('.tab-section');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sections.forEach(s => s.classList.toggle('active', s.dataset.tab === tab));
    });
  });
}

// =============================================================================
// Init
// =============================================================================

async function init() {
  let notes = [];
  const loadingEl = document.getElementById('loading');

  // Hide loading after 3s max regardless of load status
  const forceHide = setTimeout(() => {
    loadingEl.classList.add('hidden');
  }, 3000);

  try {
    const csv = await loadSheet(SHEET_ID, SHEET_GID);
    const data = parseCSV(csv);
    renderActivities(data);
  } catch (err) {
    console.error('Failed to load activities:', err);
    document.getElementById('ungrouped-activities').innerHTML =
      '<p style="opacity:0.6">Не удалось загрузить активности.</p>';
    notes.push('активности не загрузились');
  }

  try {
    const memesCsv = await loadSheet(SHEET_ID, MEMES_GID);
    const memesData = parseCSV(memesCsv);
    await renderMemes(memesData);
  } catch (err) {
    console.error('Failed to load memes:', err);
    notes.push('мемы не загрузились');
  }

  try {
    const digestCsv = await loadSheet(SHEET_ID, DIGEST_GID);
    const digestData = parseDigestCSV(digestCsv);
    renderDigest(digestData);
  } catch (err) {
    console.error('Failed to load digest:', err);
    notes.push('дайджест не загрузился');
  }

  updateTimer();
  setInterval(updateTimer, 1000);

  fetchStreamStatus();
  setInterval(fetchStreamStatus, 60000);
  initSubmitButton();
  initTabs();

  clearTimeout(forceHide);
  loadingEl.classList.add('hidden');

  if (notes.length) {
    document.getElementById('load-notes').textContent = '⚠ ' + notes.join(', ');
  }
}

document.addEventListener('DOMContentLoaded', init);
