import { env, json, isAuthed, makeToken, safeEq, cookieHeader, COOKIE_MAX_AGE } from '../lib/token.mjs';

export default async (req) => {
  if (req.method === 'GET') {
    return json({
      ok: await isAuthed(req),
      configured: !!env('APP_PASSWORD'),
      aiReady: !!env('GEMINI_API_KEY'),
      googleClientId: env('GOOGLE_CLIENT_ID') || '',
      model: env('GEMINI_MODEL') || 'gemini-2.5-flash',
    });
  }
  if (req.method === 'DELETE') {
    return json({ ok: true }, 200, { 'set-cookie': cookieHeader('', 0) });
  }
  if (req.method === 'POST') {
    const pass = env('APP_PASSWORD');
    if (!pass) return json({ error: 'Chưa khai báo biến môi trường APP_PASSWORD trên Netlify.' }, 500);
    const body = await req.json().catch(() => ({}));
    if (!safeEq(String(body.password || ''), pass)) {
      await new Promise((r) => setTimeout(r, 700)); // làm chậm dò mật khẩu
      return json({ error: 'Sai mật khẩu' }, 401);
    }
    return json({ ok: true }, 200, { 'set-cookie': cookieHeader(await makeToken(), COOKIE_MAX_AGE) });
  }
  return json({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/auth' };
