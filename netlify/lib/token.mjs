// Dùng chung cho Functions (Node) và Edge Functions (Deno): chỉ dùng Web Crypto.
const enc = new TextEncoder();
const MAX_AGE_DAYS = 180;

export function env(k) {
  try {
    const v = globalThis.Netlify?.env?.get(k);
    if (v != null && v !== '') return v;
  } catch {}
  return globalThis.process?.env?.[k];
}

function b64u(bytes) {
  let s = '';
  for (const x of new Uint8Array(bytes)) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64u(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

async function sign(data) {
  // Đổi APP_PASSWORD hoặc AUTH_SECRET => mọi phiên cũ hết hiệu lực
  const secret = (env('AUTH_SECRET') || 'nhat-ky') + '::' + (env('APP_PASSWORD') || '');
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

export function safeEq(a = '', b = '') {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function makeToken() {
  const p = b64u(enc.encode(JSON.stringify({ iat: Date.now(), exp: Date.now() + MAX_AGE_DAYS * 864e5 })));
  return p + '.' + (await sign(p));
}

export async function checkToken(t) {
  if (!t || !env('APP_PASSWORD')) return false;
  const [p, s] = t.split('.');
  if (!p || !s || !safeEq(await sign(p), s)) return false;
  try {
    return JSON.parse(unb64u(p)).exp > Date.now();
  } catch {
    return false;
  }
}

export function getCookie(req, name) {
  const c = req.headers.get('cookie') || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export const COOKIE = 'nk_s';
export const cookieHeader = (val, maxAge) =>
  `${COOKIE}=${val}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
export const COOKIE_MAX_AGE = MAX_AGE_DAYS * 86400;

export const isAuthed = (req) => checkToken(getCookie(req, COOKIE));

export const json = (d, status = 200, headers = {}) =>
  new Response(JSON.stringify(d), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

export const deny = () => json({ error: 'Chưa đăng nhập' }, 401);
