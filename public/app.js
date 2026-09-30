/* Nhật Ký Riêng — app.js */
'use strict';

// ============ Tiện ích ============
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = (n) => String(n).padStart(2, '0');
const localISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dayKey = (iso) => (iso || '').slice(0, 10);
const parseDate = (iso) => new Date((iso || '').length === 10 ? iso + 'T12:00' : iso);
const lun = (iso) => AmLich.info(iso);
const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const fmtDate = (iso) => { const d = parseDate(iso); return `${WD[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };
const fmtTime = (iso) => (iso || '').slice(11, 16);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const TYPES = {
  nhatky: { icon: '📔', name: 'Nhật ký' },
  baihoc: { icon: '💡', name: 'Bài học' },
  ghichu: { icon: '📝', name: 'Ghi chú' },
  link: { icon: '🔗', name: 'Link hay' },
  diadiem: { icon: '📍', name: 'Địa điểm' },
  ytuong: { icon: '✨', name: 'Ý tưởng' },
  muctieu: { icon: '🎯', name: 'Mục tiêu' },
};
const MOODS = ['', '😞', '😕', '😐', '🙂', '😄'];
const MOOD_NAMES = ['', 'Tệ', 'Không vui', 'Bình thường', 'Vui', 'Rất vui'];
const TEMPLATES = {
  baihoc: '**Chuyện gì đã xảy ra?**\n\n\n**Mình học được gì?**\n\n\n**Lần sau mình sẽ…**\n',
  nhatky: '**Hôm nay thế nào?**\n\n\n**Điều mình biết ơn:**\n- \n\n**Ngày mai muốn làm:**\n- ',
  muctieu: '**Mục tiêu:**\n\n**Vì sao quan trọng:**\n\n**Các bước:**\n- [ ] \n- [ ] \n\n**Hạn:** ',
  diadiem: '**Ở đâu, với ai:**\n\n**Ấn tượng:**\n\n**Có quay lại không?** ',
};

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), ms);
}

// Markdown tối giản (an toàn: escape trước)
function md(src = '') {
  const inline = (s) =>
    s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
      .replace(/\[ \]/g, '☐').replace(/\[x\]/gi, '☑');
  const lines = esc(src).split('\n');
  let out = '', list = null, para = [];
  const flushP = () => { if (para.length) { out += `<p>${inline(para.join('<br>'))}</p>`; para = []; } };
  const flushL = () => { if (list) { out += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    let m;
    if (!l.trim()) { flushP(); flushL(); continue; }
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { flushP(); flushL(); out += `<h${m[1].length + 1}>${inline(m[2])}</h${m[1].length + 1}>`; continue; }
    if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { flushP(); if (list !== 'ul') { flushL(); out += '<ul>'; list = 'ul'; } out += `<li>${inline(m[1])}</li>`; continue; }
    if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { flushP(); if (list !== 'ol') { flushL(); out += '<ol>'; list = 'ol'; } out += `<li>${inline(m[1])}</li>`; continue; }
    if ((m = l.match(/^&gt;\s?(.*)/))) { flushP(); flushL(); out += `<blockquote>${inline(m[1])}</blockquote>`; continue; }
    flushL();
    para.push(l);
  }
  flushP(); flushL();
  return out;
}
const plain = (s = '') => s.replace(/[*#>`_]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

// ============ API ============
async function api(path, opts = {}) {
  const o = { credentials: 'same-origin', ...opts, headers: { ...(opts.headers || {}) } };
  if (o.body && typeof o.body === 'object' && !(o.body instanceof Blob) && !(o.body instanceof FormData)) {
    o.body = JSON.stringify(o.body);
    o.headers['content-type'] = 'application/json';
  }
  const r = await fetch(path, o);
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && !path.startsWith('/api/auth')) { showLogin(data.code === 'locked' ? 'locked' : 'login'); throw new Error(data.error || 'Chưa đăng nhập'); }
  if (!r.ok) throw new Error(data.error || `Lỗi ${r.status}`);
  return data;
}
const kvGet = async (k) => (await api('/api/kv/' + k)).value;
const kvSet = (k, value) => api('/api/kv/' + k, { method: 'PUT', body: { value } });

// ============ Trạng thái ============
const S = {
  entries: [],
  cfg: {},
  settings: { theme: 'auto', model: '', userName: '', clientId: '', driveAuto: false },
  filter: { q: '', type: '', tag: '', day: '', all: false },
  view: 'timeline',
  tuvi: {},
  folders: [],
};
const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt;
const allTags = () => {
  const c = {};
  S.entries.forEach((e) => e.tags.forEach((t) => (c[t] = (c[t] || 0) + 1)));
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
};
const photoUrl = (p, thumb) => `/api/photos/${typeof p === 'string' ? p : p.id}${thumb ? '?t=1' : ''}`;

function applyTheme() {
  const t = S.settings.theme || 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  $$('#themeChips button').forEach((b) => b.classList.toggle('on', b.dataset.theme === t));
}
const saveSettings = debounce(() => kvSet('settings', S.settings).catch(() => {}), 600);

// ============ Đăng nhập / mở khoá ============
const loadWebAuthn = () => (window.SimpleWebAuthnBrowser ? Promise.resolve() : new Promise((ok, no) => {
  const s = document.createElement('script'); s.src = '/vendor/webauthn.js'; s.onload = ok; s.onerror = () => no(new Error('Không tải được thư viện Face ID')); document.head.appendChild(s);
}));
const canPasskey = () => !!window.PublicKeyCredential;
async function passkeyLogin() {
  await loadWebAuthn();
  const opts = await api('/api/auth/passkey-login-options', { method: 'POST', body: {} });
  let resp;
  try { resp = await SimpleWebAuthnBrowser.startAuthentication({ optionsJSON: opts }); }
  catch (e) { throw new Error(e.name === 'NotAllowedError' ? 'Bạn đã huỷ hoặc hết thời gian quét' : e.message); }
  await api('/api/auth/passkey-login', { method: 'POST', body: { response: resp } });
}
async function passkeyRegister() {
  await loadWebAuthn();
  const opts = await api('/api/auth/passkey-reg-options', { method: 'POST', body: {} });
  let resp;
  try { resp = await SimpleWebAuthnBrowser.startRegistration({ optionsJSON: opts }); }
  catch (e) { throw new Error(e.name === 'InvalidStateError' ? 'Máy này đã được thiết lập Face ID / vân tay rồi' : e.name === 'NotAllowedError' ? 'Bạn đã huỷ' : e.message); }
  await api('/api/auth/passkey-reg', { method: 'POST', body: { response: resp } });
}
function googleButton(el, onCredential) {
  if (!S.cfg.googleClientId) return false;
  Drive.loadGis().then(() => {
    google.accounts.id.initialize({ client_id: S.cfg.googleClientId, callback: (r) => onCredential(r.credential), auto_select: false, ux_mode: 'popup' });
    el.innerHTML = '';
    google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'vi', width: 280 });
  }).catch(() => {});
  return true;
}

let appShown = false;
async function showLogin(mode) {
  if (appShown) { location.reload(); return; } // xoá dữ liệu khỏi bộ nhớ khi bị khoá / đăng xuất
  if (!S.cfg || S.cfg.ok === undefined) { try { S.cfg = await api('/api/auth'); } catch { S.cfg = {}; } }
  const locked = mode === 'locked' || S.cfg.locked;
  $('#app').classList.add('hidden');
  $('#login').classList.remove('hidden');
  $('#loginLogo').textContent = locked ? '🔒' : '📖';
  $('#loginTitle').textContent = locked ? 'Nhật ký đang khoá' : 'Nhật Ký Riêng';
  $('#loginSub').textContent = locked ? 'Xác minh để tiếp tục — dữ liệu của bạn vẫn an toàn.' : 'Nơi cất giữ ngày tháng, bài học, nơi chốn và những điều hay ho của bạn.';
  const pk = S.cfg.hasPasskey && canPasskey();
  $('#pkLogin').classList.toggle('hidden', !pk);
  const g = S.cfg.googleLogin && googleButton($('#gLogin'), async (credential) => {
    try { await api('/api/auth/google', { method: 'POST', body: { credential } }); location.reload(); }
    catch (e) { $('#loginErr').textContent = e.message; }
  });
  $('#gLogin').classList.toggle('hidden', !g);
  $('#orLine').classList.toggle('hidden', !(pk || g));
  $('#loginBtn').className = 'btn block ' + (pk ? 'ghost' : 'primary');
  if (!pk) setTimeout(() => $('#loginPass').focus(), 50);
  if (S.cfg.configured === false) $('#loginErr').textContent = 'Chủ app chưa đặt APP_PASSWORD trên Netlify.';
}
$('#pkLogin').addEventListener('click', async () => {
  $('#loginErr').textContent = '';
  $('#pkLogin').disabled = true;
  try { await passkeyLogin(); location.reload(); }
  catch (e) { $('#loginErr').textContent = e.message; }
  $('#pkLogin').disabled = false;
});
$('#loginForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  $('#loginErr').textContent = '';
  try {
    await api('/api/auth', { method: 'POST', body: { password: $('#loginPass').value } });
    $('#loginPass').value = '';
    location.reload();
  } catch (e) {
    $('#loginErr').textContent = e.message;
  }
});

// Tự khoá khi rời app quá lâu
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  const lm = S.cfg?.lockMinutes;
  if (appShown && lm && hiddenAt && Date.now() - hiddenAt > lm * 60000) lockApp();
});
async function lockApp() {
  await fetch('/api/auth/lock-now', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
  location.reload();
}

async function boot() {
  let cfg;
  try { cfg = await api('/api/auth'); } catch (e) { cfg = { ok: false }; }
  S.cfg = cfg;
  if (!cfg.ok) return showLogin(cfg.locked ? 'locked' : 'login');
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  appShown = true;
  const [ents, st, tv, fo] = await Promise.all([api('/api/entries'), kvGet('settings').catch(() => null), kvGet('tuvi').catch(() => null), kvGet('folders').catch(() => null)]);
  S.folders = Array.isArray(fo) ? fo : [];
  S.tuvi = tv || {};
  S.entries = ents.entries.sort(byDateDesc);
  Object.assign(S.settings, st || {});
  applyTheme();
  fillSettings();
  go(location.hash.slice(1) || 'timeline');
  handleSharedLink();
}

// ============ Điều hướng ============
const RENDER = {};
function go(view) {
  if (!$('#v-' + view)) view = 'timeline';
  S.view = view;
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'v-' + view));
  $$('#nav button[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('#navMore').classList.toggle('active', !!$(`#nav .nav-extra[data-view="${view}"]`));
  $('#fab').classList.toggle('hidden', view === 'assistant' || view === 'settings' || view === 'tuvi');
  if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
  RENDER[view]?.();
  window.scrollTo(0, 0);
}
$$('#nav button[data-view]').forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));
$('#navMore').addEventListener('click', () => {
  const items = $$('#nav .nav-extra').map((b) => `<button data-go="${b.dataset.view}">${b.querySelector('i').textContent} ${b.querySelector('span').textContent}</button>`).join('');
  openModal(`<div class="sheet-head"><h3>Thêm</h3><button class="icon-btn" data-close>✕</button></div><div class="menu-list">${items}</div>`);
  $$('.menu-list [data-go]').forEach((b) => (b.onclick = () => { closeModal(); go(b.dataset.go); }));
});
$('#fab').addEventListener('click', () => (S.view === 'links' ? openLinkEditor() : openEditor()));
const rerender = () => RENDER[S.view]?.();

// ============ Lưu / xoá ============
async function saveEntry(e) {
  e.updatedAt = Date.now();
  const today = dayKey(localISO());
  const firstToday = !S.entries.some((x) => x.id === e.id) && dayKey(e.date) === today && !S.entries.some((x) => dayKey(x.date) === today);
  const r = await api('/api/entries', { method: 'POST', body: e });
  const saved = r.entries[0] || e;
  if (firstToday) setTimeout(() => celebrate(streak()), 300);
  const i = S.entries.findIndex((x) => x.id === saved.id);
  if (i >= 0) S.entries[i] = saved; else S.entries.push(saved);
  S.entries.sort(byDateDesc);
  if (saved.folderId) { folderPath(saved.folderId).forEach((f) => openFolders.add(f.id)); saveOpen(); } // mở sẵn thư mục chứa mục vừa lưu
  Drive.autoSync();
  return saved;
}
async function deleteEntry(id) {
  await api('/api/entries/' + id, { method: 'DELETE' });
  S.entries = S.entries.filter((e) => e.id !== id);
  Drive.autoSync();
}
const newEntry = (over = {}) => ({
  id: uid(), type: 'nhatky', title: '', content: '', date: localISO(), mood: 0, tags: [], photos: [],
  location: null, links: [], ai: '', createdAt: Date.now(), updatedAt: Date.now(), ...over,
});

// ============ Dòng thời gian ============
// ============ Trang Nhật ký: chỉ dành cho viết & cảm xúc ============
const TYPE_COLORS = { nhatky: '#d9774f', baihoc: '#d99a1e', ghichu: '#4f7fd9', link: '#8a5cd6', diadiem: '#17a673', ytuong: '#d94f8f', muctieu: '#d64545' };
const PROMPTS_DAY = [
  'Điều gì hôm nay khiến bạn mỉm cười?', 'Một việc nhỏ bạn làm tốt hôm nay là gì?', 'Hôm nay bạn học được điều gì mới?',
  'Ai là người bạn muốn cảm ơn lúc này? Vì sao?', 'Nếu được làm lại hôm nay, bạn sẽ đổi điều gì?', 'Điều gì đang chiếm nhiều suy nghĩ của bạn nhất?',
  'Ba điều bạn biết ơn hôm nay?', 'Khoảnh khắc yên bình nhất trong ngày của bạn?', 'Bạn đang mong chờ điều gì trong tuần này?',
  'Một nỗi lo bạn muốn buông xuống?', 'Hôm nay cơ thể bạn cảm thấy thế nào?', 'Một câu nói / đoạn đọc được làm bạn nhớ?',
  'Bạn đã giúp ai hoặc được ai giúp hôm nay?', 'Điều gì khiến bạn tự hào về bản thân gần đây?', 'Mục tiêu nhỏ nào bạn muốn làm vào ngày mai?',
  'Một món ăn / nơi chốn đáng nhớ gần đây?', 'Bạn muốn nói gì với chính mình của 5 năm trước?', 'Thói quen nào bạn muốn bắt đầu?',
  'Hôm nay có điều gì làm bạn bất ngờ?', 'Nếu hôm nay là một bài hát, đó sẽ là bài gì?', 'Bạn đã dành thời gian cho ai?',
  'Một sai lầm và bài học rút ra?', 'Điều gì giúp bạn nạp lại năng lượng?', 'Ước mơ lớn nhất lúc này của bạn?',
  'Một điều bạn muốn học trong tháng này?', 'Bạn đã nói "không" với điều gì? Có đúng không?', 'Kỷ niệm tuổi thơ nào chợt nhớ gần đây?',
  'Bạn chấm hôm nay mấy điểm trên 10? Vì sao?', 'Tin nhắn nào làm bạn vui gần đây?', 'Điều gì bạn muốn nhớ mãi về giai đoạn này?',
];
let promptShift = 0;
const dayOfYear = () => Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
const TH = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const longDate = (iso) => { const d = parseDate(iso); return `${TH[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`; };
const isNoise = (e) => e.type === 'link' || e.tags.includes('ai') || e.tags.includes('tử vi');
const moodOfDay = (k) => { const ms = S.entries.filter((e) => e.mood && dayKey(e.date) === k).map((e) => e.mood); return ms.length ? Math.round(ms.reduce((a, b) => a + b) / ms.length) : 0; };
S.quickMood = 0;

function weekRing(n) {
  const r = 20, c = 2 * Math.PI * r, f = Math.min(1, n / 7);
  return `<svg viewBox="0 0 52 52" class="ring"><circle cx="26" cy="26" r="${r}" class="ring-bg"/><circle cx="26" cy="26" r="${r}" class="ring-fg" stroke-dasharray="${c * f} ${c}" transform="rotate(-90 26 26)"/><text x="26" y="30" text-anchor="middle">${n}/7</text></svg>`;
}

function renderHome() {
  const now = localISO(), today = dayKey(now), l = lun(now);
  const h = new Date().getHours();
  const g = h < 5 ? 'Khuya rồi' : h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const icon = h < 5 ? '🌙' : h < 11 ? '🌤️' : h < 14 ? '☀️' : h < 18 ? '🌇' : '🌙';
  const todays = S.entries.filter((e) => dayKey(e.date) === today && !isNoise(e));
  const st = streak();
  // Số ngày đã viết trong tuần (T2 → CN)
  const d0 = new Date(); d0.setDate(d0.getDate() - ((d0.getDay() + 6) % 7));
  const days = new Set(S.entries.filter((e) => !isNoise(e)).map((e) => dayKey(e.date)));
  let wk = 0; for (let i = 0; i < 7; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); if (days.has(dayKey(localISO(d)))) wk++; }
  const msg = todays.length ? `Hôm nay bạn đã viết ${todays.length} trang. Tuyệt lắm! ✨` : st ? `Viết một dòng để giữ chuỗi ${st} ngày nhé 🔥` : 'Một dòng nhỏ mỗi ngày — bắt đầu thôi 🌱';
  $('#hero').innerHTML = `
    <div class="hero-top">
      <div><div class="hero-hi">${icon} ${g}${S.settings.userName ? ', ' + esc(S.settings.userName) : ''}</div>
      <div class="hero-date">${msg}</div></div>
      <div class="hero-badges">
        <div class="streak ${st ? 'on' : ''}" title="Số ngày viết liên tiếp"><span class="fire">🔥</span><b>${st}</b><small>ngày liền</small></div>
        <div class="week" title="Số ngày đã viết trong tuần này">${weekRing(wk)}<small>tuần này</small></div>
      </div>
    </div>`;

  // Dải tâm trạng 14 ngày
  let strip = '';
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = dayKey(localISO(d)), m = moodOfDay(k), has = days.has(k);
    strip += `<button class="ms-day ${k === today ? 'today' : ''} ${S.filter.day === k ? 'on' : ''}" data-day="${k}" title="${fmtDate(k)}">
      <span class="ms-e">${m ? MOODS[m] : has ? '📝' : '·'}</span><small>${i === 0 ? 'nay' : WD[d.getDay()]}</small><small class="ms-n">${d.getDate()}</small></button>`;
  }
  $('#moodStrip').innerHTML = `<div class="ms-title">🌈 Tâm trạng 2 tuần qua <span class="muted small">— chạm một ngày để đọc lại</span></div><div class="ms-row">${strip}</div>`;
  const msr = $('#moodStrip .ms-row'); msr.scrollLeft = msr.scrollWidth;
  $$('#moodStrip [data-day]').forEach((b) => (b.onclick = () => { S.filter.day = S.filter.day === b.dataset.day ? '' : b.dataset.day; RENDER.timeline(); if (S.filter.day) $('#timeline').scrollIntoView({ behavior: 'smooth' }); }));

  // Trang viết hôm nay
  const p = PROMPTS_DAY[(dayOfYear() + promptShift) % PROMPTS_DAY.length];
  $('#dpDate').textContent = longDate(now);
  $('#dpLunar').textContent = `🌙 ${l.text} âm lịch`;
  $('#dpPrompt').textContent = '💭 ' + p;
  $('#quick').placeholder = 'Viết vài dòng thôi cũng được… hôm nay có gì vui, buồn, đáng nhớ?';
  $('#dpMood').innerHTML = `<span class="muted small">Cảm xúc:</span>` + [5, 4, 3, 2, 1].map((m) => `<button data-mood="${m}" class="${S.quickMood === m ? 'on' : ''}" title="${MOOD_NAMES[m]}">${MOODS[m]}</button>`).join('');
  $$('#dpMood [data-mood]').forEach((b) => (b.onclick = () => { S.quickMood = S.quickMood === +b.dataset.mood ? 0 : +b.dataset.mood; renderHome(); $('#quick').focus(); }));
}
$('#dpNext').addEventListener('click', () => { promptShift++; renderHome(); });
// Chuyển nội dung đang viết sang trình soạn đầy đủ
const composerToEditor = (over = {}, opts = {}) => {
  const e = newEntry({ content: $('#quick').value, mood: S.quickMood, ...over });
  $('#quick').value = ''; S.quickMood = 0;
  openEditor(e, opts);
};
$('#quickDraw').addEventListener('click', () => composerToEditor({}, { draw: true }));
$('#quickPhoto').addEventListener('click', () => composerToEditor({}, { photo: true }));
$('#quickPlace').addEventListener('click', () => composerToEditor({}, { locate: true }));
$('#quickLesson').addEventListener('click', () => composerToEditor({ type: 'baihoc', content: $('#quick').value || TEMPLATES.baihoc }, { focus: true }));

// Hiệu ứng mừng khi giữ chuỗi ngày viết
function celebrate(n) {
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  const bits = ['🎉', '✨', '🔥', '💛', '🌟', '🎊'];
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span');
    s.textContent = bits[i % bits.length];
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDelay = Math.random() * 0.4 + 's';
    s.style.fontSize = 16 + Math.random() * 18 + 'px';
    wrap.appendChild(s);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 2600);
  toast(n > 1 ? `🔥 Chuỗi ${n} ngày liên tiếp! Giữ lửa nhé` : '🌱 Mục đầu tiên hôm nay — bắt đầu chuỗi mới!', 3500);
}

function streak() {
  const days = new Set(S.entries.map((e) => dayKey(e.date)));
  let d = new Date(), n = 0;
  if (!days.has(dayKey(localISO(d)))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(localISO(d)))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function entryCard(e) {
  const t = TYPES[e.type] || TYPES.ghichu;
  const thumbs = e.photos.slice(0, 4).map((p) => `<img loading="lazy" src="${photoUrl(p, 1)}" alt="" class="${p.sketch ? 'sk' : ''}">`).join('');
  const more = e.photos.length > 4 ? `<span class="muted small">+${e.photos.length - 4}</span>` : '';
  const excerpt = plain(e.content).slice(0, 320);
  const kids = childrenOf(e.id).length;
  return `<article class="entry" data-id="${e.id}" style="--tc:${TYPE_COLORS[e.type] || '#888'}">
    <div class="e-side"><span class="e-big" title="${e.mood ? MOOD_NAMES[e.mood] : t.name}">${e.mood ? MOODS[e.mood] : t.icon}</span><span class="e-time">${fmtTime(e.date) || ''}</span></div>
    <div class="e-body">
      ${e.title ? `<div class="e-title">${e.type !== 'nhatky' ? `<span class="e-kind">${t.icon} ${t.name}</span> ` : ''}${esc(e.title)}</div>` : e.type !== 'nhatky' ? `<div class="e-kind">${t.icon} ${t.name}</div>` : ''}
      ${excerpt ? `<div class="e-excerpt">${esc(excerpt)}</div>` : ''}
      ${thumbs ? `<div class="thumbs">${thumbs}${more}</div>` : ''}
      ${!excerpt && e.links[0] ? `<div class="e-excerpt">🔗 ${esc(e.links[0].title || e.links[0].url)}</div>` : ''}
      <div class="e-meta">
        ${e.folderId && folderById(e.folderId) ? `<span class="cat">📁 ${esc(folderById(e.folderId).name)}</span>` : ''}
        ${e.parentId && entryExists(e.parentId) ? `<span>↳ ${esc((S.entries.find((x) => x.id === e.parentId).title || 'mục mẹ').slice(0, 30))}</span>` : ''}
        ${kids ? `<span>🧩 ${kids} mục con</span>` : ''}
        ${e.music ? `<span>🎵 ${esc(e.music.name.slice(0, 30))}</span>` : ''}
        ${e.location ? `<span>📍 ${esc(shortPlace(e.location.name))}</span>` : ''}
        ${e.tags.map((x) => `<span class="tag">#${esc(x)}</span>`).join('')}
      </div>
    </div></article>`;
}
const shortPlace = (n = '') => n.split(',').slice(0, 2).join(',').trim();

function filtered() {
  const { q, type, tag, day, all } = S.filter;
  const qs = q.toLowerCase().normalize('NFC').trim();
  return S.entries.filter((e) => {
    if (!all && isNoise(e)) return false;
    if (day && dayKey(e.date) !== day) return false;
    if (type && e.type !== type) return false;
    if (tag && !e.tags.includes(tag)) return false;
    if (qs) {
      const hay = ['âm ' + lun(e.date).text, e.title, e.content, e.summary, e.category, e.tags.join(' '), e.location?.name, e.links.map((l) => l.title + ' ' + l.url).join(' ')].join(' ').toLowerCase();
      return qs.split(/\s+/).every((w) => hay.includes(w));
    }
    return true;
  });
}

// Cột phụ (máy tính): số liệu nhanh + thẻ hay dùng
function renderSide() {
  const box = $('#sideStats'); if (!box) return;
  const J = S.entries.filter((e) => !isNoise(e));
  const mo = localISO().slice(0, 7);
  const thisMonth = J.filter((e) => e.date.slice(0, 7) === mo);
  const words = thisMonth.reduce((n, e) => n + (e.content.trim() ? e.content.trim().split(/\s+/).length : 0), 0);
  const ms = thisMonth.filter((e) => e.mood).map((e) => e.mood);
  const avg = ms.length ? ms.reduce((a, b) => a + b) / ms.length : 0;
  const tags = {}; J.forEach((e) => e.tags.forEach((t) => (tags[t] = (tags[t] || 0) + 1)));
  const top = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 10);
  box.innerHTML = `<div class="ss-title">📊 Tháng ${+mo.slice(5)} của bạn</div>
    <div class="ss-grid"><div><b>${thisMonth.length}</b><small>trang</small></div><div><b>${words.toLocaleString('vi-VN')}</b><small>chữ</small></div>
      <div><b>${thisMonth.reduce((n, e) => n + e.photos.length, 0)}</b><small>ảnh</small></div><div><b>${avg ? MOODS[Math.round(avg)] : '—'}</b><small>cảm xúc TB</small></div></div>
    ${top.length ? `<div class="ss-title" style="margin-top:12px">🏷️ Chủ đề hay viết</div><div class="chips">${top.map(([t, n]) => `<button data-tag="${esc(t)}" class="${S.filter.tag === t ? 'on' : ''}">#${esc(t)} <span class="n">${n}</span></button>`).join('')}</div>` : ''}
    <div class="row gap wrap" style="margin-top:12px"><button class="btn ghost sm" data-go="stats">Xem thống kê</button><button class="btn ghost sm" data-go="assistant">✨ Hỏi trợ lý</button></div>`;
  $$('#sideStats [data-tag]').forEach((b) => (b.onclick = () => { S.filter.tag = S.filter.tag === b.dataset.tag ? '' : b.dataset.tag; RENDER.timeline(); }));
  $$('#sideStats [data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));
}

RENDER.timeline = function () {
  renderHome();
  renderSide();
  const JT = Object.entries(TYPES).filter(([k]) => k !== 'link');
  $('#typeChips').innerHTML = `<button data-t="" class="${!S.filter.type ? 'on' : ''}">Tất cả</button>` +
    JT.map(([k, t]) => `<button data-t="${k}" style="--tc:${TYPE_COLORS[k]}" class="tchip ${S.filter.type === k ? 'on' : ''}">${t.icon} ${t.name}</button>`).join('') +
    `<button data-all="1" class="${S.filter.all ? 'on' : ''}" title="Hiện cả link đã lưu và ghi chú do AI tạo">🗂️ Cả link & ghi chú AI</button>`;
  $$('#typeChips [data-t]').forEach((b) => (b.onclick = () => { S.filter.type = b.dataset.t; RENDER.timeline(); }));
  $('#typeChips [data-all]').onclick = () => { S.filter.all = !S.filter.all; RENDER.timeline(); };
  $('#tagFilter').innerHTML = '<option value="">Tất cả thẻ</option>' + allTags().map(([t, n]) => `<option value="${esc(t)}" ${S.filter.tag === t ? 'selected' : ''}>#${esc(t)} (${n})</option>`).join('');

  // Ngày này năm xưa + một kỷ niệm ngẫu nhiên
  const md_ = localISO().slice(5, 10), yr = new Date().getFullYear();
  const tl = lun(localISO());
  const otd = S.entries.filter((e) => {
    if (isNoise(e)) return false;
    if (+e.date.slice(0, 4) >= yr && lun(e.date).year >= tl.year) return false;
    if (e.date.slice(5, 10) === md_ && +e.date.slice(0, 4) < yr) return true;
    const l = lun(e.date);
    return l.day === tl.day && l.month === tl.month && l.year < tl.year;
  });
  const otdTag = (e) => (e.date.slice(5, 10) === md_ ? `${yr - +e.date.slice(0, 4)} năm trước` : `${tl.year - lun(e.date).year} năm trước (âm lịch)`);
  const old = S.entries.filter((e) => !isNoise(e) && Date.now() - parseDate(e.date) > 7 * 864e5 && (e.content.length > 30 || e.photos.length));
  const mem = old.length ? old[(dayOfYear() * 7919) % old.length] : null;
  const busy = S.filter.q || S.filter.day;
  $('#onThisDay').innerHTML = busy ? '' :
    (otd.length ? `<div class="card otd"><h3>🕰️ Ngày này năm xưa</h3>${otd.map((e) => `<div class="item" data-id="${e.id}"><b>${otdTag(e)}</b> · ${MOODS[e.mood] || TYPES[e.type]?.icon || ''} ${esc(e.title || plain(e.content).slice(0, 80))}</div>`).join('')}</div>` : '') +
    (mem ? `<div class="card memory item" data-id="${mem.id}"><div class="pc-label">💌 Nhớ lại</div><div class="mem-date">${longDate(mem.date)}, ${mem.date.slice(0, 4)}</div>
      ${mem.photos[0] ? `<img src="${photoUrl(mem.photos[0], 1)}" alt="" class="mem-img">` : ''}<div class="mem-text">${esc((mem.title ? mem.title + ' — ' : '') + plain(mem.content).slice(0, 200))}</div></div>` : '');

  $('#viewMode').innerHTML = `<button data-v="date" class="${S.settings.viewMode !== 'folder' ? 'on' : ''}">📅 Theo ngày</button><button data-v="folder" class="${S.settings.viewMode === 'folder' ? 'on' : ''}">📁 Theo thư mục</button>` +
    (S.filter.day ? `<button class="on" id="dayClear">📆 ${fmtDate(S.filter.day)} ✕</button>` : '');
  $$('#viewMode [data-v]').forEach((b) => (b.onclick = () => { S.settings.viewMode = b.dataset.v; saveSettings(); RENDER.timeline(); }));
  if ($('#dayClear')) $('#dayClear').onclick = () => { S.filter.day = ''; RENDER.timeline(); };
  const list = filtered();
  if (S.settings.viewMode === 'folder') return renderFolderView(list);
  if (!list.length) {
    $('#timeline').innerHTML = S.entries.some((e) => !isNoise(e))
      ? `<div class="empty"><b>🔍</b>${S.filter.day ? 'Ngày này bạn chưa viết gì.' : 'Không tìm thấy trang nào.'}</div>`
      : '<div class="empty"><b>🌱</b>Cuốn sổ còn trống.<br>Viết trang đầu tiên ở phía trên nhé.</div>';
    return;
  }
  // Nhóm theo ngày như những trang sổ
  const todayK = dayKey(localISO()), y = new Date(); y.setDate(y.getDate() - 1); const yK = dayKey(localISO(y));
  let html = '', cur = '';
  for (const e of list.slice(0, 300)) {
    const k = dayKey(e.date);
    if (k !== cur) {
      if (cur) html += '</div>';
      cur = k;
      const l = lun(e.date), m = moodOfDay(k);
      html += `<div class="day-group"><div class="day-h"><span class="day-name">${k === todayK ? 'Hôm nay' : k === yK ? 'Hôm qua' : longDate(e.date)}</span>
        <span class="day-sub">${k === todayK || k === yK ? longDate(e.date) + ' · ' : ''}${e.date.slice(0, 4) !== String(new Date().getFullYear()) ? e.date.slice(0, 4) + ' · ' : ''}âm ${l.text}${m ? ' · ' + MOODS[m] : ''}</span></div>`;
    }
    html += entryCard(e);
  }
  html += '</div>';
  if (list.length > 300) html += `<p class="muted small">Đang hiện 300/${list.length} trang. Dùng ô tìm kiếm để lọc.</p>`;
  $('#timeline').innerHTML = html;
};
$('#onThisDay').addEventListener('click', (ev) => { const a = ev.target.closest('.item[data-id]'); if (a) openViewer(a.dataset.id); });
$('#search').addEventListener('input', debounce((ev) => { S.filter.q = ev.target.value; RENDER.timeline(); }, 200));
$('#tagFilter').addEventListener('change', (ev) => { S.filter.tag = ev.target.value; RENDER.timeline(); });

// ============ Ghi nhanh ============
const URL_RE = /https?:\/\/[^\s<>"]+/g;
$('#quickSave').addEventListener('click', async () => {
  const text = $('#quick').value.trim();
  if (!text && !S.quickMood) { $('#quick').focus(); return toast('Viết vài dòng hoặc chọn một cảm xúc nhé'); }
  const urls = text.match(URL_RE) || [];
  if (urls.length && text.replace(URL_RE, '').trim().length < 20) { $('#quick').value = ''; return quickSaveLinks(text); }
  const e = newEntry({ type: 'nhatky', content: text || `Cảm thấy ${MOOD_NAMES[S.quickMood].toLowerCase()} ${MOODS[S.quickMood]}`, mood: S.quickMood });
  $('#quickSave').disabled = true;
  try {
    e.links = await Promise.all(urls.slice(0, 5).map(unfurl));
    await saveEntry(e);
    $('#quick').value = ''; S.quickMood = 0;
    toast('Đã lưu trang nhật ký ✓');
    RENDER.timeline();
  } catch (err) { toast(err.message); }
  $('#quickSave').disabled = false;
});
$('#quickAI').addEventListener('click', async () => {
  const text = $('#quick').value.trim();
  if (!text) return $('#quick').focus();
  const btn = $('#quickAI');
  btn.disabled = true; btn.textContent = '✨ Đang sắp xếp…';
  try {
    const tags = allTags().slice(0, 40).map((t) => t[0]).join(', ');
    const res = await aiJSON({
      system: `Bạn là trợ lý ghi chép nhật ký cá nhân. Hôm nay là ${fmtDate(localISO())} (${localISO()}).
Nhiệm vụ: đọc đoạn người dùng kể và tách thành 1 hoặc vài mục nhật ký có cấu trúc. Giữ nguyên giọng văn, ngôi thứ nhất, chỉ sửa chính tả và sắp xếp cho mạch lạc, KHÔNG bịa thêm chi tiết.
Loại (type) chọn một trong: ${Object.keys(TYPES).join(', ')} (nhatky=kể chuyện trong ngày, baihoc=điều rút ra, ghichu=ghi chú thông tin, link=chia sẻ link, diadiem=nơi đã đến, ytuong=ý tưởng, muctieu=mục tiêu).
Nếu có nhắc thời điểm (hôm qua, sáng nay, 8h tối…) thì suy ra date dạng YYYY-MM-DDTHH:mm; nếu không, dùng thời điểm hiện tại.
mood: 1-5 nếu đoán được cảm xúc, 0 nếu không rõ. tags: 1-4 thẻ ngắn, chữ thường, ưu tiên dùng lại thẻ đã có: ${tags || '(chưa có)'}.
place: tên địa điểm cụ thể nếu có nhắc (quán, thành phố…), không thì "".
Trả về JSON: {"entries":[{"type":"","title":"","content":"","date":"","mood":0,"tags":[],"place":""}]}`,
      messages: [{ role: 'user', text }],
    });
    const items = (res.entries || []).filter((x) => x && (x.content || x.title));
    if (!items.length) throw new Error('AI không tách được mục nào');
    const urls = text.match(URL_RE) || [];
    const links = await Promise.all(urls.slice(0, 5).map(unfurl));
    const drafts = items.map((x, i) => newEntry({
      type: TYPES[x.type] ? x.type : 'nhatky', title: x.title || '', content: x.content || '',
      date: /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(x.date) ? x.date : localISO(), mood: +x.mood || 0,
      tags: (x.tags || []).map((t) => String(t).toLowerCase().trim()).filter(Boolean), links: i === 0 ? links : [], _place: x.place || '',
    }));
    if (drafts.length === 1) {
      $('#quick').value = '';
      openEditor(drafts[0]);
      if (drafts[0]._place) toast('Gợi ý địa điểm: ' + drafts[0]._place + ' — tìm trong ô Vị trí', 4000);
    } else previewDrafts(drafts);
  } catch (err) { toast(err.message, 4000); }
  btn.disabled = false; btn.textContent = '✨ AI sắp xếp';
});

function previewDrafts(drafts) {
  openModal(`<div class="sheet-head"><h3>AI tách thành ${drafts.length} mục</h3><button class="icon-btn" data-close>✕</button></div>
    <p class="muted small">Bỏ chọn mục không muốn lưu. Bấm vào tiêu đề để sửa chi tiết sau.</p>
    <div class="preview-list">${drafts.map((d, i) => `<label><input type="checkbox" checked data-i="${i}"><div>
      <b>${TYPES[d.type].icon} ${esc(d.title || '(không tiêu đề)')}</b> <span class="muted small">${fmtDate(d.date)} ${fmtTime(d.date)} ${MOODS[d.mood] || ''}</span>
      <div class="small">${esc(d.content.slice(0, 220))}</div>
      <div>${d.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join(' ')}</div></div></label>`).join('')}</div>
    <div class="sheet-foot"><button class="btn primary" id="saveDrafts">Lưu các mục đã chọn</button></div>`);
  $('#saveDrafts').onclick = async () => {
    const pick = $$('.preview-list input:checked').map((c) => drafts[+c.dataset.i]);
    try {
      for (const d of pick) { delete d._place; await saveEntry(d); }
      $('#quick').value = '';
      closeModal(); toast(`Đã lưu ${pick.length} mục ✓`); rerender();
    } catch (e) { toast(e.message); }
  };
}

// Nhận giọng nói (Chrome/Edge/Safari)
function dictate(target, btn) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast('Trình duyệt này chưa hỗ trợ nhận giọng nói. Hãy dùng Chrome hoặc nút mic trên bàn phím điện thoại.', 4000);
  if (btn._rec) { btn._rec.stop(); return; }
  const rec = new SR();
  rec.lang = 'vi-VN'; rec.continuous = true; rec.interimResults = true;
  const base = target.value ? target.value.replace(/\s*$/, ' ') : '';
  let finalText = '';
  rec.onresult = (ev) => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) finalText += r[0].transcript + ' '; else interim += r[0].transcript;
    }
    target.value = base + finalText + interim;
    target.dispatchEvent(new Event('input'));
  };
  rec.onend = () => { btn._rec = null; btn.classList.remove('mic-on'); };
  rec.onerror = (e) => toast('Mic: ' + e.error);
  rec.start();
  btn._rec = rec; btn.classList.add('mic-on');
}
$('#quickMic').addEventListener('click', () => dictate($('#quick'), $('#quickMic')));

async function unfurl(url) {
  try { return await api('/api/unfurl?url=' + encodeURIComponent(url)); }
  catch { return { url, title: url, desc: '', image: '', site: '' }; }
}
const linkCard = (l) => `<a class="link-card" href="${esc(l.url)}" target="_blank" rel="noopener">
  ${l.image ? `<img src="${esc(l.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
  <div><div class="lc-s">${esc(l.site || '')}</div><div class="lc-t">${esc(l.title || l.url)}</div>${l.desc ? `<div class="lc-d">${esc(l.desc)}</div>` : ''}</div></a>`;

// ============ Modal ============
function openModal(html) {
  $('#sheet').innerHTML = html;
  $('#modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  $$('[data-close]', $('#sheet')).forEach((b) => (b.onclick = closeModal));
}
function closeModal() {
  $('#modal').classList.add('hidden');
  document.body.style.overflow = '';
  $('#sheet').innerHTML = '';
}
$('#modal').addEventListener('mousedown', (ev) => { if (ev.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  if (!$('#lightbox').classList.contains('hidden')) $('#lightbox').classList.add('hidden');
  else if (!$('#modal').classList.contains('hidden') && !$('#sheet [data-dirty]')) closeModal();
});
function lightbox(src, cap = '') {
  $('#lbImg').src = src; $('#lbCap').textContent = cap;
  $('#lightbox').classList.remove('hidden');
}
$('#lightbox').addEventListener('click', () => $('#lightbox').classList.add('hidden'));

// ============ Ảnh: nén trước khi tải lên ============
async function resize(file, max, q = 0.85) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { bmp = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); }); }
  const w0 = bmp.width, h0 = bmp.height, k = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas');
  c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', q));
  return { blob, w: c.width, h: c.height };
}
async function uploadPhoto(file) {
  const id = 'p' + uid();
  const big = await resize(file, 1800, 0.85);
  const small = await resize(file, 420, 0.78);
  await api('/api/photos/' + id, { method: 'PUT', body: big.blob, headers: { 'content-type': 'image/jpeg' } });
  await api('/api/photos/' + id + '_t', { method: 'PUT', body: small.blob, headers: { 'content-type': 'image/jpeg' } });
  return { id, w: big.w, h: big.h };
}
const blobToB64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });

// ============ Vị trí ============
async function reverseGeo(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi&zoom=17`);
    const d = await r.json();
    const a = d.address || {};
    const name = [d.name, a.road, a.suburb || a.quarter, a.city || a.town || a.county || a.state].filter(Boolean);
    return [...new Set(name)].join(', ') || d.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
}
async function searchPlace(q) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=vi&q=${encodeURIComponent(q)}`);
  return (await r.json()).map((p) => ({ lat: +p.lat, lng: +p.lon, name: p.display_name }));
}
function currentPosition() {
  return new Promise((ok, no) => {
    if (!navigator.geolocation) return no(new Error('Thiết bị không hỗ trợ định vị'));
    navigator.geolocation.getCurrentPosition((p) => ok(p.coords), (e) => no(new Error(e.code === 1 ? 'Bạn chưa cho phép truy cập vị trí' : 'Không lấy được vị trí')), { enableHighAccuracy: true, timeout: 12000 });
  });
}

// ============ Trang viết tay (bút cảm ứng / Apple Pencil / ngón tay / chuột) ============
const SK_COLORS = ['#1f1f1f', '#2f5bd3', '#d23b3b', '#1f9d55', '#e08a00', '#8a4fd6', '#d9457f', '#7a5230'];
const SK_BGS = [['lines', '📄 Kẻ dòng'], ['grid', '▦ Ô vuông'], ['dots', '⋯ Chấm'], ['blank', '⬜ Trơn']];
function openSketch({ data = null, onSave, onText } = {}) {
  const W = Math.min(window.innerWidth, 1400);
  const scale = data ? W / data.w : 1;
  const st = {
    tool: 'pen', color: SK_COLORS[0], size: 3, bg: data?.bg || 'lines', penOnly: false, sawPen: false,
    strokes: (data?.strokes || []).map((s) => ({ ...s, w: s.w * scale, p: s.p.map(([x, y, pr]) => [x * scale, y * scale, pr]) })),
    undo: [], redo: [], cur: null, H: Math.max(window.innerHeight - 70, data ? data.h * scale : 0), dirty: false,
  };
  const wrap = document.createElement('div');
  wrap.className = 'sketch';
  wrap.innerHTML = `
    <div class="sk-bar">
      <button class="sk-b" data-act="close" title="Đóng">✕</button>
      <div class="sk-grp">${[['pen', '🖊️', 'Bút'], ['hl', '🖍️', 'Bút dạ quang'], ['eraser', '🧽', 'Tẩy']].map(([k, i, t]) => `<button class="sk-b ${k === 'pen' ? 'on' : ''}" data-tool="${k}" title="${t}">${i}</button>`).join('')}</div>
      <div class="sk-grp sk-colors">${SK_COLORS.map((c, i) => `<button class="sk-c ${i === 0 ? 'on' : ''}" data-color="${c}" style="--c:${c}" title="${c}"></button>`).join('')}<label class="sk-c sk-custom" title="Màu khác"><input type="color" value="#2f5bd3"></label></div>
      <div class="sk-grp">${[[2, 'Nét mảnh'], [3, 'Nét vừa'], [6, 'Nét đậm'], [10, 'Rất đậm']].map(([v, t]) => `<button class="sk-b sk-size ${v === 3 ? 'on' : ''}" data-size="${v}" title="${t}"><i style="--s:${v + 2}px"></i></button>`).join('')}</div>
      <div class="sk-grp">
        <button class="sk-b" data-act="undo" title="Hoàn tác">↶</button><button class="sk-b" data-act="redo" title="Làm lại">↷</button>
        <button class="sk-b" data-act="bg" title="Đổi nền giấy">📄</button>
        <button class="sk-b" data-act="pen" title="Chỉ nhận bút (chống chạm lòng bàn tay) — ngón tay dùng để cuộn">✋</button>
        <button class="sk-b" data-act="page" title="Thêm trang">＋📃</button>
        <button class="sk-b" data-act="clear" title="Xoá hết">🗑</button>
      </div>
      <span class="grow"></span>
      <button class="btn ghost sm" data-act="ocr" title="AI đọc chữ viết tay thành văn bản">🔤 Đọc chữ</button>
      <button class="btn primary sm" data-act="save">Lưu</button>
    </div>
    <div class="sk-hint" id="skHint">Viết bằng bút, ngón tay hoặc chuột. Trên iPad, nét bút đậm/nhạt theo lực nhấn Apple Pencil.</div>
    <div class="sk-scroll"><div class="sk-paper"><canvas class="sk-base"></canvas><canvas class="sk-live"></canvas></div></div>
    <div class="sk-ocr hidden"><div class="row gap"><b class="grow">🔤 Chữ AI đọc được</b><button class="icon-btn" data-act="ocrx">✕</button></div>
      <textarea rows="5"></textarea><div class="row gap"><button class="btn primary sm" data-act="ocrins">Chèn vào nhật ký</button><span class="muted small">Bạn có thể sửa trước khi chèn.</span></div></div>`;
  document.body.appendChild(wrap);
  document.body.style.overflow = 'hidden';
  const base = wrap.querySelector('.sk-base'), live = wrap.querySelector('.sk-live'), paper = wrap.querySelector('.sk-paper'), scroller = wrap.querySelector('.sk-scroll');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const bx = base.getContext('2d'), lx = live.getContext('2d');
  const size = () => {
    for (const c of [base, live]) { c.width = W * dpr; c.height = st.H * dpr; c.style.width = W + 'px'; c.style.height = st.H + 'px'; c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); }
    paper.style.width = W + 'px'; paper.style.height = st.H + 'px';
    redraw();
  };
  const drawBg = (ctx) => {
    ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, W, st.H);
    ctx.save();
    if (st.bg === 'lines') { ctx.strokeStyle = '#c9d6ea'; ctx.lineWidth = 1; for (let y = 64; y < st.H; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } ctx.strokeStyle = '#efb8b8'; ctx.beginPath(); ctx.moveTo(56, 0); ctx.lineTo(56, st.H); ctx.stroke(); }
    if (st.bg === 'grid') { ctx.strokeStyle = '#dde5f0'; ctx.lineWidth = 1; for (let x = 0; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, st.H); ctx.stroke(); } for (let y = 0; y < st.H; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } }
    if (st.bg === 'dots') { ctx.fillStyle = '#c5cfdd'; for (let x = 14; x < W; x += 28) for (let y = 14; y < st.H; y += 28) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 7); ctx.fill(); } }
    ctx.restore();
  };
  const drawStroke = (ctx, s) => {
    const p = s.p; if (!p.length) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (s.t === 'hl') {
      ctx.globalAlpha = 0.35; ctx.strokeStyle = s.c; ctx.lineWidth = s.w * 4;
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.stroke();
    } else {
      ctx.strokeStyle = s.c; ctx.fillStyle = s.c;
      if (p.length === 1) { ctx.beginPath(); ctx.arc(p[0][0], p[0][1], s.w * (0.35 + p[0][2] * 0.9) / 2, 0, 7); ctx.fill(); }
      for (let i = 1; i < p.length; i++) {
        const a = p[i - 1], b = p[i], pa = i > 1 ? p[i - 2] : a;
        ctx.lineWidth = s.w * (0.35 + ((a[2] + b[2]) / 2) * 0.9);
        ctx.beginPath();
        ctx.moveTo((pa[0] + a[0]) / 2, (pa[1] + a[1]) / 2);
        ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  function redraw() { bx.clearRect(0, 0, W, st.H); drawBg(bx); st.strokes.forEach((s) => drawStroke(bx, s)); lx.clearRect(0, 0, W, st.H); }
  const snapshot = () => { st.undo.push(st.strokes.slice()); if (st.undo.length > 80) st.undo.shift(); st.redo = []; st.dirty = true; };
  const pos = (ev) => { const r = live.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top, ev.pointerType === 'pen' ? (ev.pressure || 0.5) : 0.5]; };
  const eraseAt = ([x, y]) => {
    const r = 14, before = st.strokes.length;
    st.strokes = st.strokes.filter((s) => !s.p.some(([px, py]) => (px - x) ** 2 + (py - y) ** 2 < (r + s.w) ** 2));
    if (st.strokes.length !== before) redraw();
  };
  live.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'pen' && !st.sawPen) { st.sawPen = true; setPenOnly(true); }
    if (st.penOnly && ev.pointerType === 'touch') return; // lòng bàn tay / ngón tay: để cuộn
    ev.preventDefault();
    live.setPointerCapture(ev.pointerId);
    snapshot();
    if (st.tool === 'eraser') { st.cur = { erasing: true }; eraseAt(pos(ev)); return; }
    st.cur = { t: st.tool, c: st.color, w: st.size, p: [pos(ev)] };
  });
  live.addEventListener('pointermove', (ev) => {
    if (!st.cur) return;
    ev.preventDefault();
    const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
    if (st.cur.erasing) { evs.forEach((e) => eraseAt(pos(e))); return; }
    evs.forEach((e) => st.cur.p.push(pos(e)));
    lx.clearRect(0, 0, W, st.H); drawStroke(lx, st.cur);
  });
  const end = () => {
    if (!st.cur) return;
    if (!st.cur.erasing) { st.strokes.push(st.cur); drawStroke(bx, st.cur); lx.clearRect(0, 0, W, st.H); }
    st.cur = null;
  };
  live.addEventListener('pointerup', end); live.addEventListener('pointercancel', end); live.addEventListener('pointerleave', (ev) => { if (ev.pointerType !== 'touch') end(); });
  function setPenOnly(v) {
    st.penOnly = v;
    live.style.touchAction = v ? 'pan-y' : 'none';
    wrap.querySelector('[data-act="pen"]').classList.toggle('on', v);
    wrap.querySelector('#skHint').textContent = v ? '✋ Chế độ chỉ nhận bút: tay đặt lên màn hình không để lại nét, vuốt ngón tay để cuộn trang.' : 'Viết bằng bút, ngón tay hoặc chuột.';
  }
  const close = async () => {
    if (st.dirty && st.strokes.length && !(await askConfirm('Đóng trang viết tay mà không lưu?', 'Đóng'))) return;
    wrap.remove(); document.body.style.overflow = $('#modal').classList.contains('hidden') ? '' : 'hidden';
  };
  const exportJpeg = (q = 0.9) => {
    // cắt bớt phần trống phía dưới
    let maxY = 200; st.strokes.forEach((s) => s.p.forEach(([, y]) => { if (y > maxY) maxY = y; }));
    const h = Math.min(st.H, Math.ceil(maxY + 60));
    const c = document.createElement('canvas'); c.width = W * dpr; c.height = h * dpr;
    const x = c.getContext('2d'); x.drawImage(base, 0, 0, W * dpr, h * dpr, 0, 0, W * dpr, h * dpr);
    return { c, h };
  };
  wrap.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.tool) { st.tool = b.dataset.tool; wrap.querySelectorAll('[data-tool]').forEach((x) => x.classList.toggle('on', x === b)); }
    if (b.dataset.color) { st.color = b.dataset.color; if (st.tool === 'eraser') wrap.querySelector('[data-tool="pen"]').click(); wrap.querySelectorAll('.sk-c').forEach((x) => x.classList.toggle('on', x === b)); }
    if (b.dataset.size) { st.size = +b.dataset.size; wrap.querySelectorAll('[data-size]').forEach((x) => x.classList.toggle('on', x === b)); }
    const a = b.dataset.act;
    if (a === 'close') close();
    if (a === 'undo' && st.undo.length) { st.redo.push(st.strokes); st.strokes = st.undo.pop(); redraw(); }
    if (a === 'redo' && st.redo.length) { st.undo.push(st.strokes); st.strokes = st.redo.pop(); redraw(); }
    if (a === 'bg') { const i = SK_BGS.findIndex(([k]) => k === st.bg); st.bg = SK_BGS[(i + 1) % SK_BGS.length][0]; toast(SK_BGS[(i + 1) % SK_BGS.length][1], 1200); redraw(); }
    if (a === 'pen') setPenOnly(!st.penOnly);
    if (a === 'page') { st.H += Math.round(window.innerHeight * 0.8); size(); setTimeout(() => scroller.scrollTo({ top: st.H, behavior: 'smooth' }), 50); }
    if (a === 'clear' && st.strokes.length && (await askConfirm('Xoá hết nét trên trang này?', 'Xoá hết'))) { snapshot(); st.strokes = []; redraw(); }
    if (a === 'ocr') {
      if (!st.strokes.length) return toast('Trang đang trống');
      b.disabled = true; b.textContent = '🔤 Đang đọc…';
      try {
        const { c } = exportJpeg(0.85);
        const small = document.createElement('canvas'); const k = Math.min(1, 1600 / c.width); small.width = c.width * k; small.height = c.height * k;
        small.getContext('2d').drawImage(c, 0, 0, small.width, small.height);
        const r = await aiJSON({
          system: 'Bạn đọc chữ viết tay (chủ yếu tiếng Việt, có dấu) trong ảnh. Chép lại CHÍNH XÁC nội dung, giữ xuống dòng, sửa lỗi nhận dạng rõ ràng nhưng không thêm ý. Hình vẽ/sơ đồ thì mô tả ngắn trong ngoặc vuông, ví dụ [hình vẽ ngôi nhà]. Trả JSON {"text": "..."}',
          messages: [{ role: 'user', text: 'Hãy đọc chữ viết tay trong ảnh này.', images: [{ mime: 'image/jpeg', data: small.toDataURL('image/jpeg', 0.85).split(',')[1] }] }],
        });
        wrap.querySelector('.sk-ocr textarea').value = r.text || '';
        wrap.querySelector('.sk-ocr').classList.remove('hidden');
      } catch (e) { toast(e.message, 4000); }
      b.disabled = false; b.textContent = '🔤 Đọc chữ';
    }
    if (a === 'ocrx') wrap.querySelector('.sk-ocr').classList.add('hidden');
    if (a === 'ocrins') { onText?.(wrap.querySelector('.sk-ocr textarea').value.trim()); wrap.querySelector('.sk-ocr').classList.add('hidden'); toast('Đã chèn chữ vào nhật ký ✓'); }
    if (a === 'save') {
      if (!st.strokes.length) return toast('Trang đang trống');
      b.disabled = true; b.textContent = 'Đang lưu…';
      try {
        const { c, h } = exportJpeg();
        const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9));
        const r1 = (n) => Math.round(n * 10) / 10;
        const json = { v: 1, w: W, h, bg: st.bg, strokes: st.strokes.map((s) => ({ t: s.t, c: s.c, w: r1(s.w), p: s.p.map(([x, y, pr]) => [r1(x), r1(y), Math.round(pr * 100) / 100]) })) };
        await onSave({ blob, json });
        wrap.remove(); document.body.style.overflow = $('#modal').classList.contains('hidden') ? '' : 'hidden';
      } catch (e) { toast('Lỗi lưu: ' + e.message, 4000); b.disabled = false; b.textContent = 'Lưu'; }
    }
  });
  wrap.querySelector('.sk-custom input').addEventListener('input', (ev) => { st.color = ev.target.value; wrap.querySelectorAll('.sk-c').forEach((x) => x.classList.remove('on')); ev.target.parentElement.classList.add('on'); });
  size();
}
// Lưu trang viết tay thành ảnh + dữ liệu nét (để sửa tiếp sau này)
async function saveSketchPhoto({ blob, json }) {
  const ph = await uploadPhoto(blob);
  await api('/api/photos/' + ph.id + '_s', { method: 'PUT', body: new Blob([JSON.stringify(json)], { type: 'application/json' }), headers: { 'content-type': 'application/json' } });
  return { ...ph, sketch: true };
}

// ============ Trình soạn ============
function openEditor(entry, opts = {}) {
  const isNew = !entry || !S.entries.some((x) => x.id === entry.id);
  const e = structuredClone(entry || newEntry());
  const place = e._place; delete e._place;
  const tagOpts = allTags().map(([t]) => `<option value="${esc(t)}">`).join('');
  openModal(`
    <div class="sheet-head">
      <div class="chips" id="edType">${Object.entries(TYPES).map(([k, t]) => `<button data-t="${k}" class="${e.type === k ? 'on' : ''}">${t.icon} ${t.name}</button>`).join('')}</div>
      <button class="icon-btn" id="edClose" title="Đóng">✕</button>
    </div>
    <div class="row gap wrap">
      <input type="datetime-local" id="edDate" value="${esc(e.date)}" style="max-width:220px">
      <div class="mood" id="edMood">${MOODS.slice(1).map((m, i) => `<button data-m="${i + 1}" title="${MOOD_NAMES[i + 1]}" class="${e.mood === i + 1 ? 'on' : ''}">${m}</button>`).join('')}</div>
    </div>
    <input class="ed-title" id="edTitle" placeholder="Tiêu đề (tuỳ chọn)" value="${esc(e.title)}">
    <textarea class="ed-content" id="edContent" placeholder="Viết gì đó…">${esc(e.content)}</textarea>
    <div class="row gap wrap" style="margin-top:6px">
      <button class="btn ghost sm" id="edMic">🎙️ Nói</button>
      <button class="btn ghost sm" id="edDraw">✍️ Viết tay</button>
      <button class="btn ghost sm" id="edTpl">📋 Mẫu</button>
      <button class="btn ghost sm" id="edAI">✨ AI gợi ý tiêu đề & thẻ</button>
    </div>

    <label class="lbl">Ảnh</label>
    <div class="ed-photos" id="edPhotos"></div>

    <label class="lbl">Vị trí</label>
    <div class="loc-box" id="edLoc"></div>
    <div id="locSearchBox" class="hidden"><input id="locQ" placeholder="Tìm địa điểm (vd: Hồ Gươm, Hà Nội)"><div class="suggest hidden" id="locSug"></div></div>

    <label class="lbl">Link</label>
    <div class="row gap"><input id="edLinkIn" placeholder="Dán link rồi Enter"><button class="btn ghost" id="edLinkAdd">Thêm</button></div>
    <div id="edLinks"></div>

    <label class="lbl">Thẻ (cách nhau bằng dấu phẩy)</label>
    <input id="edTags" list="tagList" value="${esc(e.tags.join(', '))}" placeholder="vd: công việc, gia đình, sức khoẻ">
    <datalist id="tagList">${tagOpts}</datalist>

    <label class="lbl">📁 Thư mục</label>
    <div class="row gap"><select id="edFolder">${folderOptions(e.folderId)}</select><button class="btn ghost sm" id="edNewFolder" style="white-space:nowrap">＋ Thư mục</button></div>
    <label class="lbl">🧩 Là mục con của</label>
    <select id="edParent">${parentOptions(e)}</select>
    <div id="edMusic" style="margin-top:10px"></div>

    <div class="sheet-foot">
      <button class="btn primary" id="edSave">Lưu</button>
      <button class="btn ghost" data-close>Huỷ</button>
      <span class="grow"></span>
      ${isNew ? '' : '<button class="btn danger" id="edDel">🗑 Xoá</button>'}
    </div>`);

  const sheet = $('#sheet');
  const dirty = () => sheet.setAttribute('data-dirty', '1');
  sheet.addEventListener('input', dirty);
  const ta = $('#edContent');
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 4, window.innerHeight * 0.6) + 'px'; };
  ta.addEventListener('input', grow); setTimeout(grow, 0);
  if ((isNew && !e.content && !opts.mic && !opts.photo) || opts.focus) setTimeout(() => ta.focus(), 60);

  $('#edClose').onclick = async () => { if (!sheet.hasAttribute('data-dirty') || (await askConfirm('Bỏ các thay đổi chưa lưu?', 'Bỏ thay đổi'))) closeModal(); };
  $('#edNewFolder').onclick = async () => { const f = await createFolder($('#edFolder').value); if (f) { $('#edFolder').innerHTML = folderOptions(f.id); dirty(); } };
  $('#edParent').onchange = () => { const p = S.entries.find((x) => x.id === $('#edParent').value); if (p && !$('#edFolder').value && p.folderId) $('#edFolder').innerHTML = folderOptions(p.folderId); };
  const drawMusic = () => {
    $('#edMusic').innerHTML = e.music ? `<span class="loc-chip">🎵 ${esc(e.music.name)}</span> <button class="icon-btn" id="edMusicX" title="Bỏ bài nhạc">✕</button>`
      : Player.cur ? `<button class="btn ghost sm" id="edMusicAdd">🎵 Gắn bài đang phát: ${esc(Player.cur.name.slice(0, 40))}</button>` : '';
    if ($('#edMusicX')) $('#edMusicX').onclick = () => { e.music = null; drawMusic(); dirty(); };
    if ($('#edMusicAdd')) $('#edMusicAdd').onclick = () => { e.music = { id: Player.cur.id, name: Player.cur.name }; drawMusic(); dirty(); };
  };
  drawMusic();
  $$('#edType button').forEach((b) => (b.onclick = () => { e.type = b.dataset.t; $$('#edType button').forEach((x) => x.classList.toggle('on', x === b)); dirty(); }));
  $$('#edMood button').forEach((b) => (b.onclick = () => { const m = +b.dataset.m; e.mood = e.mood === m ? 0 : m; $$('#edMood button').forEach((x) => x.classList.toggle('on', +x.dataset.m === e.mood)); dirty(); }));
  $('#edMic').onclick = () => dictate(ta, $('#edMic'));
  $('#edTpl').onclick = () => { const t = TEMPLATES[e.type] || TEMPLATES.nhatky; ta.value = ta.value ? ta.value + '\n\n' + t : t; grow(); ta.focus(); dirty(); };

  // Ảnh
  const pending = new Set();
  const drawPhotos = () => {
    $('#edPhotos').innerHTML = e.photos.map((p, i) => `<div class="ph ${p.sketch ? 'is-sk' : ''}" data-i="${i}"><img src="${photoUrl(p, 1)}" alt="" ${p.sketch ? 'title="Chạm để viết tiếp"' : ''}>${p.sketch ? '<span class="sk-badge">✍️</span>' : ''}<button data-i="${i}" title="Bỏ ảnh">✕</button></div>`).join('') +
      [...pending].map(() => '<div class="ph loading"><img alt=""></div>').join('') +
      `<label class="add-ph">＋ Ảnh<input type="file" accept="image/*" multiple hidden id="edFile"></label>`;
    $$('#edPhotos .ph button').forEach((b) => (b.onclick = (ev) => { ev.stopPropagation(); e.photos.splice(+b.dataset.i, 1); drawPhotos(); dirty(); }));
    $$('#edPhotos .ph.is-sk img').forEach((im) => (im.onclick = async () => {
      const i = +im.parentElement.dataset.i, old = e.photos[i];
      let data = null;
      try { const r = await fetch(photoUrl(old.id + '_s'), { credentials: 'same-origin' }); if (r.ok) data = await r.json(); } catch {}
      if (!data) return toast('Không mở lại được nét vẽ của trang này');
      openSketch({ data, onText: insertText, onSave: async (res) => { e.photos[i] = await saveSketchPhoto(res); api('/api/photos/' + old.id, { method: 'DELETE' }).catch(() => {}); drawPhotos(); dirty(); } });
    }));
    $('#edFile').onchange = async (ev) => {
      const files = [...ev.target.files];
      for (const f of files) {
        const tk = {}; pending.add(tk); drawPhotos();
        try { e.photos.push(await uploadPhoto(f)); dirty(); }
        catch (err) { toast('Lỗi tải ảnh: ' + err.message); }
        pending.delete(tk); drawPhotos();
      }
    };
  };
  drawPhotos();
  const insertText = (t) => { if (!t) return; ta.value = (ta.value.trim() ? ta.value.replace(/\s*$/, '\n\n') : '') + t; grow(); dirty(); };
  const newSketch = () => openSketch({ onText: insertText, onSave: async (res) => { e.photos.push(await saveSketchPhoto(res)); drawPhotos(); dirty(); } });
  $('#edDraw').onclick = newSketch;

  // Vị trí
  const drawLoc = () => {
    $('#edLoc').innerHTML = e.location
      ? `<span class="loc-chip">📍 ${esc(shortPlace(e.location.name))}</span><button class="icon-btn" id="locRm" title="Bỏ vị trí">✕</button>`
      : `<button class="btn ghost sm" id="locHere">📍 Vị trí hiện tại</button><button class="btn ghost sm" id="locFind">🔎 Tìm địa điểm</button>`;
    if (e.location) $('#locRm').onclick = () => { e.location = null; drawLoc(); dirty(); };
    else {
      $('#locHere').onclick = async () => {
        $('#locHere').textContent = 'Đang lấy vị trí…';
        try {
          const c = await currentPosition();
          e.location = { lat: c.latitude, lng: c.longitude, name: await reverseGeo(c.latitude, c.longitude) };
          dirty();
        } catch (err) { toast(err.message); }
        drawLoc();
      };
      $('#locFind').onclick = () => { $('#locSearchBox').classList.remove('hidden'); $('#locQ').focus(); };
    }
  };
  drawLoc();
  if (place) { $('#locSearchBox').classList.remove('hidden'); $('#locQ').value = place; setTimeout(() => $('#locQ').dispatchEvent(new Event('input')), 100); }
  $('#locQ').addEventListener('input', debounce(async () => {
    const q = $('#locQ').value.trim();
    if (q.length < 3) return $('#locSug').classList.add('hidden');
    try {
      const res = await searchPlace(q);
      $('#locSug').innerHTML = res.length ? res.map((p, i) => `<div data-i="${i}">${esc(p.name)}</div>`).join('') : '<div>Không tìm thấy</div>';
      $('#locSug').classList.remove('hidden');
      $$('#locSug div[data-i]').forEach((d) => (d.onclick = () => {
        e.location = res[+d.dataset.i]; $('#locSearchBox').classList.add('hidden'); $('#locSug').classList.add('hidden'); drawLoc(); dirty();
      }));
    } catch {}
  }, 450));

  // Link
  const drawLinks = () => {
    $('#edLinks').innerHTML = e.links.map((l, i) => `<div class="row gap">${linkCard(l)}<button class="icon-btn" data-i="${i}">✕</button></div>`).join('');
    $$('#edLinks .icon-btn').forEach((b) => (b.onclick = () => { e.links.splice(+b.dataset.i, 1); drawLinks(); dirty(); }));
  };
  drawLinks();
  const addLink = async () => {
    let u = $('#edLinkIn').value.trim();
    if (!u) return;
    if (!/^https?:\/\//.test(u)) u = 'https://' + u;
    $('#edLinkAdd').disabled = true;
    e.links.push(await unfurl(u));
    $('#edLinkIn').value = ''; $('#edLinkAdd').disabled = false;
    drawLinks(); dirty();
  };
  $('#edLinkAdd').onclick = addLink;
  $('#edLinkIn').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); addLink(); } });

  // AI gợi ý
  $('#edAI').onclick = async () => {
    const text = ta.value.trim();
    if (!text && !e.photos.length && !e.links.length) return toast('Viết vài dòng trước đã nhé');
    const b = $('#edAI'); b.disabled = true; b.textContent = '✨ Đang nghĩ…';
    try {
      const images = [];
      for (const p of e.photos.slice(0, 2)) {
        const bl = await fetch(photoUrl(p, 1)).then((r) => r.blob());
        images.push({ mime: 'image/jpeg', data: await blobToB64(bl) });
      }
      const res = await aiJSON({
        system: `Bạn giúp người dùng đặt tiêu đề và gắn thẻ cho một mục nhật ký tiếng Việt. Tiêu đề ngắn (≤ 60 ký tự), gợi cảm xúc, không dùng dấu ngoặc kép. 2-4 thẻ chữ thường, ưu tiên thẻ đã có: ${allTags().slice(0, 40).map((t) => t[0]).join(', ') || '(chưa có)'}. type phù hợp nhất trong: ${Object.keys(TYPES).join(', ')}. mood 1-5 (0 nếu không rõ). Trả JSON {"title":"","tags":[],"type":"","mood":0}`,
        messages: [{ role: 'user', text: `${text}\n${e.links.map((l) => 'Link: ' + l.title).join('\n')}${images.length ? '\n(Kèm ảnh)' : ''}`, images }],
      });
      if (res.title && !$('#edTitle').value.trim()) $('#edTitle').value = res.title;
      else if (res.title) toast('Gợi ý tiêu đề: ' + res.title, 4000);
      const cur = $('#edTags').value.split(',').map((x) => x.trim()).filter(Boolean);
      $('#edTags').value = [...new Set([...cur, ...(res.tags || []).map((t) => String(t).toLowerCase())])].join(', ');
      if (!e.mood && res.mood) { e.mood = +res.mood; $$('#edMood button').forEach((x) => x.classList.toggle('on', +x.dataset.m === e.mood)); }
      dirty();
    } catch (err) { toast(err.message, 4000); }
    b.disabled = false; b.textContent = '✨ AI gợi ý tiêu đề & thẻ';
  };

  $('#edSave').onclick = async () => {
    if (pending.size) return toast('Đợi ảnh tải lên xong đã nhé');
    e.title = $('#edTitle').value.trim();
    e.content = ta.value;
    e.date = $('#edDate').value || localISO();
    e.tags = [...new Set($('#edTags').value.split(',').map((x) => x.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))];
    e.folderId = $('#edFolder').value;
    e.parentId = $('#edParent').value;
    if (!e.title && !e.content.trim() && !e.photos.length && !e.links.length && !e.location && !e.music) return toast('Mục trống — chưa có gì để lưu');
    $('#edSave').disabled = true; $('#edSave').textContent = 'Đang lưu…';
    try { await saveEntry(e); closeModal(); toast('Đã lưu ✓'); rerender(); }
    catch (err) { toast(err.message); $('#edSave').disabled = false; $('#edSave').textContent = 'Lưu'; }
  };
  if (!isNew) $('#edDel').onclick = () => confirmDelete(e.id);
  if (opts.mic) $('#edMic').click();
  if (opts.draw) newSketch();
  if (opts.photo) $('#edFile')?.click();
  if (opts.locate) $('#locHere')?.click();
}

// ============ Xem một mục ============
function openViewer(id) {
  const e = S.entries.find((x) => x.id === id);
  if (!e) return;
  const t = TYPES[e.type] || TYPES.ghichu;
  openModal(`
    <div class="sheet-head">
      <span class="muted">${t.icon} ${t.name} · ${fmtDate(e.date)} ${fmtTime(e.date)} · âm ${lun(e.date).text} ${lun(e.date).yearCC} (ngày ${lun(e.date).dayCC}) ${e.mood ? '· ' + MOODS[e.mood] + ' ' + MOOD_NAMES[e.mood] : ''}</span>
      <button class="icon-btn" data-close>✕</button>
    </div>
    ${e.folderId && folderById(e.folderId) || (e.parentId && entryExists(e.parentId)) ? `<p class="crumb">${e.folderId && folderById(e.folderId) ? `📁 ${esc(folderLabel(e.folderId))}` : ''}${e.parentId && entryExists(e.parentId) ? ` ${e.folderId ? '·' : ''} ↳ thuộc <a href="#" data-open="${e.parentId}">${esc(S.entries.find((x) => x.id === e.parentId).title || 'mục mẹ')}</a>` : ''}</p>` : ''}
    ${e.title ? `<h2>${esc(e.title)}</h2>` : ''}
    ${e.music ? `<p><a href="#" class="loc-chip" data-play="${esc(e.music.id)}" data-name="${esc(e.music.name)}">▶ 🎵 ${esc(e.music.name)}</a></p>` : ''}
    ${e.category || e.status ? `<p>${e.category ? `<span class="cat">${catIcon(e.category)} ${esc(e.category)}</span> ` : ''}${e.status ? `<span class="cat">${STATUS[e.status].join(' ')}</span>` : ''}</p>` : ''}
    ${e.type === 'link' && e.links[0] && ytId(e.links[0].url) ? `<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${esc(ytId(e.links[0].url))}" allowfullscreen loading="lazy" title="YouTube"></iframe></div>` : ''}
    ${e.content && e.type === 'link' ? '<h4 style="margin:14px 0 4px">📝 Ghi chú của tôi</h4>' : ''}
    <div class="v-content md">${md(e.content)}</div>
    ${e.summary ? `<div class="sum-box"><h4>✨ Tóm tắt (AI)</h4><div class="md">${md(e.summary)}</div></div>` : ''}
    ${e.photos.length ? `<div class="v-photos">${e.photos.map((p) => `<img src="${photoUrl(p, 1)}" data-full="${photoUrl(p)}" loading="lazy" alt="">`).join('')}</div>` : ''}
    ${e.links.map(linkCard).join('')}
    ${e.location ? `<p style="margin-top:12px">📍 ${esc(e.location.name)} · <a href="https://www.google.com/maps?q=${e.location.lat},${e.location.lng}" target="_blank" rel="noopener">Mở Google Maps</a></p><div class="mini-map" id="miniMap"></div>` : ''}
    <div style="margin-top:10px">${e.tags.map((x) => `<span class="tag">#${esc(x)}</span>`).join(' ')}</div>
    <div id="aiBox">${e.ai ? `<div class="ai-box"><h4>✨ Góc nhìn của trợ lý</h4><div class="md">${md(e.ai)}</div></div>` : ''}</div>
    ${childrenOf(e.id).length ? `<div class="kids-box"><h4>🧩 Mục con (${childrenOf(e.id).length})</h4>${childrenOf(e.id).map(entryRow).join('')}</div>` : ''}
    <div class="sheet-foot">
      <button class="btn primary" id="vEdit">✏️ Sửa</button>
      <button class="btn ghost" id="vChild">＋ Mục con</button>
      <button class="btn ghost" id="vAI">✨ ${e.ai ? 'Hỏi AI lại' : 'AI phản hồi'}</button>
      <span class="grow"></span>
      <button class="btn danger" id="vDel" title="Xoá mục này">🗑</button>
    </div>`);
  $('#vDel').onclick = () => confirmDelete(e.id);
  $('#vChild').onclick = () => openEditor(newEntry({ parentId: e.id, folderId: e.folderId || '' }));
  $$('.kids-box .trow').forEach((r) => (r.onclick = () => openViewer(r.dataset.id)));
  $$('.v-photos img').forEach((im) => (im.onclick = () => lightbox(im.dataset.full, e.title)));
  $('#vEdit').onclick = () => (e.type === 'link' && e.links.length ? openLinkEditor({ entry: e }) : openEditor(e));
  if (e.location) loadLeaflet().then(() => {
    if (!$('#miniMap')) return;
    const m = L.map('miniMap', { zoomControl: false, attributionControl: false }).setView([e.location.lat, e.location.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
    L.marker([e.location.lat, e.location.lng]).addTo(m);
  }).catch(() => {});
  $('#vAI').onclick = async () => {
    const b = $('#vAI'); b.disabled = true;
    $('#aiBox').innerHTML = '<div class="ai-box"><h4>✨ Góc nhìn của trợ lý</h4><div class="md typing" id="aiOut"></div></div>';
    const related = S.entries.filter((x) => x.id !== e.id && x.tags.some((t) => e.tags.includes(t))).slice(0, 15);
    try {
      const text = await aiStream({
        system: systemPrompt() + `\nNhiệm vụ: phản hồi MỘT mục nhật ký như một người bạn sâu sắc. Gồm: (1) 1-2 câu đồng cảm/ghi nhận; (2) **Bài học rút ra** 1-3 gạch đầu dòng; (3) **Câu hỏi để nghĩ thêm** 1-2 câu; (4) nếu thấy liên hệ với các mục cũ thì nói ngắn gọn kèm ngày. Tối đa 180 chữ.`,
        messages: [{ role: 'user', text: `MỤC CẦN PHẢN HỒI:\n${entryText(e, 4000)}\n\nCÁC MỤC CŨ LIÊN QUAN:\n${related.map((x) => entryText(x, 500)).join('\n\n') || '(không có)'}` }],
        onText: (t) => ($('#aiOut') ? ($('#aiOut').innerHTML = md(t)) : 0),
      });
      $('#aiOut')?.classList.remove('typing');
      e.ai = text; await saveEntry(e);
    } catch (err) { $('#aiBox').innerHTML = `<p class="err">${esc(err.message)}</p>`; }
    b.disabled = false;
  };
}

// ============ AI ============
function systemPrompt() {
  const who = S.settings.userName ? `Người dùng tên là ${S.settings.userName}.` : '';
  return `Bạn là trợ lý nhật ký riêng tư, ấm áp và thẳng thắn của người dùng. ${who}
Hôm nay: ${fmtDate(localISO())}, ${fmtTime(localISO())}.
Nguyên tắc: trả lời bằng tiếng Việt tự nhiên; chỉ dựa vào dữ liệu nhật ký được cung cấp, khi nêu sự kiện thì dẫn ngày (vd: 12/9); không bịa; nếu dữ liệu chưa đủ thì nói rõ. Dùng markdown gọn (gạch đầu dòng, **in đậm**), không dùng bảng. Không chẩn đoán y khoa; nếu thấy dấu hiệu buồn kéo dài thì nhẹ nhàng khuyến khích tìm người tin cậy hoặc chuyên gia.`;
}
function entryText(e, max = 1200) {
  const t = TYPES[e.type]?.name || e.type;
  const meta = [e.mood ? `tâm trạng ${e.mood}/5` : '', e.location ? '@ ' + shortPlace(e.location.name) : '', e.tags.length ? e.tags.map((x) => '#' + x).join(' ') : '', e.photos.length ? `${e.photos.length} ảnh` : ''].filter(Boolean).join(' | ');
  const links = (e.links.length ? '\nLink: ' + e.links.map((l) => `${l.title}${l.author ? ' - ' + l.author : ''} (${l.url})`).join('; ') : '') +
    (e.category ? '\nChủ đề: ' + e.category : '') + (e.folderId && folderById(e.folderId) ? '\nThư mục: ' + folderLabel(e.folderId) : '') + (e.summary ? '\nTóm tắt link: ' + plain(e.summary).slice(0, 800) : '');
  const c = e.content.length > max ? e.content.slice(0, max) + '…' : e.content;
  return `[${e.date.replace('T', ' ')} | âm ${lun(e.date).text}] (${t}) ${e.title || ''}${meta ? ' | ' + meta : ''}\n${c}${links}`;
}
async function aiFetch(body) {
  const r = await fetch('/api/ai', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: S.settings.model || undefined, ...body }) });
  if (r.status === 401) { showLogin(); throw new Error('Chưa đăng nhập hoặc app đang khoá'); }
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'AI lỗi ' + r.status); }
  return r;
}
async function aiStream({ system, messages, onText }) {
  const r = await aiFetch({ system, messages });
  const reader = r.body.getReader(), dec = new TextDecoder();
  let t = '';
  for (;;) { const { done, value } = await reader.read(); if (done) break; t += dec.decode(value, { stream: true }); onText?.(t); }
  return t;
}
async function aiJSON({ system, messages }) {
  const r = await aiFetch({ system, messages, json: true });
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { const m = txt.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('AI trả về dữ liệu không đọc được'); }
}

// ============ Hộp xác nhận / nhập chữ riêng (không dùng confirm() của trình duyệt vì Zalo, Messenger… hay chặn) ============
function askConfirm(msg, okText = 'Đồng ý', danger = true) {
  return new Promise((res) => {
    const w = document.createElement('div');
    w.className = 'confirm-wrap';
    w.innerHTML = `<div class="confirm-box"><p>${msg}</p><div class="row gap" style="justify-content:flex-end"><button class="btn ghost" data-v="0">Huỷ</button><button class="btn ${danger ? 'danger-fill' : 'primary'}" data-v="1">${okText}</button></div></div>`;
    document.body.appendChild(w);
    w.addEventListener('click', (ev) => { const b = ev.target.closest('[data-v]'); if (b || ev.target === w) { w.remove(); res(b?.dataset.v === '1'); } });
  });
}
function askText(title, value = '', okText = 'Lưu') {
  return new Promise((res) => {
    const w = document.createElement('div');
    w.className = 'confirm-wrap';
    w.innerHTML = `<form class="confirm-box"><p><b>${title}</b></p><input id="askIn" value="${esc(value)}" maxlength="80" autocomplete="off"><div class="row gap" style="justify-content:flex-end;margin-top:12px"><button type="button" class="btn ghost" data-v="0">Huỷ</button><button type="submit" class="btn primary">${okText}</button></div></form>`;
    document.body.appendChild(w);
    const inp = w.querySelector('#askIn'); setTimeout(() => { inp.focus(); inp.select(); }, 30);
    const done = (v) => { w.remove(); res(v); };
    w.querySelector('form').onsubmit = (ev) => { ev.preventDefault(); done(inp.value.trim() || null); };
    w.addEventListener('click', (ev) => { if (ev.target === w || ev.target.closest('[data-v="0"]')) done(null); });
  });
}

// ============ Thư mục (mẹ – con) & nhật ký con ============
const saveFolders = () => kvSet('folders', S.folders).catch((e) => toast(e.message));
const folderById = (id) => S.folders.find((f) => f.id === id);
const byName = (a, b) => a.name.localeCompare(b.name, 'vi');
function folderPath(id) {
  const out = []; let f = folderById(id), guard = 0;
  while (f && guard++ < 30) { out.unshift(f); f = folderById(f.parentId); }
  return out;
}
const folderLabel = (id) => folderPath(id).map((f) => f.name).join(' / ');
const subFolders = (pid) => S.folders.filter((f) => (f.parentId || '') === (pid || '')).sort(byName);
function folderOptions(sel = '', excludeId = '') {
  const out = ['<option value="">— Không thư mục —</option>'];
  const walk = (pid, d) => subFolders(pid).forEach((f) => {
    if (f.id === excludeId) return;
    out.push(`<option value="${f.id}" ${f.id === sel ? 'selected' : ''}>${'   '.repeat(d)}📁 ${esc(f.name)}</option>`);
    walk(f.id, d + 1);
  });
  walk('', 0);
  return out.join('');
}
async function createFolder(parentId = '') {
  const name = await askText(parentId ? `Thư mục con trong “${esc(folderById(parentId)?.name || '')}”` : 'Tên thư mục mới', '', 'Tạo');
  if (!name) return null;
  const f = { id: 'f' + uid(), name, parentId: parentId || '' };
  S.folders.push(f);
  await saveFolders();
  return f;
}
async function renameFolder(id) {
  const f = folderById(id); if (!f) return;
  const name = await askText('Đổi tên thư mục', f.name);
  if (!name) return;
  f.name = name; await saveFolders(); rerender();
}
async function moveFolder(id) {
  const f = folderById(id); if (!f) return;
  openModal(`<div class="sheet-head"><h3>Chuyển “${esc(f.name)}” vào…</h3><button class="icon-btn" data-close>✕</button></div>
    <select id="mvSel">${folderOptions(f.parentId, f.id).replace('— Không thư mục —', '— Cấp ngoài cùng —')}</select>
    <div class="sheet-foot"><button class="btn primary" id="mvOk">Chuyển</button><button class="btn ghost" data-close>Huỷ</button></div>`);
  $('#mvOk').onclick = async () => { f.parentId = $('#mvSel').value; await saveFolders(); closeModal(); rerender(); };
}
async function deleteFolder(id) {
  const f = folderById(id); if (!f) return;
  const n = S.entries.filter((e) => e.folderId === id).length, k = subFolders(id).length;
  if (!(await askConfirm(`Xoá thư mục <b>${esc(f.name)}</b>?<br><br>${n || k ? `${n} mục và ${k} thư mục con bên trong sẽ được <b>chuyển lên thư mục cha</b> — không mất dữ liệu.` : 'Thư mục đang trống.'}`, '🗑 Xoá thư mục'))) return;
  S.folders.forEach((x) => { if (x.parentId === id) x.parentId = f.parentId || ''; });
  S.folders = S.folders.filter((x) => x.id !== id);
  await saveFolders();
  for (const e of S.entries.filter((e) => e.folderId === id)) { e.folderId = f.parentId || ''; await saveEntry(e); }
  toast('Đã xoá thư mục'); rerender();
}
function folderMenu(id) {
  const f = folderById(id); if (!f) return;
  openModal(`<div class="sheet-head"><h3>📁 ${esc(f.name)}</h3><button class="icon-btn" data-close>✕</button></div>
    <p class="muted small">${esc(folderLabel(id))}</p>
    <div class="menu-list">
      <button data-a="write">✏️ Viết mục mới vào đây</button>
      <button data-a="sub">📁 Tạo thư mục con</button>
      <button data-a="rename">🏷️ Đổi tên</button>
      <button data-a="move">📦 Chuyển vào thư mục khác</button>
      <button data-a="del" class="danger-text">🗑 Xoá thư mục</button>
    </div>`);
  $$('.menu-list button').forEach((b) => (b.onclick = async () => {
    const a = b.dataset.a; closeModal();
    if (a === 'write') openEditor(newEntry({ folderId: id }));
    if (a === 'sub') { const nf = await createFolder(id); if (nf) { openFolders.add(id); saveOpen(); rerender(); } }
    if (a === 'rename') renameFolder(id);
    if (a === 'move') moveFolder(id);
    if (a === 'del') deleteFolder(id);
  }));
}

const entryExists = (id) => S.entries.some((x) => x.id === id);
const childrenOf = (id) => S.entries.filter((e) => e.parentId === id).sort((a, b) => a.date.localeCompare(b.date));
function descendantIds(id, acc = new Set()) { for (const c of childrenOf(id)) if (!acc.has(c.id)) { acc.add(c.id); descendantIds(c.id, acc); } return acc; }
function parentOptions(e) {
  const bad = descendantIds(e.id); bad.add(e.id);
  const list = S.entries.filter((x) => !bad.has(x.id) && x.type !== 'link').slice(0, 300);
  if (e.parentId && !list.some((x) => x.id === e.parentId) && entryExists(e.parentId)) list.unshift(S.entries.find((x) => x.id === e.parentId));
  return '<option value="">— Không (mục độc lập) —</option>' + list.map((x) =>
    `<option value="${x.id}" ${x.id === e.parentId ? 'selected' : ''}>${TYPES[x.type]?.icon || ''} ${esc((x.title || plain(x.content).slice(0, 40) || 'Không tiêu đề').slice(0, 60))} · ${x.date.slice(0, 10).split('-').reverse().join('/')}</option>`).join('');
}

// Xoá một mục (dùng chung cho màn xem, trình soạn và kho link)
async function confirmDelete(id) {
  const e = S.entries.find((x) => x.id === id);
  if (!e) return false;
  const kids = childrenOf(id);
  const ok = await askConfirm(`Xoá <b>${esc(e.title || plain(e.content).slice(0, 50) || 'mục này')}</b>${e.photos.length ? ' cùng ảnh của nó' : ''}? Không hoàn tác được.${kids.length ? `<br><br>${kids.length} mục con sẽ được giữ lại và trở thành mục độc lập.` : ''}`, '🗑 Xoá');
  if (!ok) return false;
  try {
    await deleteEntry(id);
    for (const k of kids) { k.parentId = ''; await saveEntry(k); }
    closeModal(); toast('Đã xoá'); rerender();
    return true;
  } catch (err) { toast('Không xoá được: ' + err.message, 4000); return false; }
}

// ----- Chế độ xem theo thư mục -----
const openFolders = new Set((() => { try { return JSON.parse(localStorage.getItem('nk_open') || '[]'); } catch { return []; } })());
const saveOpen = () => { try { localStorage.setItem('nk_open', JSON.stringify([...openFolders])); } catch {} };
function entryRow(e) {
  const t = TYPES[e.type] || TYPES.ghichu, kids = childrenOf(e.id).length;
  const sub = plain(e.content).slice(0, 90) || (e.links[0] ? e.links[0].title || e.links[0].url : '');
  return `<div class="trow" data-id="${e.id}"><span class="ticon">${t.icon}</span>
    <div class="tmain"><div class="ttitle">${esc(e.title || sub || 'Không tiêu đề')}</div>
    <div class="tsub">${fmtDate(e.date)} · âm ${lun(e.date).text}${e.mood ? ' · ' + MOODS[e.mood] : ''}${e.photos.length ? ' · 🖼️' + e.photos.length : ''}${kids ? ` · 🧩 ${kids} mục con` : ''}${e.music ? ' · 🎵' : ''}</div></div></div>`;
}
function renderFolderView(list) {
  const filtering = !!(S.filter.q || S.filter.type || S.filter.tag);
  const inList = new Set(list.map((e) => e.id));
  const fid = (e) => (e.folderId && folderById(e.folderId) ? e.folderId : '');
  const isTop = (e) => !(e.parentId && inList.has(e.parentId));
  const topIn = (f) => list.filter((e) => fid(e) === f && isTop(e));
  const countIn = (f) => list.filter((e) => fid(e) === f).length + subFolders(f).reduce((s, x) => s + countIn(x.id), 0);
  const tree = (e, depth = 0) => {
    const kids = childrenOf(e.id).filter((k) => inList.has(k.id));
    return `<div class="tnode">${entryRow(e)}${kids.length && depth < 8 ? `<div class="tkids">${kids.map((k) => tree(k, depth + 1)).join('')}</div>` : ''}</div>`;
  };
  const node = (f) => {
    const c = countIn(f.id);
    if (filtering && !c) return '';
    const open = filtering || openFolders.has(f.id);
    const subs = subFolders(f.id), ents = topIn(f.id);
    return `<div class="fnode"><div class="frow" data-f="${f.id}"><span class="ftog">${open ? '▾' : '▸'}</span><span class="fname">📁 ${esc(f.name)}</span><span class="n">${c}</span><span class="grow"></span>
      <button class="icon-btn" data-fadd="${f.id}" title="Viết vào thư mục này">＋</button><button class="icon-btn" data-fmenu="${f.id}" title="Tuỳ chọn">⋯</button></div>
      ${open ? `<div class="fkids">${subs.map(node).join('')}${ents.map((e) => tree(e)).join('')}${!subs.length && !ents.length ? '<p class="muted small fempty">Thư mục trống — bấm ＋ để viết vào đây</p>' : ''}</div>` : ''}</div>`;
  };
  const loose = topIn('');
  $('#timeline').innerHTML = `<div class="row gap wrap" style="margin:6px 0 10px"><button class="btn ghost sm" id="fNew">＋ Thư mục mới</button>
      <button class="btn ghost sm" id="fOpenAll">Mở hết</button><button class="btn ghost sm" id="fCloseAll">Thu gọn</button></div>
    <div class="ftree">${subFolders('').map(node).join('') || (filtering ? '' : '<p class="muted small">Chưa có thư mục nào. Bấm “＋ Thư mục mới” để tạo, ví dụ: Công việc, Gia đình, Học tập…</p>')}
    ${loose.length ? `<div class="fnode"><div class="frow loose"><span class="fname">🗂️ Chưa xếp vào thư mục</span><span class="n">${loose.length}</span></div><div class="fkids">${loose.map((e) => tree(e)).join('')}</div></div>` : ''}</div>`;
  $('#fNew').onclick = async () => { if (await createFolder()) rerender(); };
  $('#fOpenAll').onclick = () => { S.folders.forEach((f) => openFolders.add(f.id)); saveOpen(); rerender(); };
  $('#fCloseAll').onclick = () => { openFolders.clear(); saveOpen(); rerender(); };
}
$('#timeline').addEventListener('click', (ev) => {
  const add = ev.target.closest('[data-fadd]'); if (add) return openEditor(newEntry({ folderId: add.dataset.fadd }));
  const menu = ev.target.closest('[data-fmenu]'); if (menu) return folderMenu(menu.dataset.fmenu);
  const fr = ev.target.closest('.frow[data-f]');
  if (fr) { const id = fr.dataset.f; openFolders.has(id) ? openFolders.delete(id) : openFolders.add(id); saveOpen(); return rerender(); }
  const tr = ev.target.closest('.trow'); if (tr) return openViewer(tr.dataset.id);
  const a = ev.target.closest('.entry'); if (a) openViewer(a.dataset.id);
});

// ============ Trình phát nhạc (file âm thanh trong Google Drive) ============
const Player = {
  list: [], at: 0, loaded: false, queue: [], idx: -1, cur: null, audio: new Audio(), url: null,
  shuffle: false, repeat: 'all', folder: '', q: '', loading: 0,
  async loadCache() {
    if (this.loaded) return;
    const c = await kvGet('music').catch(() => null);
    if (c) { this.list = c.list || []; this.at = c.at || 0; this.shuffle = !!c.shuffle; this.repeat = c.repeat || 'all'; }
    this.loaded = true;
  },
  saveCache() { return kvSet('music', { list: this.list, at: this.at, shuffle: this.shuffle, repeat: this.repeat }).catch(() => {}); },
  async scan() {
    await Drive.auth(true);
    const files = []; let pt = '';
    do {
      const d = await Drive.g('files?pageSize=1000&fields=nextPageToken,files(id,name,mimeType,size,parents)&q=' + encodeURIComponent("trashed=false and mimeType contains 'audio/'") + (pt ? '&pageToken=' + pt : ''));
      files.push(...(d.files || [])); pt = d.nextPageToken;
    } while (pt && files.length < 5000);
    const pids = [...new Set(files.map((f) => f.parents?.[0]).filter(Boolean))].slice(0, 300);
    const names = {};
    for (let i = 0; i < pids.length; i += 10) {
      await Promise.all(pids.slice(i, i + 10).map(async (id) => { try { names[id] = (await Drive.g(`files/${id}?fields=name`)).name; } catch { names[id] = 'Thư mục khác'; } }));
    }
    this.list = files.map((f) => ({ id: f.id, name: f.name.replace(/\.(mp3|m4a|aac|wav|ogg|flac|opus|wma)$/i, ''), size: +f.size || 0, folder: names[f.parents?.[0]] || 'Drive của tôi' }))
      .sort((a, b) => a.folder.localeCompare(b.folder, 'vi') || a.name.localeCompare(b.name, 'vi'));
    this.at = Date.now();
    await this.saveCache();
  },
  filtered() {
    const q = this.q.toLowerCase();
    return this.list.filter((t) => (!this.folder || t.folder === this.folder) && (!q || (t.name + ' ' + t.folder).toLowerCase().includes(q)));
  },
  playList(list, i = 0) { this.queue = list.slice(); this.play(i); },
  async play(i) {
    const t = this.queue[i]; if (!t) return;
    this.idx = i; this.cur = t;
    const my = ++this.loading;
    this.show(); this.ui('Đang tải bài…');
    try {
      await Drive.auth(true);
      const r = await Drive.g(`files/${t.id}?alt=media`, { raw: true });
      const blob = await r.blob();
      if (my !== this.loading) return; // đã bấm bài khác
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = URL.createObjectURL(blob);
      this.audio.src = this.url;
      await this.audio.play();
      this.ui();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: t.name, artist: t.folder, album: 'Nhật Ký Riêng', artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }] });
      }
    } catch (e) {
      if (my !== this.loading) return;
      this.ui('⚠️ ' + (/popup|đóng cửa sổ|hết hạn/i.test(e.message) ? 'Cần kết nối lại Google — bấm ▶ lần nữa' : e.message));
    }
    if (S.view === 'music') RENDER.music();
  },
  toggle() {
    if (!this.cur) return;
    if (!this.audio.src) return this.play(this.idx);
    this.audio.paused ? this.audio.play().catch(() => this.play(this.idx)) : this.audio.pause();
  },
  next(auto) {
    if (!this.queue.length) return;
    if (auto && this.repeat === 'one') { this.audio.currentTime = 0; return this.audio.play(); }
    let i;
    if (this.shuffle && this.queue.length > 1) { do { i = Math.floor(Math.random() * this.queue.length); } while (i === this.idx); }
    else i = this.idx + 1;
    if (i >= this.queue.length) { if (auto && this.repeat === 'off') return this.ui(); i = 0; }
    this.play(i);
  },
  prev() {
    if (this.audio.currentTime > 5) { this.audio.currentTime = 0; return; }
    this.play((this.idx - 1 + this.queue.length) % this.queue.length);
  },
  show() { $('#player').classList.remove('hidden'); document.body.classList.add('has-player'); },
  close() { this.audio.pause(); this.loading++; $('#player').classList.add('hidden'); document.body.classList.remove('has-player'); },
  ui(msg) {
    if (!this.cur) return;
    $('#plTitle').textContent = this.cur.name;
    $('#plSub').textContent = msg || `${this.cur.folder}${this.shuffle ? ' · 🔀' : ''}${this.repeat === 'one' ? ' · 🔂' : this.repeat === 'off' ? '' : ' · 🔁'}`;
    $('#plPlay').textContent = this.audio.paused ? '▶' : '⏸';
  },
  menu() {
    openModal(`<div class="sheet-head"><h3>🎵 ${esc(this.cur?.name || 'Trình phát')}</h3><button class="icon-btn" data-close>✕</button></div>
      <div class="menu-list">
        <button data-a="shuffle">🔀 Trộn bài: <b>${this.shuffle ? 'Bật' : 'Tắt'}</b></button>
        <button data-a="repeat">🔁 Lặp lại: <b>${{ all: 'Cả danh sách', one: 'Một bài', off: 'Không lặp' }[this.repeat]}</b></button>
        <button data-a="note">📝 Ghi nhật ký kèm bài này</button>
        <button data-a="list">📃 Mở danh sách nhạc</button>
        <button data-a="close" class="danger-text">⏹ Tắt trình phát</button>
      </div>`);
    $$('.menu-list button').forEach((b) => (b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'shuffle') { this.shuffle = !this.shuffle; this.saveCache(); this.ui(); return this.menu(); }
      if (a === 'repeat') { this.repeat = { all: 'one', one: 'off', off: 'all' }[this.repeat]; this.saveCache(); this.ui(); return this.menu(); }
      closeModal();
      if (a === 'note' && this.cur) openEditor(newEntry({ music: { id: this.cur.id, name: this.cur.name } }));
      if (a === 'list') go('music');
      if (a === 'close') this.close();
    }));
  },
  playById(id, name) {
    const i = this.list.findIndex((t) => t.id === id);
    if (i >= 0) this.playList(this.list.filter((t) => t.folder === this.list[i].folder), this.list.filter((t) => t.folder === this.list[i].folder).findIndex((t) => t.id === id));
    else this.playList([{ id, name, folder: 'Nhật ký' }], 0);
  },
};
Player.audio.preload = 'auto';
Player.audio.addEventListener('ended', () => Player.next(true));
Player.audio.addEventListener('play', () => Player.ui());
Player.audio.addEventListener('pause', () => Player.ui());
Player.audio.addEventListener('timeupdate', () => {
  const a = Player.audio; if (!a.duration) return;
  $('#plProg').style.width = (a.currentTime / a.duration) * 100 + '%';
});
if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', () => Player.toggle());
  ms.setActionHandler('pause', () => Player.toggle());
  ms.setActionHandler('previoustrack', () => Player.prev());
  ms.setActionHandler('nexttrack', () => Player.next());
}
$('#plPlay').addEventListener('click', () => Player.toggle());
$('#plNext').addEventListener('click', () => Player.next());
$('#plPrev').addEventListener('click', () => Player.prev());
$('#plMore').addEventListener('click', () => Player.menu());
$('#plBar').addEventListener('click', (ev) => {
  const a = Player.audio; if (!a.duration) return;
  const r = ev.currentTarget.getBoundingClientRect();
  a.currentTime = ((ev.clientX - r.left) / r.width) * a.duration;
});
const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB');

RENDER.music = async function () {
  await Player.loadCache();
  const box = $('#music');
  if (!Drive.clientId()) {
    box.innerHTML = '<div class="card"><p>Trình phát dùng nhạc trong <b>Google Drive</b> của bạn. Hãy kết nối Google Drive trước ở <a href="#settings">Cài đặt → Google Drive</a>.</p></div>';
    return;
  }
  if (!Player.list.length) {
    box.innerHTML = `<div class="card"><h3>🎵 Nghe nhạc từ Google Drive</h3>
      <p class="small">App sẽ tìm tất cả file âm thanh (MP3, M4A, WAV…) trong Drive của bạn và phát ngay trong app, kể cả khi đang viết nhật ký.</p>
      <p class="muted small">Google sẽ hỏi quyền <b>“Xem các tệp trên Google Drive”</b> (chỉ đọc) — cần quyền này để thấy nhạc bạn đã tải lên trước đây. App không sửa hay xoá file nhạc nào. Nếu đã bật <b>kết nối cố định</b> (Cài đặt → Google Drive), bạn chỉ phải cho phép 1 lần duy nhất.</p>
      <button class="btn primary" id="muScan">🔗 Kết nối & tìm nhạc trên Drive</button> <span class="muted small" id="muMsg"></span></div>`;
    $('#muScan').onclick = async () => {
      $('#muScan').disabled = true; $('#muMsg').textContent = 'Đang tìm nhạc…';
      try { await Player.scan(); toast(`Tìm thấy ${Player.list.length} bài`); RENDER.music(); }
      catch (e) { $('#muMsg').textContent = '⚠️ ' + e.message; $('#muScan').disabled = false; }
    };
    return;
  }
  const folders = {};
  Player.list.forEach((t) => (folders[t.folder] = (folders[t.folder] || 0) + 1));
  const list = Player.filtered();
  box.innerHTML = `
    <div class="filters">
      <input type="search" id="muSearch" placeholder="Tìm bài hát…" value="${esc(Player.q)}">
      <div class="chips" id="muFolders"><button data-f="" class="${!Player.folder ? 'on' : ''}">Tất cả<span class="n">${Player.list.length}</span></button>
        ${Object.entries(folders).map(([f, n]) => `<button data-f="${esc(f)}" class="${Player.folder === f ? 'on' : ''}">📁 ${esc(f)}<span class="n">${n}</span></button>`).join('')}</div>
    </div>
    <div class="row gap wrap" style="margin:8px 0 12px">
      <button class="btn primary sm" id="muAll">▶ Phát ${list.length} bài</button>
      <button class="btn ghost sm" id="muShuffle">🔀 Phát trộn</button>
      <span class="grow"></span>
      <button class="btn ghost sm" id="muRescan">🔄 Quét lại Drive</button>
    </div>
    <p class="muted small">Cập nhật danh sách: ${new Date(Player.at).toLocaleString('vi-VN')}. Có bài mới trên Drive thì bấm “Quét lại”.</p>
    <div class="tracks">${list.map((t, i) => `<div class="track ${Player.cur?.id === t.id ? 'on' : ''}" data-i="${i}">
      <span class="tk-ic">${Player.cur?.id === t.id ? (Player.audio.paused ? '⏸' : '🔊') : '▶'}</span>
      <div class="tk-main"><div class="tk-name">${esc(t.name)}</div><div class="tk-sub">${esc(t.folder)} · ${fmtSize(t.size)}</div></div></div>`).join('') || '<p class="empty">Không có bài nào khớp.</p>'}</div>`;
  $('#muSearch').addEventListener('input', debounce((ev) => { Player.q = ev.target.value.trim(); RENDER.music().then(() => { const s = $('#muSearch'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }); }, 250));
  $$('#muFolders button').forEach((b) => (b.onclick = () => { Player.folder = b.dataset.f; RENDER.music(); }));
  $('#muAll').onclick = () => { Player.shuffle = false; Player.playList(list, 0); };
  $('#muShuffle').onclick = () => { Player.shuffle = true; Player.saveCache(); Player.playList(list, Math.floor(Math.random() * list.length)); };
  $('#muRescan').onclick = async () => { $('#muRescan').disabled = true; $('#muRescan').textContent = 'Đang quét…'; try { await Player.scan(); toast(`${Player.list.length} bài`); } catch (e) { toast(e.message, 4000); } RENDER.music(); };
  $$('.track').forEach((el) => (el.onclick = () => {
    const i = +el.dataset.i;
    if (Player.cur?.id === list[i].id && Player.audio.src) return Player.toggle();
    Player.playList(list, i);
  }));
};
document.addEventListener('click', (ev) => { const a = ev.target.closest('[data-play]'); if (a) { ev.preventDefault(); Player.playById(a.dataset.play, a.dataset.name); } });

// ============ Tab Hôm nay: thời tiết, giao thông, xu hướng, tin nóng ============
const WMO = {
  0: ['Trời quang', '☀️', '🌙'], 1: ['Ít mây', '🌤️', '🌙'], 2: ['Có mây', '⛅', '☁️'], 3: ['Nhiều mây', '☁️'],
  45: ['Sương mù', '🌫️'], 48: ['Sương mù', '🌫️'], 51: ['Mưa phùn nhẹ', '🌦️'], 53: ['Mưa phùn', '🌦️'], 55: ['Mưa phùn dày', '🌧️'],
  56: ['Mưa phùn lạnh', '🌧️'], 57: ['Mưa phùn lạnh', '🌧️'], 61: ['Mưa nhỏ', '🌦️'], 63: ['Mưa vừa', '🌧️'], 65: ['Mưa to', '🌧️'],
  66: ['Mưa lạnh', '🌧️'], 67: ['Mưa lạnh to', '🌧️'], 71: ['Tuyết nhẹ', '🌨️'], 73: ['Tuyết', '🌨️'], 75: ['Tuyết dày', '❄️'], 77: ['Mưa tuyết', '🌨️'],
  80: ['Mưa rào nhẹ', '🌦️'], 81: ['Mưa rào', '🌧️'], 82: ['Mưa rào rất to', '⛈️'], 85: ['Tuyết rào', '🌨️'], 86: ['Tuyết rào', '❄️'],
  95: ['Dông', '⛈️'], 96: ['Dông, mưa đá', '⛈️'], 99: ['Dông, mưa đá lớn', '⛈️'],
};
const wx = (code, day = 1) => { const w = WMO[code] || ['—', '🌡️']; return { text: w[0], icon: !day && w[2] ? w[2] : w[1] }; };
const AQI = (v) => v <= 50 ? ['Tốt', '#2e9e5b'] : v <= 100 ? ['Trung bình', '#d9a400'] : v <= 150 ? ['Kém', '#e67e22'] : v <= 200 ? ['Xấu', '#d64545'] : v <= 300 ? ['Rất xấu', '#8e44ad'] : ['Nguy hại', '#7b3f00'];
const NEWS_CATS = [['hot', '🔥 Nổi bật'], ['thoi-su', 'Thời sự'], ['the-gioi', 'Thế giới'], ['kinh-doanh', 'Kinh doanh'], ['phap-luat', 'Pháp luật'], ['suc-khoe', 'Sức khỏe'], ['so-hoa', 'Công nghệ'], ['khoa-hoc', 'Khoa học'], ['the-thao', 'Thể thao'], ['giai-tri', 'Giải trí'], ['giao-duc', 'Giáo dục'], ['du-lich', 'Du lịch']];
const T = { wx: null, wxAt: 0, aq: null, news: {}, trends: null, traffic: null, cat: 'hot' };
const city = () => S.settings.city || { name: 'Hà Nội', lat: 21.0285, lon: 105.8542 };
const agoShort = (t) => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); return m < 60 ? `${Math.max(1, m)} phút` : m < 1440 ? `${Math.round(m / 60)} giờ` : `${Math.round(m / 1440)} ngày`; };

async function loadWeather(force) {
  const c = city();
  if (!force && T.wx && Date.now() - T.wxAt < 15 * 60000 && T.wxKey === c.lat + ',' + c.lon) return;
  const q = `latitude=${c.lat}&longitude=${c.lon}&timezone=auto`;
  const [w, a] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${q}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day,precipitation&hourly=temperature_2m,precipitation_probability,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset&forecast_days=7`).then((r) => r.json()),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}&current=us_aqi,pm2_5`).then((r) => r.json()).catch(() => null),
  ]);
  if (!w.current) throw new Error(w.reason || 'Không lấy được thời tiết');
  T.wx = w; T.aq = a; T.wxAt = Date.now(); T.wxKey = c.lat + ',' + c.lon;
}
function weatherAdvice() {
  const w = T.wx, d = w.daily, out = [];
  if (d.precipitation_probability_max[0] >= 60) out.push('☔ Khả năng mưa cao — nhớ mang ô / áo mưa');
  if (d.temperature_2m_max[0] >= 35) out.push('🥵 Nắng nóng — uống đủ nước, hạn chế ra ngoài buổi trưa');
  if (d.temperature_2m_min[0] <= 15) out.push('🧥 Trời lạnh — mặc ấm khi ra ngoài');
  if (d.uv_index_max[0] >= 8) out.push('🧴 Tia UV rất cao — che chắn, dùng kem chống nắng');
  const aqi = T.aq?.current?.us_aqi;
  if (aqi > 100) out.push('😷 Không khí kém — nên đeo khẩu trang, hạn chế tập ngoài trời');
  if ([95, 96, 99].includes(w.current.weather_code) || d.weather_code[0] >= 95) out.push('⚡ Có dông — tránh trú dưới cây to, cột điện');
  return out.length ? out : ['😊 Thời tiết khá dễ chịu — một ngày tốt để ra ngoài'];
}
function weatherHtml() {
  const w = T.wx, c = w.current, d = w.daily, cur = wx(c.weather_code, c.is_day);
  const aqi = T.aq?.current?.us_aqi, [aqiT, aqiC] = aqi != null ? AQI(aqi) : [];
  const nowH = new Date().getHours();
  const start = w.hourly.time.findIndex((t) => +t.slice(11, 13) >= nowH && t.slice(0, 10) === d.time[0]);
  const hours = w.hourly.time.slice(Math.max(0, start), Math.max(0, start) + 12).map((t, i) => {
    const j = Math.max(0, start) + i, h = wx(w.hourly.weather_code[j], w.hourly.is_day[j]);
    return `<div class="hr"><small>${i === 0 ? 'Bây giờ' : t.slice(11, 13) + 'h'}</small><span>${h.icon}</span><b>${Math.round(w.hourly.temperature_2m[j])}°</b><small class="rain">${w.hourly.precipitation_probability[j] >= 20 ? '💧' + w.hourly.precipitation_probability[j] + '%' : ''}</small></div>`;
  }).join('');
  const days = d.time.map((t, i) => { const x = wx(d.weather_code[i]); return `<div class="dy"><span class="dn">${i === 0 ? 'Hôm nay' : WD[parseDate(t).getDay()] + ' ' + parseDate(t).getDate()}</span><span>${x.icon}</span><span class="dt">${x.text}</span><span class="rain">${d.precipitation_probability_max[i] >= 20 ? '💧' + d.precipitation_probability_max[i] + '%' : ''}</span><span class="tr"><b>${Math.round(d.temperature_2m_max[i])}°</b> ${Math.round(d.temperature_2m_min[i])}°</span></div>`; }).join('');
  return `<div class="wx-card ${c.is_day ? 'day' : 'night'}">
    <div class="wx-top"><div><div class="wx-city">📍 ${esc(city().name)} <button class="link-btn" id="wxCity">Đổi</button></div>
      <div class="wx-now"><span class="wx-icon">${cur.icon}</span><span class="wx-temp">${Math.round(c.temperature_2m)}°</span></div>
      <div class="wx-desc">${cur.text} · cảm giác ${Math.round(c.apparent_temperature)}°</div></div>
      <div class="wx-side"><div>💧 Độ ẩm ${c.relative_humidity_2m}%</div><div>🌬️ Gió ${Math.round(c.wind_speed_10m)} km/h</div><div>🔆 UV ${Math.round(d.uv_index_max[0])}</div>
        <div>🌅 ${d.sunrise[0].slice(11)} · 🌇 ${d.sunset[0].slice(11)}</div>
        ${aqi != null ? `<div class="aqi" style="--aq:${aqiC}">Không khí: <b>${aqi}</b> ${aqiT}${T.aq.current.pm2_5 != null ? ` · PM2.5 ${Math.round(T.aq.current.pm2_5)}` : ''}</div>` : ''}</div></div>
    <div class="wx-advice">${weatherAdvice().map((a) => `<div>${a}</div>`).join('')}</div>
    <div class="wx-hours">${hours}</div>
    <details class="wx-days"><summary>Dự báo 7 ngày</summary>${days}</details>
    <div class="row gap wrap" style="margin-top:10px"><button class="btn ghost sm" id="wxNote">📝 Ghi nhật ký kèm thời tiết</button><span class="muted small grow" style="text-align:right">Nguồn: Open-Meteo · cập nhật ${agoShort(T.wxAt)} trước</span></div>
  </div>`;
}
const newsItem = (it, i) => `<div class="nw" data-i="${i}">
  ${it.img ? `<img src="${esc(it.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
  <div class="nw-main"><a href="${esc(it.link)}" target="_blank" rel="noopener" class="nw-t">${esc(it.title)}</a>
  ${it.desc ? `<div class="nw-d">${esc(it.desc)}</div>` : ''}
  <div class="nw-m">${esc(it.source || '')}${it.date ? ' · ' + agoShort(it.date) + ' trước' : ''} <button class="link-btn" data-save="${i}">🔖 Lưu</button></div></div></div>`;

async function loadNews(cat, force) {
  if (!force && T.news[cat] && Date.now() - T.news[cat].at < 10 * 60000) return T.news[cat];
  const d = await api('/api/news?kind=' + cat);
  T.news[cat] = { ...d, at: Date.now() };
  return T.news[cat];
}

RENDER.today = async function (force) {
  const box = $('#today'), l = lun(localISO());
  $('#todaySub').textContent = `${longDate(localISO())} · 🌙 ${l.text} âm lịch, năm ${l.yearCC}`;
  box.innerHTML = `
    <div id="tdWx"><div class="card skel">Đang tải thời tiết…</div></div>
    <div class="td-grid">
      <div>${todayCard()}
        <div class="card"><div class="row gap"><h3 class="grow">🚦 Giao thông ${esc(city().name)}</h3></div>
          <div class="row gap wrap" style="margin-bottom:8px"><a class="btn ghost sm" target="_blank" rel="noopener" href="https://www.google.com/maps/@${city().lat},${city().lon},13z/data=!5m1!1e1">🗺️ Bản đồ kẹt xe trực tiếp</a>
          <a class="btn ghost sm" target="_blank" rel="noopener" href="https://vovgiaothong.vn">📻 VOV Giao thông</a></div>
          <div id="tdTraffic" class="nw-list"><p class="muted small">Đang tải tin giao thông…</p></div></div>
        <div class="card"><h3>📈 Mọi người đang tìm gì</h3><div id="tdTrends"><p class="muted small">Đang tải xu hướng…</p></div></div>
      </div>
      <div>
        <div class="card brief"><div class="row gap"><h3 class="grow">✨ Bản tin 1 phút</h3><button class="btn primary sm" id="tdBrief">Tóm tắt bằng AI</button></div><div id="tdBriefOut" class="md small muted">AI đọc tin nóng và thời tiết, tóm tắt thành vài dòng cho bạn.</div></div>
        <div class="card"><h3>📰 Tin nóng hôm nay</h3>
          <div class="chips news-cats" id="tdCats">${NEWS_CATS.map(([k, t]) => `<button data-c="${k}" class="${T.cat === k ? 'on' : ''}">${t}</button>`).join('')}</div>
          <div id="tdNews" class="nw-list"><p class="muted small">Đang tải tin…</p></div></div>
      </div>
    </div>`;

  loadWeather(force).then(() => {
    $('#tdWx').innerHTML = weatherHtml();
    $('#wxCity').onclick = chooseCity;
    $('#wxNote').onclick = () => { const c = T.wx.current, x = wx(c.weather_code, c.is_day); openEditor(newEntry({ content: `${x.icon} ${x.text}, ${Math.round(c.temperature_2m)}°C tại ${city().name}.\n\n` }), { focus: true }); };
  }).catch((e) => { $('#tdWx').innerHTML = `<div class="card"><p class="err">Không tải được thời tiết: ${esc(e.message)}</p><button class="btn ghost sm" id="wxCity">📍 Chọn nơi khác</button></div>`; $('#wxCity').onclick = chooseCity; });

  const bindSave = (el, items) => el.querySelectorAll('[data-save]').forEach((b) => (b.onclick = (ev) => { ev.preventDefault(); openLinkEditor({ url: items[+b.dataset.save].link, title: items[+b.dataset.save].title }); }));
  const showNews = async (cat, f) => {
    T.cat = cat;
    $$('#tdCats button').forEach((b) => b.classList.toggle('on', b.dataset.c === cat));
    $('#tdNews').innerHTML = '<p class="muted small">Đang tải tin…</p>';
    try {
      const d = await loadNews(cat, f);
      $('#tdNews').innerHTML = d.items.length ? d.items.slice(0, 25).map(newsItem).join('') : '<p class="muted small">Chưa lấy được tin, thử lại sau.</p>';
      bindSave($('#tdNews'), d.items);
    } catch (e) { $('#tdNews').innerHTML = `<p class="err small">${esc(e.message)}</p>`; }
  };
  $$('#tdCats button').forEach((b) => (b.onclick = () => showNews(b.dataset.c)));
  showNews(T.cat, force);

  api('/api/news?kind=traffic&city=' + encodeURIComponent(city().name.replace(/^(Thành phố|TP\.?)\s*/i, ''))).then((d) => {
    $('#tdTraffic').innerHTML = d.items.length ? d.items.slice(0, 8).map(newsItem).join('') : '<p class="muted small">Không có tin giao thông mới trong 2 ngày qua 👍</p>';
    bindSave($('#tdTraffic'), d.items);
  }).catch((e) => ($('#tdTraffic').innerHTML = `<p class="err small">${esc(e.message)}</p>`));

  api('/api/news?kind=trends').then((d) => {
    T.trends = d;
    if (d.items?.length) {
      $('#tdTrends').innerHTML = `<div class="trends">${d.items.map((t, i) => `<a class="trend" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(t.title)}">
        <span class="tr-n">${i + 1}</span><span class="tr-t">${esc(t.title)}${t.news?.[0] ? `<small>${esc(t.news[0].title)}</small>` : ''}</span>${t.traffic ? `<span class="tr-v">${esc(t.traffic)}</span>` : ''}</a>`).join('')}</div>`;
    } else if (d.fallback?.length) {
      $('#tdTrends').innerHTML = '<p class="muted small">Google Trends tạm không phản hồi — đây là tin được quan tâm:</p>' + d.fallback.slice(0, 8).map(newsItem).join('');
    } else $('#tdTrends').innerHTML = '<p class="muted small">Chưa lấy được xu hướng.</p>';
  }).catch((e) => ($('#tdTrends').innerHTML = `<p class="err small">${esc(e.message)}</p>`));

  $('#tdBrief').onclick = async () => {
    const out = $('#tdBriefOut'); out.classList.remove('muted'); out.classList.add('typing'); out.innerHTML = '';
    try {
      const hot = await loadNews('hot');
      const w = T.wx ? (() => { const c = T.wx.current, d = T.wx.daily; return `${city().name}: ${wx(c.weather_code).text}, ${Math.round(c.temperature_2m)}°C (cao ${Math.round(d.temperature_2m_max[0])}°, thấp ${Math.round(d.temperature_2m_min[0])}°, mưa ${d.precipitation_probability_max[0]}%), AQI ${T.aq?.current?.us_aqi ?? '?'}`; })() : '';
      const trends = (T.trends?.items || []).slice(0, 10).map((t) => t.title).join(', ');
      await aiStream({
        system: systemPrompt() + '\nNhiệm vụ: viết “Bản tin 1 phút” buổi sáng thân thiện. Gồm: 1 câu thời tiết + lời khuyên; 5 tin đáng chú ý nhất (mỗi tin 1 dòng, **in đậm** ý chính, không bịa thêm chi tiết ngoài tiêu đề/mô tả); 1 dòng "Mọi người đang quan tâm"; kết bằng 1 câu động viên ngắn. Tối đa 170 chữ.',
        messages: [{ role: 'user', text: `THỜI TIẾT: ${w}\nXU HƯỚNG TÌM KIẾM: ${trends}\nTIN NỔI BẬT:\n${hot.items.slice(0, 25).map((x) => `- ${x.title} (${x.source})${x.desc ? ': ' + x.desc : ''}`).join('\n')}` }],
        onText: (t) => (out.innerHTML = md(t)),
      });
    } catch (e) { out.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
    out.classList.remove('typing');
  };
};
$('#todayRefresh').addEventListener('click', () => { T.news = {}; RENDER.today(true); });

function chooseCity() {
  openModal(`<div class="sheet-head"><h3>📍 Chọn nơi xem thời tiết</h3><button class="icon-btn" data-close>✕</button></div>
    <button class="btn primary" id="cHere">📍 Dùng vị trí hiện tại</button>
    <label class="lbl">Hoặc tìm thành phố / quận</label><input id="cQ" placeholder="vd: Đà Nẵng, Hoàng Mai, Sài Gòn">
    <div class="suggest hidden" id="cSug"></div>
    <div class="chips" style="margin-top:12px">${[['Hà Nội', 21.0285, 105.8542], ['TP. Hồ Chí Minh', 10.7769, 106.7009], ['Đà Nẵng', 16.0544, 108.2022], ['Hải Phòng', 20.8449, 106.6881], ['Cần Thơ', 10.0452, 105.7469]].map(([n, a, o]) => `<button data-n="${n}" data-a="${a}" data-o="${o}">${n}</button>`).join('')}</div>`);
  const pick = (c) => { S.settings.city = c; saveSettings(); closeModal(); T.wx = null; RENDER.today(); };
  $$('#sheet [data-n]').forEach((b) => (b.onclick = () => pick({ name: b.dataset.n, lat: +b.dataset.a, lon: +b.dataset.o })));
  $('#cHere').onclick = async () => {
    $('#cHere').textContent = 'Đang lấy vị trí…';
    try { const c = await currentPosition(); const name = (await reverseGeo(c.latitude, c.longitude)).split(',').slice(-2).join(',').trim(); pick({ name: name || 'Vị trí của tôi', lat: +c.latitude.toFixed(4), lon: +c.longitude.toFixed(4) }); }
    catch (e) { toast(e.message); $('#cHere').textContent = '📍 Dùng vị trí hiện tại'; }
  };
  $('#cQ').addEventListener('input', debounce(async () => {
    const q = $('#cQ').value.trim(); if (q.length < 2) return;
    try {
      const d = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=vi&format=json`)).json();
      const res = d.results || [];
      $('#cSug').innerHTML = res.length ? res.map((r, i) => `<div data-i="${i}">${esc(r.name)}${r.admin1 ? ', ' + esc(r.admin1) : ''}${r.country ? ' · ' + esc(r.country) : ''}</div>`).join('') : '<div>Không tìm thấy</div>';
      $('#cSug').classList.remove('hidden');
      $$('#cSug [data-i]').forEach((el) => (el.onclick = () => { const r = res[+el.dataset.i]; pick({ name: r.name, lat: r.latitude, lon: r.longitude }); }));
    } catch {}
  }, 400));
}

// ============ Kho link ============
const LINK_CATS = [
  ['Khoa học', '🔬'], ['Công nghệ & AI', '💻'], ['Tài chính & Đầu tư', '📈'], ['Kinh doanh & Khởi nghiệp', '💼'],
  ['Sức khỏe & Thể thao', '🩺'], ['Tâm lý & Phát triển bản thân', '🧠'], ['Giáo dục & Kỹ năng', '🎓'], ['Lịch sử & Văn hóa', '🏛️'],
  ['Tin tức & Thời sự', '📰'], ['Nấu ăn', '🍳'], ['Du lịch', '✈️'], ['Gia đình & Nuôi dạy con', '👨‍👩‍👧'],
  ['Giải trí & Âm nhạc', '🎬'], ['Tâm linh & Tử vi', '🔮'], ['Khác', '📦'],
];
const PLATS = { youtube: '▶ YouTube', facebook: 'f Facebook', tiktok: '♪ TikTok', instagram: '◎ Instagram', x: '𝕏', web: '🌐 Web' };
const STATUS = { later: ['📌', 'Xem sau'], done: ['✅', 'Đã xem'], fav: ['⭐', 'Yêu thích'] };
const linkFilter = { q: '', cat: '', plat: '' };
const allCats = () => {
  const custom = (S.settings.linkCats || '').split(',').map((x) => x.trim()).filter(Boolean);
  const used = S.entries.map((e) => e.category).filter(Boolean);
  const names = [...LINK_CATS.map((c) => c[0])];
  [...custom, ...used].forEach((c) => { if (!names.includes(c)) names.splice(names.length - 1, 0, c); });
  return names;
};
const catIcon = (c) => (LINK_CATS.find((x) => x[0] === c) || [0, '🏷️'])[1];
function platformOf(url) {
  let h = '';
  try { h = new URL(url).hostname.replace(/^www\.|^m\.|^mobile\./, ''); } catch {}
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(h)) return 'youtube';
  if (/(^|\.)facebook\.com$|^fb\.watch$|^fb\.com$/.test(h)) return 'facebook';
  if (/(^|\.)tiktok\.com$/.test(h)) return 'tiktok';
  if (/(^|\.)instagram\.com$/.test(h)) return 'instagram';
  if (/^(x|twitter)\.com$/.test(h)) return 'x';
  return 'web';
}
function ytId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('youtu.be')) return u.pathname.slice(1).split('/')[0];
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]{6,})/);
    return m ? m[2] : '';
  } catch { return ''; }
}
const isLinkEntry = (e) => e.type === 'link' && e.links.length;
const firstUrl = (text = '') => (text.match(URL_RE) || [])[0] || '';

// AI chỉ gợi ý phân loại + thẻ dựa trên tiêu đề/mô tả/ghi chú (không xem video, không đọc trang)
async function suggestCategory(meta, note = '') {
  const cats = allCats();
  const r = await aiJSON({
    system: `Phân loại một link người dùng lưu lại. Chỉ dựa vào tiêu đề, kênh, mô tả và ghi chú. Trả JSON {"category": "đúng MỘT trong: ${cats.join(' | ')}", "tags": ["1-3 thẻ chữ thường ngắn gọn"]}`,
    messages: [{ role: 'user', text: `Nền tảng: ${meta.platform || platformOf(meta.url)}\nTiêu đề: ${meta.title || ''}\nKênh/Tác giả: ${meta.author || ''}\nMô tả: ${(meta.desc || '').slice(0, 500)}\nGhi chú: ${note}\nLink: ${meta.url}` }],
  });
  return { category: cats.includes(r.category) ? r.category : '', tags: (r.tags || []).map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 3) };
}
const autoCat = () => S.cfg.aiReady && S.settings.linkAutoAI !== false;

function openLinkEditor({ entry, url = '', note = '', title = '' } = {}) {
  const isNew = !entry || !S.entries.some((x) => x.id === entry.id);
  const e = structuredClone(entry || newEntry({ type: 'link', content: note, status: 'later' }));
  e.type = 'link';
  let meta = e.links[0] || (url ? { url, title } : null);
  openModal(`
    <div class="sheet-head"><h3>${isNew ? '📚 Lưu link' : '📚 Sửa link'}</h3><button class="icon-btn" id="leClose">✕</button></div>
    <div class="row gap"><input id="leUrl" placeholder="Dán link Facebook, YouTube, TikTok, bài báo…" value="${esc(meta?.url || '')}"><button class="btn ghost" id="leFetch">Lấy thông tin</button></div>
    <div id="lePrev"></div>
    <label class="lbl">Tiêu đề</label>
    <input id="leTitle" value="${esc(e.title || meta?.title || '')}" placeholder="Tiêu đề">
    <label class="lbl">📝 Ghi chú — link này nói gì, vì sao bạn lưu</label>
    <textarea id="leNote" rows="4" placeholder="Vd: Video giải thích lỗ đen, đoạn 5:30 hay nhất. Xem lại khi dạy con.">${esc(e.content || '')}</textarea>
    <button class="btn ghost sm" id="leMic" style="margin-top:6px">🎙️ Nói</button>
    <div class="row gap" style="margin-top:12px"><label class="lbl grow" style="margin:0">Phân loại</label><button class="btn ghost sm" id="leAI">✨ Gợi ý phân loại</button></div>
    <div class="chips le-cats" id="leCats" style="margin-top:6px"></div>
    <label class="lbl">Trạng thái</label>
    <div class="chips le-status" id="leStatus">${Object.entries(STATUS).map(([k, [i, n]]) => `<button data-s="${k}">${i} ${n}</button>`).join('')}</div>
    <label class="lbl">Thẻ</label>
    <input id="leTags" value="${esc(e.tags.join(', '))}" placeholder="vd: vũ trụ, dạy con">
    <label class="lbl">📁 Thư mục</label>
    <select id="leFolder">${folderOptions(e.folderId)}</select>
    <label class="lbl">Ngày lưu</label>
    <input type="datetime-local" id="leDate" value="${esc(e.date)}" style="max-width:220px">
    <div class="sheet-foot">
      <button class="btn primary" id="leSave">Lưu</button>
      <button class="btn ghost" data-close>Huỷ</button>
      <span class="grow"></span>
      ${isNew ? '' : '<button class="btn danger" id="leDel">Xoá</button>'}
    </div>`);
  const sheet = $('#sheet');
  sheet.addEventListener('input', () => sheet.setAttribute('data-dirty', '1'));
  $('#leClose').onclick = async () => { if (!sheet.hasAttribute('data-dirty') || (await askConfirm('Bỏ các thay đổi chưa lưu?', 'Bỏ thay đổi'))) closeModal(); };
  let userPicked = !!e.category;
  const drawCats = () => {
    $('#leCats').innerHTML = allCats().map((c) => `<button data-c="${esc(c)}" class="${e.category === c ? 'on' : ''}">${catIcon(c)} ${esc(c)}</button>`).join('');
    $$('#leCats button').forEach((b) => (b.onclick = () => { e.category = e.category === b.dataset.c ? '' : b.dataset.c; userPicked = true; drawCats(); }));
    $('#leCats .on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  };
  const drawStatus = () => $$('#leStatus button').forEach((b) => {
    b.classList.toggle('on', e.status === b.dataset.s);
    b.onclick = () => { e.status = e.status === b.dataset.s ? '' : b.dataset.s; drawStatus(); };
  });
  const drawPrev = () => {
    $('#lePrev').innerHTML = meta?.url ? linkCard(meta) + (meta.author ? `<p class="muted small" style="margin:4px 0 0">Kênh / tác giả: ${esc(meta.author)}</p>` : '') : '';
  };
  drawCats(); drawStatus(); drawPrev();
  $('#leMic').onclick = () => dictate($('#leNote'), $('#leMic'));

  const fetchMeta = async () => {
    let u = $('#leUrl').value.trim();
    if (!u) return;
    if (!/^https?:\/\//.test(u)) u = 'https://' + u;
    $('#leFetch').disabled = true; $('#leFetch').textContent = 'Đang lấy…';
    const old = meta?.title || '';
    meta = await unfurl(u);
    meta.platform ||= platformOf(u);
    meta.src = u;
    if (!$('#leTitle').value.trim() || $('#leTitle').value === old) $('#leTitle').value = meta.title || '';
    $('#leFetch').disabled = false; $('#leFetch').textContent = 'Lấy thông tin';
    drawPrev();
  };
  $('#leFetch').onclick = fetchMeta;
  $('#leUrl').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); fetchMeta(); } });

  const suggest = async (quiet) => {
    if (!meta?.url) return quiet || toast('Dán link trước đã');
    const b = $('#leAI'); b.disabled = true; b.textContent = '✨ Đang gợi ý…';
    try {
      const r = await suggestCategory({ ...meta, title: $('#leTitle').value || meta.title }, $('#leNote').value.trim());
      if (r.category && (!userPicked || !quiet)) { e.category = r.category; drawCats(); }
      const cur = $('#leTags').value.split(',').map((x) => x.trim()).filter(Boolean);
      if (!cur.length || !quiet) $('#leTags').value = [...new Set([...cur, ...r.tags])].join(', ');
    } catch (err) { if (!quiet) toast(err.message); }
    if ($('#leAI')) { b.disabled = false; b.textContent = '✨ Gợi ý phân loại'; }
  };
  $('#leAI').onclick = () => suggest(false);

  $('#leSave').onclick = async () => {
    const typed = $('#leUrl').value.trim();
    if (typed && (!meta || ![meta.src, meta.url].includes(typed))) await fetchMeta();
    if (!meta?.url) return toast('Chưa có link');
    e.links = [meta, ...e.links.slice(1)];
    e.title = $('#leTitle').value.trim() || meta.title || '';
    e.content = $('#leNote').value;
    e.date = $('#leDate').value || localISO();
    e.folderId = $('#leFolder').value;
    e.tags = [...new Set($('#leTags').value.split(',').map((x) => x.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))];
    $('#leSave').disabled = true;
    try { await saveEntry(e); closeModal(); toast('Đã lưu link ✓'); rerender(); }
    catch (err) { toast(err.message); $('#leSave').disabled = false; }
  };
  if (!isNew) $('#leDel').onclick = () => confirmDelete(e.id);
  (async () => {
    if (url && !e.links.length) await fetchMeta();
    if (isNew && url && !e.category && autoCat()) suggest(true);
    setTimeout(() => $('#leNote')?.focus(), 80);
  })();
}

// Lưu nhanh (một hay nhiều link, mỗi dòng một link): lưu ngay, không mở hộp thoại
async function quickSaveLinks(text) {
  const urls = [...new Set(text.match(URL_RE) || [])];
  if (!urls.length) return toast('Không thấy link nào');
  const note = urls.length === 1 ? text.replace(URL_RE, '').trim() : '';
  let n = 0;
  for (const u of urls) {
    const meta = await unfurl(u);
    meta.platform ||= platformOf(u);
    const e = newEntry({ type: 'link', title: meta.title, links: [meta], status: 'later', content: note });
    if (autoCat()) {
      try { const r = await suggestCategory(meta, note); e.category = r.category; e.tags = r.tags; } catch {}
    }
    await saveEntry(e);
    n++;
    if (S.view === 'links') RENDER.links();
  }
  toast(`Đã lưu ${n} link ✓ — bấm vào link để thêm ghi chú`, 3500);
}

function linkMatches(e) {
  const { q, cat, plat } = linkFilter;
  const l = e.links[0];
  if (cat && e.category !== cat) return false;
  if (plat && (l.platform || platformOf(l.url)) !== plat) return false;
  if (q) {
    const hay = [e.title, e.summary, e.content, e.category, e.tags.join(' '), l.title, l.author, l.site, l.url].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  }
  return true;
}
RENDER.links = function () {
  const all = S.entries.filter(isLinkEntry);
  const count = (fn) => all.filter(fn).length;
  $('#linkCount').textContent = `${all.length} link đã lưu · ${count((e) => e.status === 'later')} đang chờ xem · ${count((e) => e.status === 'fav')} yêu thích`;
  const cats = allCats().filter((c) => count((e) => e.category === c));
  const uncategorized = count((e) => !e.category);
  $('#linkCats').innerHTML = `<button data-c="" class="${!linkFilter.cat ? 'on' : ''}">Tất cả chủ đề<span class="n">${all.length}</span></button>` +
    cats.map((c) => `<button data-c="${esc(c)}" class="${linkFilter.cat === c ? 'on' : ''}">${catIcon(c)} ${esc(c)}<span class="n">${count((e) => e.category === c)}</span></button>`).join('') +
    (uncategorized ? `<span class="muted small" style="align-self:center">· ${uncategorized} chưa phân loại</span>` : '');
  const plats = Object.keys(PLATS).filter((p) => count((e) => (e.links[0].platform || platformOf(e.links[0].url)) === p));
  $('#linkPlat').innerHTML = `<button data-p="" class="${!linkFilter.plat ? 'on' : ''}">Mọi nguồn</button>` +
    plats.map((p) => `<button data-p="${p}" class="${linkFilter.plat === p ? 'on' : ''}">${PLATS[p]}</button>`).join('') +
    Object.entries(STATUS).map(([k, [i, n]]) => `<button data-st="${k}" class="${linkFilter.st === k ? 'on' : ''}">${i} ${n}</button>`).join('');
  $$('#linkCats button').forEach((b) => (b.onclick = () => { linkFilter.cat = b.dataset.c; RENDER.links(); }));
  $$('#linkPlat [data-p]').forEach((b) => (b.onclick = () => { linkFilter.plat = b.dataset.p; RENDER.links(); }));
  $$('#linkPlat [data-st]').forEach((b) => (b.onclick = () => { linkFilter.st = linkFilter.st === b.dataset.st ? '' : b.dataset.st; RENDER.links(); }));

  const list = all.filter(linkMatches).filter((e) => !linkFilter.st || e.status === linkFilter.st);
  $('#linkShown').textContent = list.length !== all.length ? `Đang hiện ${list.length}/${all.length} link` : '';
  $('#linkGrid').innerHTML = list.length ? list.map((e) => {
    const l = e.links[0], p = l.platform || platformOf(l.url);
    const sum = plain(e.content || e.summary || l.desc || '').trim();
    return `<article class="lk" data-id="${e.id}">
      <div class="lk-thumb" ${l.image ? `style="background-image:url('${esc(l.image)}')"` : ''}>${l.image ? '' : catIcon(e.category)}
        <span class="lk-plat ${p}">${PLATS[p]}</span>${e.status ? `<span class="lk-status" title="${STATUS[e.status][1]}">${STATUS[e.status][0]}</span>` : ''}</div>
      <div class="lk-body">
        <div class="lk-title">${esc(e.title || l.title || l.url)}</div>
        ${sum ? `<div class="lk-sum">${esc(sum.slice(0, 240))}</div>` : ''}
        <div class="lk-meta">${e.category ? `<span class="cat">${catIcon(e.category)} ${esc(e.category)}</span>` : ''}<span>${fmtDate(e.date)}</span>${l.author ? `<span>· ${esc(l.author)}</span>` : ''}</div>
      </div></article>`;
  }).join('') : `<div class="empty"><b>📚</b>${all.length ? 'Không có link nào khớp bộ lọc.' : 'Chưa lưu link nào.<br>Dán link Facebook, YouTube hay bài báo vào ô phía trên.'}</div>`;
  $$('#linkGrid .lk').forEach((c) => (c.onclick = () => openViewer(c.dataset.id)));
};
$('#linkAdd').addEventListener('click', () => openLinkEditor());
const linkQuick = () => { const t = $('#linkQuick').value.trim(); if (!t) return; $('#linkQuick').value = ''; quickSaveLinks(t); };
$('#linkQuickBtn').addEventListener('click', linkQuick);
$('#linkQuick').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); linkQuick(); } });
$('#linkQuick').addEventListener('paste', () => setTimeout(() => { if (/^https?:\/\/\S+$/.test($('#linkQuick').value.trim())) linkQuick(); }, 50));
$('#linkSearch').addEventListener('input', debounce((ev) => { linkFilter.q = ev.target.value.trim(); RENDER.links(); }, 200));
$('#linkAI').addEventListener('click', async () => {
  const list = S.entries.filter(isLinkEntry).filter(linkMatches).filter((e) => !linkFilter.st || e.status === linkFilter.st);
  if (!list.length) return toast('Không có link nào để tổng hợp');
  const card = $('#linkAIcard'), out = $('#linkAIout');
  card.classList.remove('hidden'); out.classList.add('typing'); out.innerHTML = '';
  const ctx = list.slice(0, 300).map((e) => `- [${e.date.slice(0, 10)}] (${e.category || 'chưa phân loại'}${e.status ? ', ' + STATUS[e.status][1] : ''}) ${e.title}${e.links[0].author ? ' — ' + e.links[0].author : ''} — ${e.links[0].url}${e.content ? '\n  Ghi chú: ' + e.content.slice(0, 400) : ''}`).join('\n');
  try {
    await aiStream({
      system: systemPrompt() + '\nNhiệm vụ: điểm lại KHO LINK người dùng đã lưu (dựa trên tiêu đề, chủ đề và ghi chú của họ — không có nội dung chi tiết của link, đừng bịa). Gồm: ## Bạn đang quan tâm gì (theo chủ đề), ## Link đang chờ xem nên ưu tiên, ## Những ghi chú đáng chú ý, ## Gợi ý sắp xếp lại kho link.',
      messages: [{ role: 'user', text: `Bộ lọc: ${linkFilter.cat || 'mọi chủ đề'}, ${linkFilter.plat || 'mọi nguồn'}${linkFilter.q ? ', từ khoá ' + linkFilter.q : ''}.\n\nDANH SÁCH LINK:\n${ctx}` }],
      onText: (t) => (out.innerHTML = md(t)),
    });
  } catch (err) { out.innerHTML = `<p class="err">${esc(err.message)}</p>`; }
  out.classList.remove('typing');
});

// Nhận link được chia sẻ từ app khác (Android) hoặc từ bookmarklet
function handleSharedLink() {
  const q = new URLSearchParams(location.search);
  const url = q.get('url') || firstUrl(q.get('text') || '') || firstUrl(q.get('title') || '');
  if (!url) return;
  const note = (q.get('text') || '').replace(url, '').trim();
  history.replaceState(null, '', '/#links');
  go('links');
  openLinkEditor({ url, note, title: q.get('title') || '' });
}

// ============ Bản đồ ============
let bigMap, mapLayer, leafletP;
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  return (leafletP ||= new Promise((ok, no) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(l);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = ok; s.onerror = () => { leafletP = null; no(new Error('Không tải được bản đồ')); };
    document.head.appendChild(s);
  }));
}
RENDER.map = async function () {
  try { await loadLeaflet(); } catch {}
  const withLoc = S.entries.filter((e) => e.location && isFinite(e.location.lat));
  $('#mapCount').textContent = `${withLoc.length} mục có vị trí · ${new Set(withLoc.map((e) => shortPlace(e.location.name))).size} nơi`;
  if (!window.L) { $('#map').innerHTML = '<p class="empty">Không tải được bản đồ (kiểm tra mạng).</p>'; return; }
  if (!bigMap) {
    bigMap = L.map('map').setView([16.0, 106.0], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(bigMap);
    mapLayer = L.layerGroup().addTo(bigMap);
  }
  mapLayer.clearLayers();
  const pts = [];
  for (const e of withLoc) {
    const mk = L.marker([e.location.lat, e.location.lng]).addTo(mapLayer);
    mk.bindPopup(`<b>${TYPES[e.type]?.icon || ''} ${esc(e.title || plain(e.content).slice(0, 50) || 'Không tiêu đề')}</b><br><small>${fmtDate(e.date)} · ${esc(shortPlace(e.location.name))}</small><br><a href="#" data-open="${e.id}">Mở</a>`);
    pts.push([e.location.lat, e.location.lng]);
  }
  setTimeout(() => { bigMap.invalidateSize(); if (pts.length) bigMap.fitBounds(pts, { padding: [40, 40], maxZoom: 14 }); }, 60);
  // Danh sách nơi chốn
  const places = {};
  withLoc.forEach((e) => { const k = shortPlace(e.location.name); (places[k] ||= []).push(e); });
  $('#placeList').innerHTML = Object.entries(places).sort((a, b) => b[1].length - a[1].length).map(([k, list]) =>
    `<div class="pl" data-lat="${list[0].location.lat}" data-lng="${list[0].location.lng}"><span>📍 ${esc(k)}</span><span class="muted small">${list.length} lần · gần nhất ${fmtDate(list[0].date)}</span></div>`).join('') ||
    '<div class="empty"><b>🗺️</b>Chưa có mục nào gắn vị trí. Khi viết, bấm “📍 Vị trí hiện tại”.</div>';
  $$('#placeList .pl').forEach((d) => (d.onclick = () => { bigMap.setView([+d.dataset.lat, +d.dataset.lng], 15); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
};
document.addEventListener('click', (ev) => { const a = ev.target.closest('[data-open]'); if (a) { ev.preventDefault(); openViewer(a.dataset.open); } });

// ============ Thư viện ảnh ============
RENDER.photos = function () {
  const items = [];
  S.entries.forEach((e) => e.photos.forEach((p) => items.push({ p, e })));
  $('#photoCount').textContent = `${items.length} ảnh`;
  $('#gallery').innerHTML = items.length ? items.map(({ p, e }, i) =>
    `<figure data-i="${i}"><img loading="lazy" src="${photoUrl(p, 1)}" alt="" ${p.w ? `width="${p.w}" height="${p.h}" style="height:auto"` : ''}><figcaption>${fmtDate(e.date)}</figcaption></figure>`).join('')
    : '<div class="empty"><b>🖼️</b>Chưa có ảnh nào.</div>';
  $$('#gallery figure').forEach((f) => {
    const { p, e } = items[+f.dataset.i];
    f.onclick = () => openViewer(e.id);
    f.oncontextmenu = (ev) => { ev.preventDefault(); lightbox(photoUrl(p), e.title); };
  });
};

// ============ Tử vi ============
const HOA_CLS = { 'Hóa Lộc': 'loc', 'Hóa Quyền': 'quyen', 'Hóa Khoa': 'khoa', 'Hóa Kỵ': 'ky' };
const hoaTag = (s) => (s.hoa ? `<span class="h ${HOA_CLS[s.hoa]}" title="${s.hoa}">${s.hoa.slice(4)}</span>` : '');
const BNAME = { M: 'miếu', V: 'vượng', 'Đ': 'đắc', B: 'bình', H: 'hãm' };
const GRID_POS = { 5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4], 9: [2, 4], 10: [3, 4], 11: [4, 4], 0: [4, 3], 1: [4, 2], 2: [4, 1], 3: [3, 1], 4: [2, 1] };
let tvSel = null, tvEdit = false, tvShow = 'all';
const tuviChart = () => (S.tuvi?.profile ? TuVi.lapLaSo(S.tuvi.profile) : null);
const saveTuvi = () => kvSet('tuvi', S.tuvi).catch((e) => toast(e.message));

function tuviSummary(ch) {
  const vh = TuVi.vanHan(ch, localISO());
  return `Âm lịch hôm nay ${vh.lunar.text} năm ${vh.lunar.yearCC}. Tuổi mụ ${vh.age}. Đại vận: ${vh.text.daiVan}. Tiểu hạn năm nay: ${vh.text.tieuHan}. Lưu Thái Tuế: ${vh.text.luuThaiTue}. Lưu nguyệt tháng này: ${vh.text.luuNguyet}.`;
}

RENDER.tuvi = function () {
  const box = $('#tuvi');
  if (!S.tuvi.profile || tvEdit) return tuviForm(box);
  const ch = tuviChart();
  const vh = TuVi.vanHan(ch, localISO());
  const p = ch.input;
  const cell = (c) => {
    const [r, col] = GRID_POS[c.chi];
    const cls = ['tv-cell', tvSel === c.chi ? 'sel' : '', vh.daiVan === c.chi ? 'dv' : '', vh.tieuHan === c.chi ? 'th' : ''].join(' ');
    return `<div class="${cls}" data-z="${c.chi}" style="grid-row:${r};grid-column:${col}">
      <div class="tv-top"><span class="pn ${c.isThan ? 'than' : ''}">${c.name}</span><span class="cc">${c.can} ${c.chiName}</span></div>
      <div class="tv-main">${c.main.length ? c.main.map((s) => `<div>${s.name} <span class="b">${s.b}</span>${hoaTag(s)}</div>`).join('') : '<span class="b">Vô chính diệu</span>'}</div>
      <div class="tv-sub"><div class="g">${c.good.map((s) => s.name + hoaTag(s)).join('<br>')}</div><div class="x">${c.bad.map((s) => s.name + hoaTag(s)).join('<br>')}</div></div>
      <div class="tv-foot"><span>${c.ts} · ${c.bs}</span><span>${c.daiVan}${c.tuan ? '<span class="tv-mark">Tuần</span>' : ''}${c.triet ? '<span class="tv-mark">Triệt</span>' : ''}</span></div>
    </div>`;
  };
  const A = S.tuvi.analyses || {};
  const keys = Object.keys(A).filter((k) => A[k]);
  const label = (k) => (k === 'all' ? '📜 Luận tổng quan' : k === 'compare' ? '🔗 Đối chiếu nhật ký' : '🏛️ Cung ' + k.slice(5));
  box.innerHTML = `
    <div class="tv-wrap"><div class="tv-grid">
      ${ch.cells.map(cell).join('')}
      <div class="tv-center">
        <h3>${esc(p.name || 'Lá số của tôi')}</h3>
        <div>${ch.nam ? 'Nam' : 'Nữ'} · ${ch.amDuong}</div>
        <div>Dương lịch: ${p.date.split('-').reverse().join('/')} · ${p.time}</div>
        <div>Âm lịch: <b>${ch.lunar.text}</b></div>
        <div>Năm ${ch.yearCC} · tháng ${ch.monthCC} · ngày ${ch.dayCC} · giờ ${ch.hourCC}</div>
        <div>Bản mệnh: <b>${ch.banMenh}</b> · ${ch.cucName}</div>
        <div>${ch.quanHe}</div>
        <div>Mệnh chủ ${ch.menhChu} · Thân chủ ${ch.thanChu} · Thân cư ${ch.thanCu}</div>
        <div style="margin-top:6px">Năm ${vh.lunar.yearCC} (${vh.age} tuổi mụ): đại vận <b>${vh.text.daiVan}</b>, tiểu hạn <b>${vh.text.tieuHan}</b></div>
      </div>
    </div></div>
    <div class="tv-legend"><span>M miếu · V vượng · Đ đắc · B bình · H hãm</span><span><span class="h loc">Lộc</span> <span class="h quyen">Quyền</span> <span class="h khoa">Khoa</span> <span class="h ky">Kỵ</span></span><span style="color:var(--green)">▢ viền xanh: đại vận hiện tại</span><span>Bấm vào cung để xem chi tiết</span></div>
    <div id="tvPanel"></div>
    <div class="tv-actions">
      <button class="btn primary" id="tvAll">✨ AI luận tổng quan & 12 cung</button>
      <button class="btn ghost" id="tvCmp">🔗 Đối chiếu với nhật ký</button>
      <button class="btn ghost" id="tvEditBtn">✏️ Sửa thông tin</button>
    </div>
    ${keys.length ? `<div class="chips" id="tvKeys">${keys.map((k) => `<button data-k="${k}" class="${k === tvShow ? 'on' : ''}">${label(k)}</button>`).join('')}</div>` : ''}
    <div class="card tv-panel ${A[tvShow] ? '' : 'hidden'}" id="tvOutCard"><div class="md" id="tvOut">${md(A[tvShow] || '')}</div>
      <div class="row gap" style="margin-top:12px"><button class="btn ghost sm" id="tvSave">💾 Lưu bài này vào nhật ký</button></div></div>
    <p class="muted small">Lá số an theo Tử Vi Đẩu Số phổ biến ở Việt Nam; độ sáng sao và một số sao có khác biệt giữa các trường phái. Nội dung luận giải chỉ để tham khảo và tự chiêm nghiệm.</p>`;

  $$('.tv-cell').forEach((el) => (el.onclick = () => { tvSel = +el.dataset.z; RENDER.tuvi(); $('#tvPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }));
  if (tvSel != null) drawPalace(ch, tvSel);
  $('#tvEditBtn').onclick = () => { tvEdit = true; RENDER.tuvi(); };
  $$('#tvKeys button').forEach((b) => (b.onclick = () => { tvShow = b.dataset.k; RENDER.tuvi(); }));
  $('#tvAll').onclick = () => tuviAI('all', ch);
  $('#tvCmp').onclick = () => tuviAI('compare', ch);
  $('#tvSave').onclick = async () => {
    const txt = (S.tuvi.analyses || {})[tvShow];
    if (!txt) return;
    await saveEntry(newEntry({ type: 'ghichu', title: 'Tử vi: ' + label(tvShow).replace(/^\S+\s/, ''), content: txt, tags: ['tử vi'] }));
    toast('Đã lưu vào nhật ký ✓');
  };
};

function drawPalace(ch, z) {
  const c = ch.cells[z];
  const [, tp1, tp2, xc] = TuVi.tamPhuong(z);
  const star = (s) => `${s.name}${s.b ? ` (${BNAME[s.b]})` : ''}${hoaTag(s)}`;
  $('#tvPanel').innerHTML = `<div class="card">
    <div class="sheet-head"><h3>Cung ${c.name} · ${c.can} ${c.chiName}${c.isThan ? ' · Thân cư' : ''}</h3><button class="icon-btn" id="tvClose">✕</button></div>
    <p><b>Chính tinh:</b> ${c.main.length ? c.main.map(star).join(', ') : 'Vô chính diệu (mượn sao cung đối ' + ch.cells[xc].name + ')'}</p>
    <p><b>Cát tinh:</b> ${c.good.map(star).join(', ') || '—'}<br><b>Sát / hung tinh:</b> ${c.bad.map(star).join(', ') || '—'}</p>
    <p class="small muted">Vòng Tràng Sinh: ${c.ts} · Vòng Lộc Tồn: ${c.bs}${c.tuan ? ' · Tuần' : ''}${c.triet ? ' · Triệt' : ''} · Đại vận ${c.daiVan}–${c.daiVan + 9} tuổi</p>
    <p class="small">Tam hợp: <b>${ch.cells[tp1].name}</b> (${ch.cells[tp1].chiName}), <b>${ch.cells[tp2].name}</b> (${ch.cells[tp2].chiName}) · Xung chiếu: <b>${ch.cells[xc].name}</b> (${ch.cells[xc].chiName})</p>
    <button class="btn primary sm" id="tvCung">✨ AI luận cung ${c.name}</button></div>`;
  $('#tvClose').onclick = () => { tvSel = null; $('#tvPanel').innerHTML = ''; $$('.tv-cell.sel').forEach((x) => x.classList.remove('sel')); };
  $('#tvCung').onclick = () => tuviAI('cung_' + c.name, ch, z);
}

const TUVI_SYS = `Bạn là người luận Tử Vi Đẩu Số theo trường phái phổ biến ở Việt Nam, am hiểu ý nghĩa chính tinh (miếu/vượng/đắc/bình/hãm), phụ tinh, Tứ Hóa, Tuần/Triệt, vòng Tràng Sinh, và cách xét tam phương tứ chính (cung chính, hai cung tam hợp, cung xung chiếu).
Nguyên tắc: chỉ dựa trên dữ liệu lá số được cung cấp, không tự an lại sao; viết tiếng Việt rõ ràng, thực tế, ấm áp; tập trung vào tính cách, xu hướng, điểm mạnh và điều cần lưu ý; KHÔNG phán chắc chắn về bệnh tật nặng, tai nạn, tuổi thọ hay chuyện hôn nhân đổ vỡ; nhắc nhẹ rằng tử vi chỉ để tham khảo và con người có thể chủ động thay đổi. Dùng markdown gọn (tiêu đề ##, gạch đầu dòng, **in đậm**), không dùng bảng.`;

async function tuviAI(key, ch, z) {
  const who = S.settings.userName ? `Xưng hô với đương số là "${S.settings.userName}".` : '';
  let task, data;
  if (key === 'all') {
    task = `Luận lá số sau theo thứ tự:
## Tổng quan — âm dương, bản mệnh và cục, quan hệ Mệnh–Cục, Mệnh/Thân, Mệnh chủ/Thân chủ.
## Tính cách — 4-6 gạch đầu dòng điểm mạnh, 3-4 điều cần lưu ý (xét cung Mệnh, Thân và tam phương tứ chính).
## 12 cung — mỗi cung một đoạn 2-3 câu, theo thứ tự Mệnh, Phụ Mẫu, Phúc Đức, Điền Trạch, Quan Lộc, Nô Bộc, Thiên Di, Tật Ách, Tài Bạch, Tử Tức, Phu Thê, Huynh Đệ.
## Vận hiện tại — đại vận 10 năm và tiểu hạn năm nay.
## Lời khuyên — 3-5 gợi ý thực tế.`;
    data = TuVi.chartText(ch) + '\n\nVận hạn hiện tại: ' + tuviSummary(ch);
  } else if (key === 'compare') {
    if (!S.entries.length) return toast('Nhật ký còn trống — hãy ghi vài mục trước nhé');
    task = `Đối chiếu NHẬT KÝ THỰC TẾ với lá số. Mỗi mục nhật ký đã được ghi kèm ngày âm, đại vận, tiểu hạn và lưu nguyệt tương ứng.
## Những gì khớp — sự kiện/tâm trạng nào phù hợp với ý nghĩa của cung đang được kích hoạt (dẫn ngày cụ thể).
## Những gì không khớp — trung thực chỉ ra chỗ lá số không giải thích được.
## Quy luật theo tháng âm/cung lưu nguyệt — tháng nào hay vui/buồn, bận việc gì.
## Nhận xét tính cách qua nhật ký so với lá số.
## Gợi ý — nên ghi thêm gì để lần sau đối chiếu chính xác hơn, và 3 lời khuyên cho giai đoạn tới.
Nếu dữ liệu còn ít, nói rõ mức độ tin cậy thấp.`;
    let ctx = '';
    for (const e of S.entries) {
      const v = TuVi.vanHan(ch, e.date.slice(0, 10));
      const t = `[${e.date.replace('T', ' ')} | âm ${v.lunar.text} ${v.lunar.yearCC} | đại vận ${v.text.daiVan} | tiểu hạn ${v.text.tieuHan} | lưu nguyệt ${v.text.luuNguyet}${e.mood ? ' | tâm trạng ' + e.mood + '/5' : ''}] (${TYPES[e.type]?.name || e.type}) ${e.title}\n${e.content.slice(0, 500)}${e.tags.length ? '\n' + e.tags.map((x) => '#' + x).join(' ') : ''}\n\n`;
      if (ctx.length + t.length > 250000) break;
      ctx += t;
    }
    data = TuVi.chartText(ch) + '\n\nVận hạn hiện tại: ' + tuviSummary(ch) + '\n\nNHẬT KÝ (mới nhất trước):\n' + ctx;
  } else {
    const c = ch.cells[z];
    task = `Luận riêng cung ${c.name} (${c.can} ${c.chiName}). Xét chính tinh và độ sáng, cát sát tinh, Tứ Hóa, Tuần/Triệt, rồi tam phương tứ chính. Gồm: ## Ý nghĩa chính, ## Điểm thuận lợi, ## Điều cần lưu ý, ## Lời khuyên thực tế. Khoảng 250-350 chữ.`;
    data = TuVi.chartText(ch).split('\n')[0] + '\n\nCUNG CẦN LUẬN:\n' + TuVi.cellText(ch, z) + '\n\nTAM PHƯƠNG TỨ CHÍNH:\n' + TuVi.tamPhuong(z).slice(1).map((x) => TuVi.cellText(ch, x)).join('\n') + '\n\nVận hạn hiện tại: ' + tuviSummary(ch);
  }
  tvShow = key;
  S.tuvi.analyses = S.tuvi.analyses || {};
  RENDER.tuvi();
  const card = $('#tvOutCard'), out = $('#tvOut');
  card.classList.remove('hidden'); out.classList.add('typing'); out.innerHTML = '';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $$('#tvAll,#tvCmp,#tvCung').forEach((b) => (b.disabled = true));
  try {
    const text = await aiStream({
      system: TUVI_SYS + '\n' + who + `\nHôm nay: ${fmtDate(localISO())}.`,
      messages: [{ role: 'user', text: data + '\n\nYÊU CẦU:\n' + task }],
      onText: (t) => (out.innerHTML = md(t)),
    });
    S.tuvi.analyses[key] = text;
    await saveTuvi();
  } catch (err) { out.innerHTML = `<p class="err">${esc(err.message)}</p>`; }
  out.classList.remove('typing');
  $$('#tvAll,#tvCmp,#tvCung').forEach((b) => (b.disabled = false));
  if (!$('#tvKeys') || !$(`#tvKeys [data-k="${key}"]`)) { const y = window.scrollY; RENDER.tuvi(); window.scrollTo(0, y); }
}

function tuviForm(box) {
  const p = S.tuvi.profile || { name: S.settings.userName || '', gender: 'nam', date: '', time: '' };
  const [py, pm, pd] = (p.date || '').split('-').map(Number);
  const pl = p.date ? AmLich.solar2lunar(pd, pm, py) : null;
  box.innerHTML = `<div class="card">
    <h3>Thông tin ngày sinh</h3>
    <p class="muted small">Lá số phụ thuộc nhiều vào <b>giờ sinh</b> — hãy nhập càng chính xác càng tốt. Sinh sau 23h sẽ tính sang ngày hôm sau (giờ Tý).</p>
    <div class="tv-form">
      <div><label class="lbl">Họ tên</label><input id="tvName" value="${esc(p.name)}"></div>
      <div><label class="lbl">Giới tính</label><select id="tvGender"><option value="nam">Nam</option><option value="nu" ${p.gender === 'nu' ? 'selected' : ''}>Nữ</option></select></div>
      <div><label class="lbl">Nhập theo</label><select id="tvCal"><option value="duong">Dương lịch</option><option value="am">Âm lịch</option></select></div>
      <div id="tvDuong"><label class="lbl">Ngày sinh (dương lịch)</label><input type="date" id="tvDate" value="${esc(p.date)}" min="1900-01-01" max="2100-12-31"></div>
      <div id="tvAm" class="hidden"><label class="lbl">Ngày / tháng / năm âm lịch</label>
        <div class="row gap"><input id="tvLd" type="number" min="1" max="30" placeholder="Ngày" value="${pl ? pl.day : ''}"><input id="tvLm" type="number" min="1" max="12" placeholder="Tháng" value="${pl ? pl.month : ''}"><input id="tvLy" type="number" min="1900" max="2100" placeholder="Năm" value="${pl ? pl.year : ''}"></div>
        <label class="check"><input type="checkbox" id="tvLeap" ${pl?.leap ? 'checked' : ''}> Tháng nhuận</label></div>
      <div><label class="lbl">Giờ sinh</label><input type="time" id="tvTime" value="${esc(p.time)}"></div>
    </div>
    <p class="small" id="tvPreview"></p>
    <div class="row gap"><button class="btn primary" id="tvSaveP">Lập lá số</button>${S.tuvi.profile ? '<button class="btn ghost" id="tvCancel">Huỷ</button>' : ''}</div>
  </div>`;
  const solarDate = () => {
    if ($('#tvCal').value === 'duong') return $('#tvDate').value;
    const r = AmLich.lunar2solar(+$('#tvLd').value, +$('#tvLm').value, +$('#tvLy').value, $('#tvLeap').checked ? 1 : 0);
    return r ? `${r[2]}-${pad(r[1])}-${pad(r[0])}` : '';
  };
  const preview = () => {
    const d = solarDate();
    if (!d) return ($('#tvPreview').textContent = $('#tvCal').value === 'am' && $('#tvLy').value ? '⚠️ Ngày âm không hợp lệ (năm đó có thể không có tháng nhuận này).' : '');
    const l = AmLich.info(d);
    $('#tvPreview').innerHTML = `Dương lịch <b>${d.split('-').reverse().join('/')}</b> = âm lịch <b>${l.text}/${l.year}</b> · năm ${l.yearCC}, ngày ${l.dayCC}`;
  };
  $('#tvCal').onchange = () => { const am = $('#tvCal').value === 'am'; $('#tvAm').classList.toggle('hidden', !am); $('#tvDuong').classList.toggle('hidden', am); preview(); };
  $$('#tuvi input').forEach((i) => i.addEventListener('input', preview));
  preview();
  if ($('#tvCancel')) $('#tvCancel').onclick = () => { tvEdit = false; RENDER.tuvi(); };
  $('#tvSaveP').onclick = async () => {
    const date = solarDate(), time = $('#tvTime').value;
    if (!date) return toast('Nhập ngày sinh hợp lệ');
    if (!time) return toast('Nhập giờ sinh (có thể ước lượng)');
    const np = { name: $('#tvName').value.trim(), gender: $('#tvGender').value, date, time };
    const changed = JSON.stringify(np) !== JSON.stringify(S.tuvi.profile);
    S.tuvi.profile = np;
    if (changed) S.tuvi.analyses = {};
    tvEdit = false; tvSel = null;
    await saveTuvi();
    RENDER.tuvi();
  };
}

function todayCard() {
  const now = localISO(), l = AmLich.info(now);
  const hd = AmLich.gioHoangDao(l.jd);
  let vh = '';
  const ch = tuviChart();
  if (ch) {
    const v = TuVi.vanHan(ch, now);
    vh = `<div class="vh"><span>Đại vận: ${v.text.daiVan}</span><span>Tiểu hạn ${l.year}: ${v.text.tieuHan}</span><span>Lưu nguyệt tháng ${l.month}: ${v.text.luuNguyet}</span></div>`;
  }
  return `<div class="card today-card">
    <div class="big">🌙 Âm lịch ${l.text} · năm ${l.yearCC}</div>
    <div class="muted">Ngày ${l.dayCC} · tháng ${l.monthCC}${l.day === 1 ? ' · <b>Mùng Một</b>' : l.day === 15 ? ' · <b>Ngày Rằm</b>' : ''}</div>
    <div class="small">Giờ hoàng đạo: ${hd.join(', ')}</div>
    ${vh || '<div class="small muted">Lập <a href="#tuvi">lá số tử vi</a> để xem vận hạn hằng ngày.</div>'}
  </div>`;
}

// ============ Trợ lý ============
const PROMPTS = [
  ['📅 Tổng kết tuần', 'week', 'Tổng kết tuần vừa qua của tôi: điều nổi bật, cảm xúc chủ đạo, bài học, và 3 gợi ý cho tuần tới.'],
  ['🗓️ Tổng kết tháng', 'month', 'Tổng kết 30 ngày qua: các chủ đề chính, thay đổi tâm trạng theo thời gian, những nơi đã đến, bài học đáng nhớ, và điều tôi nên chú ý.'],
  ['💡 Bài học lặp lại', 'all', 'Những bài học nào xuất hiện lặp đi lặp lại trong nhật ký của tôi? Tôi đã thực sự thay đổi chưa? Dẫn chứng theo ngày.'],
  ['😊 Điều gì làm tôi vui', 'all', 'Dựa trên tâm trạng và nội dung, những hoạt động, con người, nơi chốn nào gắn với lúc tôi vui nhất và buồn nhất?'],
  ['📍 Tôi đã đi đâu', 'all', 'Liệt kê những nơi tôi đã ghi lại, nhóm theo thành phố/khu vực, kèm kỷ niệm nổi bật ở mỗi nơi.'],
  ['🎯 Mục tiêu tháng tới', 'month', 'Từ những gì tôi viết gần đây, gợi ý 3 mục tiêu cụ thể, đo được cho tháng tới và vì sao.'],
  ['🔮 Tử vi & cuộc sống', 'tuvi', 'Dựa vào lá số tử vi và vận hạn hiện tại của tôi, cùng những gì tôi đã ghi gần đây: giai đoạn này tôi nên chú ý điều gì, những gì nhật ký cho thấy khớp hoặc không khớp với lá số?'],
  ['🔗 Link đã lưu', 'all', 'Tổng hợp kiến thức từ những link tôi đã lưu, nhóm theo chủ đề (khoa học, tài chính…), cái nào nên xem lại và vì sao.'],
];
let chat = [];
let chatLoaded = false;

function contextFor(range) {
  const now = Date.now();
  let list = S.entries;
  if (range === 'week') list = list.filter((e) => now - parseDate(e.date) < 7 * 864e5);
  if (range === 'month' || range === 'tuvi') list = list.filter((e) => now - parseDate(e.date) < (range === 'tuvi' ? 90 : 30) * 864e5);
  let out = '', n = 0;
  for (const e of list) { // mới nhất trước
    const t = entryText(e, 1500) + '\n\n';
    if (out.length + t.length > 300000) break;
    out += t; n++;
  }
  return { text: out, n, total: list.length };
}
function drawChat() {
  $('#chat').innerHTML = chat.length ? chat.map((m, i) => m.role === 'user'
    ? `<div class="msg user">${esc(m.text)}</div>`
    : `<div class="msg ai"><div class="md">${md(m.text)}</div><div class="msg-act"><button class="btn ghost sm" data-savemsg="${i}">💾 Lưu thành ghi chú</button></div></div>`).join('')
    : `<div class="empty"><b>✨</b>Trợ lý đọc toàn bộ nhật ký của bạn (${S.entries.length} mục) để trả lời.<br>Chọn một gợi ý ở trên hoặc tự đặt câu hỏi.</div>`;
  $$('[data-savemsg]').forEach((b) => (b.onclick = async () => {
    const i = +b.dataset.savemsg, q = chat[i - 1]?.text || '';
    await saveEntry(newEntry({ type: 'ghichu', title: 'Trợ lý: ' + q.slice(0, 60), content: chat[i].text, tags: ['ai'] }));
    toast('Đã lưu vào nhật ký ✓');
  }));
}
RENDER.assistant = async function () {
  $('#prompts').innerHTML = PROMPTS.map((p, i) => `<button data-p="${i}">${p[0]}</button>`).join('');
  $$('#prompts button').forEach((b) => (b.onclick = () => ask(PROMPTS[+b.dataset.p][2], PROMPTS[+b.dataset.p][1])));
  if (!chatLoaded) { chatLoaded = true; chat = (await kvGet('chat').catch(() => null)) || []; }
  drawChat();
};
function tuviContext() {
  const ch = tuviChart();
  if (!ch) return '';
  return `\n\nLÁ SỐ TỬ VI CỦA NGƯỜI DÙNG (chỉ dùng khi câu hỏi liên quan tử vi, vận hạn, tính cách; luôn nói rõ đây là tham khảo):\n${TuVi.chartText(ch)}\nVận hạn hiện tại: ${tuviSummary(ch)}`;
}
async function ask(q, range = 'all') {
  if (!q.trim()) return;
  if (!S.entries.length) return toast('Nhật ký còn trống, hãy viết vài mục trước nhé');
  chat.push({ role: 'user', text: q });
  chat.push({ role: 'assistant', text: '' });
  drawChat();
  const node = $$('#chat .msg.ai .md').pop(); node.classList.add('typing');
  node.scrollIntoView({ block: 'end', behavior: 'smooth' });
  const ctx = contextFor(range);
  try {
    const text = await aiStream({
      system: systemPrompt() + tuviContext() + `\n\nDỮ LIỆU NHẬT KÝ (${ctx.n}/${ctx.total} mục${range !== 'all' ? ', phạm vi ' + ({ week: 7, month: 30, tuvi: 90 }[range]) + ' ngày gần nhất' : ''}, mới nhất trước):\n\n${ctx.text || '(không có mục nào trong phạm vi này)'}`,
      messages: chat.slice(-13, -1).map((m) => ({ role: m.role, text: m.text })),
      onText: (t) => { node.innerHTML = md(t); },
    });
    chat[chat.length - 1].text = text;
  } catch (err) {
    chat[chat.length - 1].text = '⚠️ ' + err.message;
  }
  node.classList.remove('typing');
  chat = chat.slice(-60);
  kvSet('chat', chat).catch(() => {});
  drawChat();
  $$('#chat .msg.ai').pop()?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}
$('#chatForm').addEventListener('submit', (ev) => { ev.preventDefault(); const q = $('#chatText').value; $('#chatText').value = ''; ask(q); });
$('#chatText').addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); $('#chatForm').requestSubmit(); } });
$('#chatText').addEventListener('input', (ev) => { ev.target.style.height = 'auto'; ev.target.style.height = ev.target.scrollHeight + 'px'; });
$('#chatClear').addEventListener('click', async () => { if (await askConfirm('Xoá toàn bộ hội thoại với trợ lý?', 'Xoá')) { chat = []; kvSet('chat', []); drawChat(); } });

// ============ Thống kê ============
RENDER.stats = function () {
  const E = S.entries;
  if (!E.length) { $('#stats').innerHTML = '<div class="empty"><b>📊</b>Chưa có dữ liệu.</div>'; return; }
  const words = E.reduce((s, e) => s + (e.content.trim() ? e.content.trim().split(/\s+/).length : 0), 0);
  const thisMonth = E.filter((e) => e.date.slice(0, 7) === localISO().slice(0, 7)).length;
  const days = new Set(E.map((e) => dayKey(e.date)));
  const photos = E.reduce((s, e) => s + e.photos.length, 0);
  const moods = E.filter((e) => e.mood);
  const avgMood = moods.length ? moods.reduce((s, e) => s + e.mood, 0) / moods.length : 0;
  // Chuỗi dài nhất
  let best = 0, run = 0, prev = null;
  [...days].sort().forEach((d) => { const t = parseDate(d).getTime(); run = prev && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = t; });

  // Heatmap 53 tuần
  const cnt = {}; E.forEach((e) => (cnt[dayKey(e.date)] = (cnt[dayKey(e.date)] || 0) + 1));
  const end = new Date(); const start = new Date(end); start.setDate(start.getDate() - 364 - start.getDay());
  let cells = '', months = '', lastM = -1;
  for (let d = new Date(start), i = 0; d <= end; d.setDate(d.getDate() + 1), i++) {
    const w = Math.floor(i / 7), k = dayKey(localISO(d)), c = cnt[k] || 0;
    const op = c ? Math.min(1, 0.3 + c * 0.25) : 1;
    cells += `<rect x="${w * 13 + 24}" y="${d.getDay() * 13 + 16}" width="11" height="11" rx="2" fill="${c ? 'var(--accent)' : 'var(--line)'}" opacity="${op}"><title>${fmtDate(k)}: ${c} mục</title></rect>`;
    if (d.getDate() <= 7 && d.getDay() === 0 && d.getMonth() !== lastM) { lastM = d.getMonth(); months += `<text x="${w * 13 + 24}" y="10" font-size="9" fill="var(--ink2)">T${lastM + 1}</text>`; }
  }
  const heat = `<svg width="${54 * 13 + 30}" height="112" role="img" aria-label="Lịch ghi chép">${months}${['', 'T2', '', 'T4', '', 'T6', ''].map((l, i) => `<text x="0" y="${i * 13 + 25}" font-size="9" fill="var(--ink2)">${l}</text>`).join('')}${cells}</svg>`;

  // Tâm trạng 90 ngày
  const W = 640, H = 150, P = 24, pts = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = dayKey(localISO(d)), ms = E.filter((e) => e.mood && dayKey(e.date) === k).map((e) => e.mood);
    if (ms.length) pts.push({ x: P + ((89 - i) / 89) * (W - 2 * P), y: H - P - ((ms.reduce((a, b) => a + b) / ms.length - 1) / 4) * (H - 2 * P), k, v: ms.reduce((a, b) => a + b) / ms.length });
  }
  const moodSvg = pts.length ? `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Tâm trạng 90 ngày">
    ${[1, 3, 5].map((v) => { const y = H - P - ((v - 1) / 4) * (H - 2 * P); return `<line x1="${P}" x2="${W - P}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="0" y="${y + 4}" font-size="12">${MOODS[v]}</text>`; }).join('')}
    <polyline fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" points="${pts.map((p) => `${p.x},${p.y}`).join(' ')}"/>
    ${pts.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="var(--accent)"><title>${fmtDate(p.k)}: ${p.v.toFixed(1)}/5</title></circle>`).join('')}</svg>`
    : '<p class="muted small">Chưa có mục nào chấm tâm trạng trong 90 ngày qua.</p>';

  const bars = (arr, label) => { const mx = Math.max(...arr.map((x) => x[1]), 1); return `<div class="bars">${arr.map(([k, v]) => `<div class="bar"><span title="${esc(k)}">${label(k)}</span><div style="width:${(v / mx) * 100}%"></div><span class="muted">${v}</span></div>`).join('')}</div>`; };
  const typeCnt = Object.entries(E.reduce((m, e) => ((m[e.type] = (m[e.type] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  const byWd = [0, 0, 0, 0, 0, 0, 0]; E.forEach((e) => byWd[parseDate(e.date).getDay()]++);

  $('#stats').innerHTML = `
    <div class="kpis">
      <div class="kpi"><b>${E.length}</b><span>mục đã ghi</span></div>
      <div class="kpi"><b>${thisMonth}</b><span>trong tháng này</span></div>
      <div class="kpi"><b>${streak()} 🔥</b><span>ngày liên tiếp (kỷ lục ${best})</span></div>
      <div class="kpi"><b>${words.toLocaleString('vi-VN')}</b><span>chữ đã viết</span></div>
      <div class="kpi"><b>${photos}</b><span>ảnh</span></div>
      <div class="kpi"><b>${avgMood ? MOODS[Math.round(avgMood)] + ' ' + avgMood.toFixed(1) : '—'}</b><span>tâm trạng trung bình</span></div>
    </div>
    <div class="card"><h3>Lịch ghi chép 12 tháng</h3><div class="heat">${heat}</div><p class="muted small">${days.size} ngày có ghi chép</p></div>
    <div class="card"><h3>Tâm trạng 90 ngày</h3>${moodSvg}</div>
    <div class="card"><h3>Chủ đề (thẻ) nhiều nhất</h3>${allTags().length ? bars(allTags().slice(0, 12), (k) => '#' + esc(k)) : '<p class="muted small">Chưa gắn thẻ.</p>'}</div>
    <div class="card"><h3>Loại ghi chép</h3>${bars(typeCnt, (k) => (TYPES[k]?.icon || '') + ' ' + (TYPES[k]?.name || k))}</div>
    <div class="card"><h3>Ngày trong tuần hay viết</h3>${bars([1, 2, 3, 4, 5, 6, 0].map((i) => [WD[i], byWd[i]]), (k) => k)}</div>
    <div class="card"><button class="btn primary" id="statsAI">✨ Nhờ AI đọc các con số này</button><div id="statsAIout" class="md" style="margin-top:12px"></div></div>`;
  const hs = $('#stats .heat'); hs.scrollLeft = hs.scrollWidth;
  $('#statsAI').onclick = async () => {
    const out = $('#statsAIout'); out.classList.add('typing'); $('#statsAI').disabled = true;
    const summary = `Tổng ${E.length} mục, ${days.size} ngày có viết, streak hiện tại ${streak()}, kỷ lục ${best}. Tâm trạng TB ${avgMood.toFixed(2)}. Thẻ: ${allTags().slice(0, 15).map(([k, v]) => k + ':' + v).join(', ')}. Loại: ${typeCnt.map(([k, v]) => k + ':' + v).join(', ')}. Theo thứ (CN..T7): ${byWd.join(',')}. Tâm trạng theo ngày: ${pts.map((p) => p.k.slice(5) + '=' + p.v.toFixed(1)).join(', ')}`;
    try {
      await aiStream({
        system: systemPrompt() + '\n\nNhiệm vụ: đọc thống kê và một phần nhật ký, chỉ ra 3-5 insight có dẫn chứng (xu hướng tâm trạng, thói quen ghi chép, chủ đề chiếm nhiều tâm trí, điều bất thường), rồi 2 gợi ý hành động. Ngắn gọn.',
        messages: [{ role: 'user', text: 'THỐNG KÊ:\n' + summary + '\n\nNHẬT KÝ GẦN ĐÂY:\n' + contextFor('month').text.slice(0, 120000) }],
        onText: (t) => (out.innerHTML = md(t)),
      });
    } catch (err) { out.innerHTML = `<p class="err">${esc(err.message)}</p>`; }
    out.classList.remove('typing'); $('#statsAI').disabled = false;
  };
};

// ============ Google Drive ============
const Drive = {
  token: null, exp: 0, busy: false, map: null,
  FOLDER: 'Nhật Ký Riêng',
  clientId() { return S.settings.clientId || S.cfg.googleClientId || ''; },
  status(msg) { const el = $('#driveStatus'); if (el) el.innerHTML = msg; },
  async loadMap() { if (!this.map) this.map = (await kvGet('drive').catch(() => null)) || { photos: {}, files: {} }; return this.map; },
  saveMap() { return kvSet('drive', this.map); },
  loadGis() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    return new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = ok; s.onerror = () => no(new Error('Không tải được Google Sign-In')); document.head.appendChild(s); });
  },
  scopes: [], server: null,
  SC: { FILE: 'https://www.googleapis.com/auth/drive.file', READ: 'https://www.googleapis.com/auth/drive.readonly' },
  // Lấy vé từ máy chủ (kết nối cố định) — không cần cửa sổ đăng nhập
  async serverToken(want) {
    try {
      const r = await fetch('/api/gdrive/token', { credentials: 'same-origin' });
      if (!r.ok) { if (r.status === 404 || r.status === 409) this.server = { ...(this.server || {}), connected: false }; return null; }
      const d = await r.json();
      const sc = (d.scope || '').split(' ');
      if (!want.every((x) => sc.includes(x))) return null;
      this.token = d.access_token; this.exp = d.expires_at; this.scopes = sc;
      return this.token;
    } catch { return null; }
  },
  async serverStatus() {
    try { this.server = await api('/api/gdrive/status'); } catch { this.server = { available: false }; }
    return this.server;
  },
  // Kết nối cố định: 1 lần đăng nhập Google, máy chủ giữ khoá làm mới
  async connectPermanent() {
    if (!this.clientId()) throw new Error('Chưa có Google Client ID — xem mục “Google Client ID” bên dưới.');
    await this.loadGis();
    const code = await new Promise((ok, no) => {
      const cc = google.accounts.oauth2.initCodeClient({
        client_id: this.clientId(),
        scope: [this.SC.FILE, this.SC.READ, 'openid', 'email'].join(' '),
        ux_mode: 'popup',
        callback: (r) => (r.error ? no(new Error(r.error_description || r.error)) : ok(r.code)),
        error_callback: (e) => no(new Error(e.type === 'popup_closed' ? 'Bạn đã đóng cửa sổ đăng nhập Google' : e.message || 'Lỗi đăng nhập Google')),
      });
      cc.requestCode();
    });
    await api('/api/gdrive/connect', { method: 'POST', body: { code } });
    this.token = null;
    await this.serverStatus();
  },
  async auth(needRead) {
    const want = needRead ? [this.SC.FILE, this.SC.READ] : [this.SC.FILE];
    if (this.token && Date.now() < this.exp - 60000 && want.every((x) => this.scopes.includes(x))) return this.token;
    if (await this.serverToken(want)) return this.token;
    if (!this.clientId()) throw new Error('Chưa có Google Client ID — xem mục “Google Client ID” bên dưới.');
    if (!this.server) await this.serverStatus();
    if (this.server?.available && !this.server.connected) { await this.connectPermanent(); if (await this.serverToken(want)) return this.token; }
    await this.loadGis();
    return new Promise((ok, no) => {
      const tc = google.accounts.oauth2.initTokenClient({
        client_id: this.clientId(),
        scope: want.join(' '),
        include_granted_scopes: true,
        callback: (r) => {
          if (r.error) return no(new Error(r.error_description || r.error));
          this.token = r.access_token; this.exp = Date.now() + r.expires_in * 1000; this.scopes = (r.scope || '').split(' ');
          if (!want.every((x) => this.scopes.includes(x))) return no(new Error('Bạn chưa tích ô cho phép xem file trên Drive — hãy thử lại và tích chọn quyền đó.'));
          ok(this.token);
        },
        error_callback: (e) => no(new Error(e.type === 'popup_closed' ? 'Bạn đã đóng cửa sổ đăng nhập Google' : e.message || 'Lỗi đăng nhập Google')),
      });
      tc.requestAccessToken({ prompt: '' });
    });
  },
  async g(url, opts = {}) {
    const r = await fetch(url.startsWith('http') ? url : 'https://www.googleapis.com/drive/v3/' + url, { ...opts, headers: { Authorization: 'Bearer ' + this.token, ...(opts.headers || {}) } });
    if (r.status === 401) {
      this.token = null;
      if (!opts._retry && (await this.serverToken(this.scopes.length ? this.scopes.filter((x) => x.includes('drive')) : [this.SC.FILE]))) return this.g(url, { ...opts, _retry: true });
      throw new Error('Phiên Google hết hạn, bấm đồng bộ lại');
    }
    if (!r.ok) { const d = await r.json().catch(() => ({})); const e = new Error(d.error?.message || 'Drive lỗi ' + r.status); e.status = r.status; throw e; }
    return opts.raw ? r : r.json();
  },
  async find(name, parent, folder) {
    const q = [`name='${name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`, `'${parent}' in parents`, 'trashed=false', folder ? "mimeType='application/vnd.google-apps.folder'" : ''].filter(Boolean).join(' and ');
    const d = await this.g('files?fields=files(id,name)&pageSize=10&q=' + encodeURIComponent(q));
    return d.files?.[0]?.id || null;
  },
  async folder(name, parent = 'root') {
    return (await this.find(name, parent, true)) ||
      (await this.g('files?fields=id', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, parents: [parent], mimeType: 'application/vnd.google-apps.folder' }) })).id;
  },
  async upload(name, parent, blob, mime, existing) {
    const b = 'nk' + uid();
    const meta = existing ? {} : { name, parents: [parent] };
    const body = new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: ${mime}\r\n\r\n`, blob, `\r\n--${b}--`]);
    const url = 'https://www.googleapis.com/upload/drive/v3/files' + (existing ? '/' + existing : '') + '?uploadType=multipart&fields=id';
    return (await this.g(url, { method: existing ? 'PATCH' : 'POST', headers: { 'content-type': 'multipart/related; boundary=' + b }, body })).id;
  },
  async put(name, parent, blob, mime) {
    const m = this.map.files;
    const key = parent + '/' + name;
    try { m[key] = await this.upload(name, parent, blob, mime, m[key] || (await this.find(name, parent))); }
    catch (e) { if (e.status === 404) { delete m[key]; m[key] = await this.upload(name, parent, blob, mime); } else throw e; }
    return m[key];
  },
  async folders() {
    const m = this.map;
    const ok = async (id) => { if (!id) return false; try { const f = await this.g(`files/${id}?fields=id,trashed`); return !f.trashed; } catch { return false; } };
    if (!(await ok(m.root))) { m.root = await this.folder(this.FOLDER); m.photoDir = null; m.mdDir = null; m.files = {}; m.photos = {}; }
    if (!(await ok(m.photoDir))) { m.photoDir = await this.folder('Ảnh', m.root); m.photos = {}; }
    if (!(await ok(m.mdDir))) { m.mdDir = await this.folder('Markdown theo tháng', m.root); m.mdSig = {}; }
  },
  async sync(interactive = true) {
    if (this.busy) return;
    this.busy = true;
    try {
      if (interactive) await this.auth();
      else if ((!this.token || Date.now() > this.exp - 60000) && !(await this.serverToken([this.SC.FILE]))) return;
      await this.loadMap();
      this.status('⏳ Đang chuẩn bị thư mục…');
      await this.folders();
      const m = this.map;
      // 1) File dữ liệu đầy đủ
      this.status('⏳ Đang lưu dữ liệu…');
      const data = { app: 'nhat-ky-rieng', version: 2, exportedAt: new Date().toISOString(), folders: S.folders, entries: S.entries };
      await this.put('nhat-ky-data.json', m.root, new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), 'application/json');
      // 2) Markdown theo tháng (chỉ tháng có thay đổi)
      const months = {};
      S.entries.forEach((e) => (months[e.date.slice(0, 7)] ||= []).push(e));
      m.mdSig ||= {};
      let mdDone = 0;
      for (const [mo, list] of Object.entries(months)) {
        const sig = list.length + ':' + Math.max(...list.map((e) => e.updatedAt));
        if (m.mdSig[mo] === sig) continue;
        await this.put(`${mo}.md`, m.mdDir, new Blob([monthMarkdown(mo, list)], { type: 'text/markdown' }), 'text/markdown');
        m.mdSig[mo] = sig; mdDone++;
      }
      // 3) Ảnh chưa đồng bộ
      const all = []; S.entries.forEach((e) => e.photos.forEach((p) => all.push(typeof p === 'string' ? p : p.id)));
      const todo = all.filter((id) => !m.photos[id]);
      let i = 0;
      for (const id of todo) {
        this.status(`⏳ Đang tải ảnh lên Drive ${++i}/${todo.length}…`);
        const r = await fetch(photoUrl(id));
        if (!r.ok) continue;
        m.photos[id] = await this.upload(id + '.jpg', m.photoDir, await r.blob(), 'image/jpeg');
        if (i % 10 === 0) await this.saveMap();
      }
      m.lastSync = Date.now();
      await this.saveMap();
      this.showStatus(`✅ Đã đồng bộ: ${S.entries.length} mục, ${mdDone} tháng Markdown cập nhật, ${todo.length} ảnh mới.`);
    } catch (e) {
      this.status('⚠️ ' + esc(e.message));
      if (interactive) toast(e.message, 4000);
    } finally { this.busy = false; }
  },
  autoSync: debounce(() => { if (S.settings.driveAuto) Drive.sync(false); }, 4000),
  async restore() {
    if (!(await askConfirm('Lấy dữ liệu từ Drive và gộp vào app? Mục nào mới hơn sẽ được giữ, không mất dữ liệu hiện có.', 'Khôi phục', false))) return;
    try {
      await this.auth(); await this.loadMap();
      this.status('⏳ Đang tìm dữ liệu trên Drive…');
      const root = await this.find(this.FOLDER, 'root', true);
      if (!root) throw new Error('Không thấy thư mục “' + this.FOLDER + '” do app tạo trên Drive.');
      const fid = await this.find('nhat-ky-data.json', root);
      if (!fid) throw new Error('Không thấy file nhat-ky-data.json');
      const data = await (await this.g(`files/${fid}?alt=media`, { raw: true })).json();
      const r = await api('/api/entries', { method: 'POST', body: { entries: data.entries || [] } });
      if (Array.isArray(data.folders)) { data.folders.forEach((f) => { if (!folderById(f.id)) S.folders.push(f); }); await saveFolders(); }
      // Ảnh thiếu trên máy chủ
      const photoDir = await this.find('Ảnh', root, true);
      let fixed = 0;
      if (photoDir) {
        const files = {}; let pageToken = '';
        do {
          const d = await this.g(`files?pageSize=1000&fields=nextPageToken,files(id,name)&q=${encodeURIComponent(`'${photoDir}' in parents and trashed=false`)}${pageToken ? '&pageToken=' + pageToken : ''}`);
          d.files.forEach((f) => (files[f.name.replace(/\.jpg$/, '')] = f.id)); pageToken = d.nextPageToken;
        } while (pageToken);
        const ids = []; (data.entries || []).forEach((e) => (e.photos || []).forEach((p) => ids.push(typeof p === 'string' ? p : p.id)));
        for (const id of ids) {
          if (!files[id]) continue;
          const head = await fetch(photoUrl(id), { method: 'HEAD' });
          if (head.ok) continue;
          this.status(`⏳ Khôi phục ảnh ${++fixed}…`);
          const blob = await (await this.g(`files/${files[id]}?alt=media`, { raw: true })).blob();
          await api('/api/photos/' + id, { method: 'PUT', body: blob, headers: { 'content-type': 'image/jpeg' } });
          const small = await resize(blob, 420, 0.78);
          await api('/api/photos/' + id + '_t', { method: 'PUT', body: small.blob, headers: { 'content-type': 'image/jpeg' } });
        }
      }
      S.entries = (await api('/api/entries')).entries.sort(byDateDesc);
      this.showStatus(`✅ Đã khôi phục: ${r.changed} mục được cập nhật, ${fixed} ảnh.`);
    } catch (e) { this.status('⚠️ ' + esc(e.message)); toast(e.message, 4000); }
  },
  async showStatus(extra = '') {
    await this.loadMap().catch(() => {});
    const last = this.map?.lastSync ? new Date(this.map.lastSync).toLocaleString('vi-VN') : 'chưa bao giờ';
    const link = this.map?.root ? ` · <a href="https://drive.google.com/drive/folders/${this.map.root}" target="_blank" rel="noopener">Mở thư mục trên Drive</a>` : '';
    const sv = await this.serverStatus();
    const perm = !sv.available
      ? `<div class="perm off">🔓 Chưa bật <b>kết nối cố định</b> — mỗi lần mở app phải cho phép Google lại. Cách bật: thêm biến <code>GOOGLE_CLIENT_SECRET</code> trên Netlify (xem hướng dẫn) rồi deploy lại.</div>`
      : sv.connected ? `<div class="perm on">🔒 Đã kết nối cố định${sv.email ? ' với <b>' + esc(sv.email) + '</b>' : ''} — nghe nhạc, đồng bộ không cần đăng nhập lại. <button class="link-btn" id="gdOff">Ngắt kết nối</button></div>`
      : `<div class="perm off">🔗 <button class="btn primary sm" id="gdOn">Kết nối Google Drive cố định</button> <span class="small">Chỉ cần làm 1 lần, sau đó không phải đăng nhập lại.</span></div>`;
    this.status((extra ? extra + '<br>' : '') + perm + `Lần đồng bộ gần nhất: <b>${last}</b>${link}${this.clientId() ? '' : '<br>⚠️ Chưa có Google Client ID.'}`);
    $('#gdOn')?.addEventListener('click', async () => { try { await this.connectPermanent(); toast('Đã kết nối cố định ✓'); this.showStatus(); } catch (e) { toast(e.message, 5000); } });
    $('#gdOff')?.addEventListener('click', async () => { if (await askConfirm('Ngắt kết nối Google Drive? App sẽ không tự đồng bộ và nghe nhạc được nữa cho đến khi kết nối lại.', 'Ngắt')) { await api('/api/gdrive/disconnect', { method: 'POST', body: {} }); this.token = null; this.showStatus(); } });
    $('#syncBadge').textContent = this.map?.lastSync ? '☁️ Drive: ' + new Date(this.map.lastSync).toLocaleDateString('vi-VN') : '';
  },
};
function monthMarkdown(mo, list) {
  const lines = [`# Nhật ký tháng ${+mo.slice(5)}/${mo.slice(0, 4)}`, ''];
  [...list].sort((a, b) => a.date.localeCompare(b.date)).forEach((e) => {
    const t = TYPES[e.type] || TYPES.ghichu;
    lines.push(`## ${fmtDate(e.date)} ${fmtTime(e.date)} (âm ${lun(e.date).text}) · ${t.icon} ${t.name}${e.title ? ' · ' + e.title : ''}`);
    const meta = [e.mood ? `${MOODS[e.mood]} ${MOOD_NAMES[e.mood]}` : '', e.location ? `📍 ${e.location.name}` : '', e.tags.map((x) => '#' + x).join(' ')].filter(Boolean);
    if (meta.length) lines.push('*' + meta.join(' · ') + '*');
    lines.push('', e.content || '');
    if (e.links.length) lines.push('', ...e.links.map((l) => `- 🔗 [${l.title || l.url}](${l.url})`));
    if (e.photos.length) lines.push('', `🖼️ Ảnh: ${e.photos.map((p) => (typeof p === 'string' ? p : p.id) + '.jpg').join(', ')} (trong thư mục Ảnh)`);
    if (e.folderId && folderById(e.folderId)) lines.push('', `📁 Thư mục: ${folderLabel(e.folderId)}`);
    if (e.parentId && entryExists(e.parentId)) lines.push(`↳ Mục con của: ${S.entries.find((x) => x.id === e.parentId).title || '(không tiêu đề)'}`);
    if (e.music) lines.push(`🎵 Nhạc: ${e.music.name}`);
    if (e.category) lines.push('', `Chủ đề: ${e.category}`);
    if (e.summary) lines.push('', '**Link này nói gì:**', '', e.summary);
    if (e.ai) lines.push('', '> ✨ ' + e.ai.replace(/\n/g, '\n> '));
    lines.push('', '---', '');
  });
  return lines.join('\n');
}
$('#driveSync').addEventListener('click', () => Drive.sync(true));
$('#driveRestore').addEventListener('click', async () => { await Drive.restore(); });

// ============ Cài đặt ============
RENDER.settings = function () { fillSettings(); updateInstallCard(); renderSecurity(); Drive.showStatus(); if (Drive.clientId()) Drive.loadGis().catch(() => {}); };
function fillSettings() {
  $('#aiModel').value = S.settings.model || '';
  $('#aiModel').placeholder = S.cfg.model || 'gemini-2.5-flash';
  $('#userName').value = S.settings.userName || '';
  $('#clientId').value = S.settings.clientId || '';
  $('#clientId').placeholder = S.cfg.googleClientId || 'xxxx.apps.googleusercontent.com';
  $('#driveAuto').checked = !!S.settings.driveAuto;
  $('#linkAutoAI').checked = S.settings.linkAutoAI !== false;
  $('#linkCustomCats').value = S.settings.linkCats || '';
  $('#bookmarklet').href = `javascript:void(window.open('${location.origin}/?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title)))`;
  $('#aiStatus').innerHTML = S.cfg.aiReady ? '✅ Đã kết nối Google Gemini.' : '⚠️ Chưa có <code>GEMINI_API_KEY</code> trên Netlify — các tính năng AI sẽ không chạy.';
  applyTheme();
}
[['#aiModel', 'model'], ['#userName', 'userName'], ['#clientId', 'clientId'], ['#linkCustomCats', 'linkCats']].forEach(([sel, k]) =>
  $(sel).addEventListener('input', (ev) => { S.settings[k] = ev.target.value.trim(); saveSettings(); }));
$('#driveAuto').addEventListener('change', (ev) => { S.settings.driveAuto = ev.target.checked; saveSettings(); if (ev.target.checked) Drive.sync(true); });
$('#linkAutoAI').addEventListener('change', (ev) => { S.settings.linkAutoAI = ev.target.checked; saveSettings(); });
$('#bookmarklet').addEventListener('click', (ev) => { ev.preventDefault(); toast('Hãy kéo nút này lên thanh dấu trang của trình duyệt'); });
$$('#themeChips button').forEach((b) => b.addEventListener('click', () => { S.settings.theme = b.dataset.theme; applyTheme(); saveSettings(); }));
$('#logout').addEventListener('click', async () => { await api('/api/auth', { method: 'DELETE' }); location.reload(); });
$('#lockNow').addEventListener('click', async () => {
  if (!S.cfg.lockMinutes && !S.cfg.hasPasskey) return toast('Hãy bật “Tự khoá” hoặc Face ID bên dưới trước');
  if (!S.cfg.lockMinutes) { await api('/api/auth/lock', { method: 'POST', body: { minutes: 720 } }); }
  lockApp();
});

// ----- Bảo mật & thiết bị -----
const LOCKS = [[0, 'Không tự khoá'], [5, '5 phút'], [15, '15 phút'], [60, '1 giờ'], [240, '4 giờ'], [720, '12 giờ']];
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 2 ? 'vừa xong' : m < 60 ? m + ' phút trước' : m < 1440 ? Math.round(m / 60) + ' giờ trước' : Math.round(m / 1440) + ' ngày trước'; };
async function renderSecurity() {
  const box = $('#security');
  let d;
  try { d = await api('/api/auth/security'); } catch (e) { box.innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
  S.cfg.lockMinutes = d.lockMinutes; S.cfg.hasPasskey = d.passkeys.length > 0;
  box.innerHTML = `
    <div class="sec-block">
      <div class="sec-h">🫆 Face ID / vân tay</div>
      ${d.passkeys.length ? d.passkeys.map((p) => `<div class="dev"><span>🔑 ${esc(p.name)}<small>Thêm ${new Date(p.created).toLocaleDateString('vi-VN')}${p.last ? ' · dùng ' + ago(p.last) : ''}</small></span><button class="btn ghost sm" data-pkdel="${esc(p.id)}">Xoá</button></div>`).join('')
        : '<p class="muted small">Chưa bật. Bật để mở app bằng khuôn mặt / vân tay thay vì gõ mật khẩu.</p>'}
      ${canPasskey() ? '<button class="btn primary sm" id="pkAdd">＋ Bật Face ID / vân tay cho máy này</button>' : '<p class="muted small">Trình duyệt này chưa hỗ trợ Face ID / vân tay.</p>'}
    </div>
    <div class="sec-block">
      <div class="sec-h">⏱️ Tự khoá khi không dùng</div>
      <select id="lockSel">${LOCKS.map(([m, t]) => `<option value="${m}" ${m === d.lockMinutes ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <p class="muted small">Sau khoảng thời gian này, mở lại app phải quét Face ID (hoặc nhập mật khẩu). Áp dụng cho mọi thiết bị.</p>
    </div>
    <div class="sec-block">
      <div class="sec-h">🇬 Đăng nhập bằng Gmail</div>
      ${d.google ? `<div class="dev"><span>✅ ${esc(d.google.email)}<small>Chỉ tài khoản này đăng nhập được</small></span><button class="btn ghost sm" id="gUnlink">Huỷ liên kết</button></div>`
        : S.cfg.googleClientId ? '<p class="muted small">Liên kết Gmail của bạn để đăng nhập ở máy mới mà không cần mật khẩu.</p><div id="gLinkBtn"></div>' : '<p class="muted small">Cần nhập Google Client ID (mục Google Drive bên trên) trước.</p>'}
    </div>
    <div class="sec-block">
      <div class="sec-h">📱 Thiết bị đang đăng nhập (${d.sessions.length})</div>
      ${d.sessions.map((x) => `<div class="dev ${x.id === d.current ? 'me' : ''}"><span>${/iPhone|Android|iPad/.test(x.name) ? '📱' : '💻'} ${esc(x.name)}${x.id === d.current ? ' <b class="badge">máy này</b>' : ''}<small>${esc(x.method || '')} · hoạt động ${ago(x.last)}</small></span><button class="btn ghost sm" data-out="${x.id}">Đăng xuất</button></div>`).join('')}
      <div class="row gap wrap" style="margin-top:8px"><button class="btn ghost sm" id="outOthers">Đăng xuất các máy khác</button><button class="btn danger sm" id="outAll">Đăng xuất tất cả</button></div>
    </div>
    <div class="tip">🆘 <b>Mất điện thoại?</b> Mở app trên máy khác → Cài đặt → Bảo mật → bấm <b>Đăng xuất</b> ở máy bị mất, có hiệu lực ngay. Nếu không còn máy nào đăng nhập: vào Netlify đổi <code>APP_PASSWORD</code> rồi deploy lại, mọi máy sẽ bị đăng xuất.</div>`;
  $('#pkAdd')?.addEventListener('click', async () => {
    try { await passkeyRegister(); toast('Đã bật Face ID / vân tay ✓'); if (!d.lockMinutes) toast('Mẹo: chọn “Tự khoá” bên dưới để app tự khoá khi bạn rời đi', 5000); renderSecurity(); }
    catch (e) { toast(e.message, 4000); }
  });
  $$('[data-pkdel]').forEach((b) => (b.onclick = async () => { if (await askConfirm('Xoá Face ID / vân tay này?', 'Xoá')) { await api('/api/auth/passkey-delete', { method: 'POST', body: { id: b.dataset.pkdel } }); renderSecurity(); } }));
  $('#lockSel').onchange = async (ev) => { await api('/api/auth/lock', { method: 'POST', body: { minutes: +ev.target.value } }); S.cfg.lockMinutes = +ev.target.value; toast('Đã lưu ✓'); };
  $('#gUnlink')?.addEventListener('click', async () => { await api('/api/auth/google-unlink', { method: 'POST', body: {} }); renderSecurity(); });
  if ($('#gLinkBtn')) googleButton($('#gLinkBtn'), async (credential) => {
    try { const r = await api('/api/auth/google-link', { method: 'POST', body: { credential } }); toast('Đã liên kết ' + r.email); renderSecurity(); } catch (e) { toast(e.message, 4000); }
  });
  const logout = async (target, msg) => {
    if (!(await askConfirm(msg, 'Đăng xuất'))) return;
    const r = await api('/api/auth/logout', { method: 'POST', body: { target } });
    if (r.self) return location.reload();
    toast('Đã đăng xuất ✓'); renderSecurity();
  };
  $$('[data-out]').forEach((b) => (b.onclick = () => logout(b.dataset.out, b.dataset.out === d.current ? 'Đăng xuất khỏi máy này?' : 'Đăng xuất thiết bị này? Máy đó sẽ phải đăng nhập lại ngay.')));
  $('#outOthers').onclick = () => logout('others', 'Đăng xuất tất cả các máy khác (giữ lại máy này)?');
  $('#outAll').onclick = () => logout('all', 'Đăng xuất TẤT CẢ thiết bị, kể cả máy này?');
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('#exportJson').addEventListener('click', () => download(`nhat-ky-${dayKey(localISO())}.json`, JSON.stringify({ app: 'nhat-ky-rieng', version: 2, exportedAt: new Date().toISOString(), folders: S.folders, entries: S.entries }, null, 1), 'application/json'));
$('#exportMd').addEventListener('click', () => {
  const months = {}; S.entries.forEach((e) => (months[e.date.slice(0, 7)] ||= []).push(e));
  download(`nhat-ky-${dayKey(localISO())}.md`, Object.keys(months).sort().reverse().map((m) => monthMarkdown(m, months[m])).join('\n\n'), 'text/markdown');
});
$('#importJson').addEventListener('change', async (ev) => {
  const f = ev.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (Array.isArray(d.folders)) { d.folders.forEach((f) => { if (f && f.id && !folderById(f.id)) S.folders.push(f); }); await saveFolders(); }
    const list = (Array.isArray(d) ? d : d.entries || []).map((x) => newEntry({ ...x, tags: x.tags || [], photos: x.photos || [], links: x.links || [] }));
    const r = await api('/api/entries', { method: 'POST', body: { entries: list } });
    S.entries = (await api('/api/entries')).entries.sort(byDateDesc);
    toast(`Đã nhập ${r.changed} mục ✓`);
  } catch (e) { toast('Lỗi nhập: ' + e.message); }
  ev.target.value = '';
});

// ============ Cài thành app (PWA) ============
let installEvt = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const inAppBrowser = () => /FBAN|FBAV|Instagram|Zalo|Line\/|Messenger|TikTok/i.test(navigator.userAgent);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); installEvt = e;
  let dismissed = false; try { dismissed = localStorage.getItem('nk_install_x') === '1'; } catch {}
  if (!dismissed && !$('#app').classList.contains('hidden')) $('#installBar').classList.remove('hidden');
  updateInstallCard();
});
window.addEventListener('appinstalled', () => { installEvt = null; $('#installBar').classList.add('hidden'); updateInstallCard(); toast('Đã cài app ✓ — mở từ biểu tượng Nhật Ký trên màn hình'); });
function installHelp() {
  if (inAppBrowser()) return 'Bạn đang mở trong trình duyệt của Zalo/Facebook — không cài được. Bấm ⋮ hoặc ··· rồi chọn <b>"Mở bằng trình duyệt"</b> (Chrome/Safari), sau đó cài lại.';
  if (isIOS()) return 'Trên iPhone/iPad: mở bằng <b>Safari</b> → bấm nút <b>Chia sẻ</b> (ô vuông có mũi tên lên) → kéo xuống chọn <b>"Thêm vào MH chính"</b> → <b>Thêm</b>.';
  return 'Trên Android: mở bằng <b>Chrome</b> → bấm <b>⋮</b> (góc trên phải) → <b>"Cài đặt ứng dụng"</b> hoặc <b>"Thêm vào màn hình chính"</b>. Trên máy tính: bấm biểu tượng cài đặt ở cuối thanh địa chỉ.';
}
function updateInstallCard() {
  if (!$('#installHint')) return;
  if (isStandalone()) { $('#installHint').innerHTML = '✅ Bạn đang dùng Nhật Ký dưới dạng app đã cài.'; $('#installBtn').classList.add('hidden'); return; }
  $('#installBtn').classList.remove('hidden');
  $('#installHint').innerHTML = installEvt ? 'Bấm nút dưới để cài Nhật Ký thành app riêng trên máy này.' : installHelp();
}
async function doInstall() {
  if (installEvt) {
    installEvt.prompt();
    const r = await installEvt.userChoice.catch(() => ({}));
    if (r.outcome === 'accepted') installEvt = null;
    $('#installBar').classList.add('hidden');
    updateInstallCard();
  } else {
    openModal(`<div class="sheet-head"><h3>📲 Cài app</h3><button class="icon-btn" data-close>✕</button></div><p>${installHelp()}</p><div class="sheet-foot"><button class="btn primary" data-close>Đã hiểu</button></div>`);
  }
}
$('#installBtn').addEventListener('click', doInstall);
$('#installBarBtn').addEventListener('click', doInstall);
$('#installBarX').addEventListener('click', () => { $('#installBar').classList.add('hidden'); try { localStorage.setItem('nk_install_x', '1'); } catch {} });

// ============ Khởi động ============
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== S.view && !$('#app').classList.contains('hidden')) go(v); });
boot();
