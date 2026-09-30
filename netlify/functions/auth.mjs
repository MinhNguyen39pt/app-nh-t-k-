// Đăng nhập: mật khẩu, Face ID / vân tay (passkey), Google. Quản lý thiết bị & tự khoá.
import { getStore } from '@netlify/blobs';
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { env, json, safeEq, cookieHeader, getCookie, signPayload, readPayload, COOKIE } from '../lib/token.mjs';
import { loadState, saveState, getSession, startSession } from '../lib/session.mjs';

const CH = 'nk_c'; // cookie chứa thử thách passkey (ký HMAC, sống 5 phút)
const b64u = (u8) => Buffer.from(u8).toString('base64url');
const unb64u = (s) => new Uint8Array(Buffer.from(s, 'base64url'));
const withCookies = (res, ...cookies) => { cookies.filter(Boolean).forEach((c) => res.headers.append('set-cookie', c)); return res; };

async function googleClientId() {
  if (env('GOOGLE_CLIENT_ID')) return env('GOOGLE_CLIENT_ID');
  try { return (await getStore({ name: 'kv', consistency: 'strong' }).get('settings', { type: 'json' }))?.clientId || ''; } catch { return ''; }
}
async function verifyGoogle(credential) {
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential || ''));
  if (!r.ok) throw new Error('Không xác minh được tài khoản Google');
  const t = await r.json();
  const aud = await googleClientId();
  if (!aud || t.aud !== aud) throw new Error('Google Client ID không khớp');
  if (!/^https:\/\/accounts\.google\.com$|^accounts\.google\.com$/.test(t.iss || '')) throw new Error('Nguồn đăng nhập không hợp lệ');
  if (String(t.email_verified) !== 'true') throw new Error('Email Google chưa xác minh');
  if (+t.exp * 1000 < Date.now()) throw new Error('Phiên Google đã hết hạn');
  return { sub: t.sub, email: t.email, name: t.name || '' };
}
const rp = (req) => { const u = new URL(req.url); return { rpID: u.hostname, origin: u.origin }; };

export default async (req, context) => {
  const action = context.params?.action || '';
  const url = new URL(req.url);
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

  // ---------- Trạng thái (công khai) ----------
  if (req.method === 'GET' && !action) {
    const s = await getSession(req);
    if (url.searchParams.get('check')) return new Response(null, { status: s.status === 'ok' ? 204 : 401 });
    const st = s.st || (await loadState());
    return json({
      ok: s.status === 'ok', locked: s.status === 'locked',
      configured: !!env('APP_PASSWORD'),
      aiReady: !!env('GEMINI_API_KEY'),
      googleClientId: await googleClientId(),
      googleLogin: !!st.google,
      hasPasskey: st.passkeys.length > 0,
      lockMinutes: st.lockMinutes,
      model: env('GEMINI_MODEL') || 'gemini-2.5-flash',
    });
  }

  // ---------- Đăng nhập bằng mật khẩu ----------
  if (req.method === 'POST' && !action) {
    const pass = env('APP_PASSWORD');
    if (!pass) return json({ error: 'Chưa khai báo biến môi trường APP_PASSWORD trên Netlify.' }, 500);
    const st = await loadState();
    if (st.fails.until > Date.now()) return json({ error: `Sai quá nhiều lần. Thử lại sau ${Math.ceil((st.fails.until - Date.now()) / 60000)} phút.` }, 429);
    if (!safeEq(String(body.password || ''), pass)) {
      st.fails.count = (st.fails.count || 0) + 1;
      if (st.fails.count >= 5) { st.fails = { count: 0, until: Date.now() + 15 * 60000 }; }
      await saveState(st);
      await new Promise((r) => setTimeout(r, 700));
      return json({ error: st.fails.until > Date.now() ? 'Sai 5 lần liên tiếp — tạm khoá 15 phút.' : `Sai mật khẩu (còn ${5 - st.fails.count} lần thử)` }, 401);
    }
    return withCookies(json({ ok: true }), await startSession(req, 'Mật khẩu', st));
  }

  // ---------- Đăng xuất máy này ----------
  if (req.method === 'DELETE' && !action) {
    const s = await getSession(req);
    if (s.sid && s.st) { delete s.st.sessions[s.sid]; await saveState(s.st); }
    return withCookies(json({ ok: true }), cookieHeader('', 0));
  }

  // ---------- Google ----------
  if (action === 'google' && req.method === 'POST') {
    try {
      const g = await verifyGoogle(body.credential);
      const st = await loadState();
      if (!st.google || st.google.sub !== g.sub) return json({ error: 'Tài khoản Google này chưa được liên kết với app.' }, 403);
      return withCookies(json({ ok: true }), await startSession(req, 'Google', st));
    } catch (e) { return json({ error: e.message }, 401); }
  }

  // ---------- Passkey: đăng nhập / mở khoá ----------
  if (action === 'passkey-login-options' && req.method === 'POST') {
    const st = await loadState();
    if (!st.passkeys.length) return json({ error: 'Chưa thiết lập Face ID / vân tay' }, 400);
    const { rpID } = rp(req);
    const opts = await generateAuthenticationOptions({ rpID, userVerification: 'required', allowCredentials: st.passkeys.map((p) => ({ id: p.id, transports: p.transports })) });
    const c = await signPayload({ ch: opts.challenge, kind: 'auth', exp: Date.now() + 5 * 60000 });
    return withCookies(json(opts), cookieHeader(c, 300, CH));
  }
  if (action === 'passkey-login' && req.method === 'POST') {
    const c = await readPayload(getCookie(req, CH));
    if (c?.kind !== 'auth') return json({ error: 'Hết thời gian, thử lại' }, 400);
    const st = await loadState();
    const pk = st.passkeys.find((p) => p.id === body.response?.id);
    if (!pk) return json({ error: 'Khoá không được nhận ra trên máy chủ' }, 400);
    const { rpID, origin } = rp(req);
    try {
      const v = await verifyAuthenticationResponse({
        response: body.response, expectedChallenge: c.ch, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
        credential: { id: pk.id, publicKey: unb64u(pk.publicKey), counter: pk.counter, transports: pk.transports },
      });
      if (!v.verified) throw new Error('Xác minh thất bại');
      pk.counter = v.authenticationInfo.newCounter; pk.last = Date.now();
      return withCookies(json({ ok: true }), await startSession(req, 'Face ID / vân tay', st), cookieHeader('', 0, CH));
    } catch (e) { return json({ error: 'Không xác minh được: ' + e.message }, 401); }
  }

  // ---------- Từ đây trở xuống cần đang đăng nhập (không bị khoá) ----------
  const s = await getSession(req);
  if (s.status !== 'ok') return json({ error: 'Chưa đăng nhập', code: s.status === 'locked' ? 'locked' : 'login' }, 401);
  const st = s.st;

  if (action === 'security' && req.method === 'GET') {
    return json({
      current: s.sid,
      lockMinutes: st.lockMinutes,
      google: st.google ? { email: st.google.email } : null,
      passkeys: st.passkeys.map((p) => ({ id: p.id, name: p.name, created: p.created, last: p.last || 0 })),
      sessions: Object.entries(st.sessions).map(([id, v]) => ({ id, name: v.name, method: v.method, created: v.created, last: v.last || v.created })).sort((a, b) => b.last - a.last),
    });
  }
  if (action === 'lock' && req.method === 'POST') {
    const m = Number(body.minutes);
    if (![0, 5, 15, 60, 240, 720].includes(m)) return json({ error: 'Giá trị không hợp lệ' }, 400);
    st.lockMinutes = m;
    for (const v of Object.values(st.sessions)) v.until = m ? Date.now() + m * 60000 : 0;
    await saveState(st);
    return json({ ok: true });
  }
  if (action === 'lock-now' && req.method === 'POST') {
    if (st.lockMinutes) { s.sess.until = 1; await saveState(st); }
    return json({ ok: true, locked: !!st.lockMinutes });
  }
  if (action === 'logout' && req.method === 'POST') {
    const t = body.target;
    if (t === 'all') st.sessions = {};
    else if (t === 'others') st.sessions = { [s.sid]: st.sessions[s.sid] };
    else if (typeof t === 'string') delete st.sessions[t];
    await saveState(st);
    const self = !st.sessions[s.sid];
    return self ? withCookies(json({ ok: true, self }), cookieHeader('', 0)) : json({ ok: true, self });
  }
  if (action === 'google-link' && req.method === 'POST') {
    try { const g = await verifyGoogle(body.credential); st.google = { sub: g.sub, email: g.email }; await saveState(st); return json({ ok: true, email: g.email }); }
    catch (e) { return json({ error: e.message }, 400); }
  }
  if (action === 'google-unlink' && req.method === 'POST') { st.google = null; await saveState(st); return json({ ok: true }); }

  if (action === 'passkey-reg-options' && req.method === 'POST') {
    const { rpID } = rp(req);
    const opts = await generateRegistrationOptions({
      rpName: 'Nhật Ký Riêng', rpID, userName: 'nhat-ky', userDisplayName: 'Chủ nhật ký', attestationType: 'none',
      excludeCredentials: st.passkeys.map((p) => ({ id: p.id, transports: p.transports })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
    });
    const c = await signPayload({ ch: opts.challenge, kind: 'reg', exp: Date.now() + 5 * 60000 });
    return withCookies(json(opts), cookieHeader(c, 300, CH));
  }
  if (action === 'passkey-reg' && req.method === 'POST') {
    const c = await readPayload(getCookie(req, CH));
    if (c?.kind !== 'reg') return json({ error: 'Hết thời gian, thử lại' }, 400);
    const { rpID, origin } = rp(req);
    try {
      const v = await verifyRegistrationResponse({ response: body.response, expectedChallenge: c.ch, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
      if (!v.verified) throw new Error('Xác minh thất bại');
      const cr = v.registrationInfo.credential;
      st.passkeys = st.passkeys.filter((p) => p.id !== cr.id);
      st.passkeys.push({ id: cr.id, publicKey: b64u(cr.publicKey), counter: cr.counter, transports: cr.transports || [], name: String(body.name || s.sess.name).slice(0, 60), created: Date.now() });
      await saveState(st);
      return withCookies(json({ ok: true }), cookieHeader('', 0, CH));
    } catch (e) { return json({ error: 'Không đăng ký được: ' + e.message }, 400); }
  }
  if (action === 'passkey-delete' && req.method === 'POST') {
    st.passkeys = st.passkeys.filter((p) => p.id !== body.id);
    await saveState(st);
    return json({ ok: true });
  }

  return json({ error: 'Không hỗ trợ' }, 404);
};

export const config = { path: ['/api/auth', '/api/auth/:action'] };
