// Quản lý phiên đăng nhập: danh sách thiết bị, tự khoá, đăng xuất từ xa.
// Chỉ dùng trong Functions (Node), không dùng trong Edge.
import { getStore } from '@netlify/blobs';
import { json, getCookie, COOKIE, cookieHeader, COOKIE_MAX_AGE, signPayload, readPayload } from './token.mjs';

const store = () => getStore({ name: 'auth', consistency: 'strong' });
const KEY = 'state.json';

export async function loadState() {
  const s = (await store().get(KEY, { type: 'json' })) || {};
  return {
    sessions: s.sessions || {},
    passkeys: s.passkeys || [],
    lockMinutes: Number(s.lockMinutes) || 0,
    google: s.google || null,
    fails: s.fails || { count: 0, until: 0 },
  };
}
export const saveState = (st) => store().setJSON(KEY, st);

export function deviceName(ua = '') {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? (ua.match(/Android[^;)]*;\s*([^;)]+?)(?:\sBuild|\))/)?.[1] || 'Android') : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Thiết bị lạ';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Trình duyệt';
  return `${os} · ${br}`.slice(0, 60);
}

const randomId = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');

// Đọc phiên hiện tại. status: 'ok' | 'locked' | 'none'
export async function getSession(req, st) {
  const tok = await readPayload(getCookie(req, COOKIE));
  if (!tok?.sid) return { status: 'none' };
  st = st || (await loadState());
  const sess = st.sessions[tok.sid];
  if (!sess) return { status: 'none', st };
  const now = Date.now();
  if (st.lockMinutes && sess.until && sess.until < now) return { status: 'locked', st, sid: tok.sid, sess };
  // Gia hạn trượt: chỉ ghi khi đã qua nửa thời gian khoá (ít lần ghi)
  let dirty = false;
  if (st.lockMinutes) {
    const win = st.lockMinutes * 60000;
    if (!sess.until || sess.until - now < win / 2) { sess.until = now + win; sess.last = now; dirty = true; }
  } else if (now - (sess.last || 0) > 6 * 3600e3) { sess.last = now; dirty = true; }
  if (dirty) await saveState(st).catch(() => {});
  return { status: 'ok', st, sid: tok.sid, sess };
}

// Dùng trong các API: trả về Response lỗi nếu chưa đăng nhập / đang khoá, hoặc null nếu hợp lệ
export async function guard(req) {
  const s = await getSession(req);
  if (s.status === 'ok') return null;
  return json({ error: s.status === 'locked' ? 'App đang khoá' : 'Chưa đăng nhập', code: s.status === 'locked' ? 'locked' : 'login' }, 401);
}

// Đăng nhập thành công: mở khoá phiên hiện tại (nếu có) hoặc tạo phiên mới cho thiết bị này
export async function startSession(req, method, st) {
  st = st || (await loadState());
  const now = Date.now();
  const cur = await readPayload(getCookie(req, COOKIE));
  let sid = cur?.sid && st.sessions[cur.sid] ? cur.sid : null;
  if (!sid) {
    sid = randomId();
    st.sessions[sid] = { name: deviceName(req.headers.get('user-agent') || ''), created: now };
  }
  Object.assign(st.sessions[sid], { method, last: now, until: st.lockMinutes ? now + st.lockMinutes * 60000 : 0 });
  // Dọn phiên quá cũ (không dùng > 180 ngày), giữ tối đa 30 thiết bị
  const list = Object.entries(st.sessions).filter(([, v]) => now - (v.last || v.created) < 180 * 864e5).sort((a, b) => (b[1].last || 0) - (a[1].last || 0)).slice(0, 30);
  st.sessions = Object.fromEntries(list);
  st.fails = { count: 0, until: 0 };
  await saveState(st);
  const token = await signPayload({ sid, iat: now, exp: now + COOKIE_MAX_AGE * 1000 });
  return cookieHeader(token, COOKIE_MAX_AGE);
}
