// Kết nối Google Drive cố định: máy chủ giữ refresh token, tự cấp access token mới cho trình duyệt.
// Cần biến môi trường GOOGLE_CLIENT_SECRET (và GOOGLE_CLIENT_ID hoặc Client ID đã dán trong Cài đặt).
import { getStore } from '@netlify/blobs';
import { env, json } from '../lib/token.mjs';
import { guard } from '../lib/session.mjs';

const store = () => getStore({ name: 'secrets', consistency: 'strong' }); // không đọc được qua /api/kv
const KEY = 'gdrive.json';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

async function clientId() {
  if (env('GOOGLE_CLIENT_ID')) return env('GOOGLE_CLIENT_ID');
  try { return (await getStore({ name: 'kv', consistency: 'strong' }).get('settings', { type: 'json' }))?.clientId || ''; } catch { return ''; }
}
const form = (o) => new URLSearchParams(o).toString();
function emailFromIdToken(t) {
  try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()).email || ''; } catch { return ''; }
}

export default async (req, context) => {
  const denied = await guard(req);
  if (denied) return denied;
  const action = context.params?.action || '';
  const secret = env('GOOGLE_CLIENT_SECRET');
  const cid = await clientId();

  if (action === 'status') {
    const s = await store().get(KEY, { type: 'json' });
    return json({ available: !!(secret && cid), connected: !!s?.rt, email: s?.email || '', scope: s?.scope || '', connectedAt: s?.connectedAt || 0 });
  }
  if (!secret || !cid) return json({ error: 'Chưa khai báo GOOGLE_CLIENT_SECRET trên Netlify', code: 'no-secret' }, 400);

  // Đổi mã uỷ quyền (từ cửa sổ đăng nhập Google) lấy refresh token
  if (action === 'connect' && req.method === 'POST') {
    const { code } = await req.json().catch(() => ({}));
    if (!code) return json({ error: 'Thiếu mã uỷ quyền' }, 400);
    const r = await fetch(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form({ code, client_id: cid, client_secret: secret, redirect_uri: 'postmessage', grant_type: 'authorization_code' }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: 'Google từ chối: ' + (d.error_description || d.error || r.status) }, 400);
    const old = await store().get(KEY, { type: 'json' });
    const rt = d.refresh_token || old?.rt;
    if (!rt) return json({ error: 'Google không trả về khoá làm mới — hãy thử kết nối lại (chọn lại tài khoản và bấm Cho phép)' }, 400);
    await store().setJSON(KEY, { rt, at: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000, scope: d.scope || '', email: emailFromIdToken(d.id_token || '') || old?.email || '', connectedAt: Date.now() });
    return json({ ok: true, email: emailFromIdToken(d.id_token || '') });
  }

  // Cấp access token còn hạn (tự làm mới khi sắp hết)
  if (action === 'token') {
    const s = await store().get(KEY, { type: 'json' });
    if (!s?.rt) return json({ error: 'Chưa kết nối Google Drive', code: 'not-connected' }, 404);
    if (s.at && s.exp - Date.now() > 5 * 60000) return json({ access_token: s.at, expires_at: s.exp, scope: s.scope });
    const r = await fetch(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form({ client_id: cid, client_secret: secret, refresh_token: s.rt, grant_type: 'refresh_token' }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (d.error === 'invalid_grant') { await store().delete(KEY); return json({ error: 'Kết nối Google đã hết hạn hoặc bị thu hồi — hãy kết nối lại', code: 'reconnect' }, 409); }
      return json({ error: 'Không làm mới được: ' + (d.error_description || d.error || r.status) }, 502);
    }
    Object.assign(s, { at: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000, scope: d.scope || s.scope });
    await store().setJSON(KEY, s);
    return json({ access_token: s.at, expires_at: s.exp, scope: s.scope });
  }

  if (action === 'disconnect' && req.method === 'POST') {
    const s = await store().get(KEY, { type: 'json' });
    if (s?.rt) await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(s.rt), { method: 'POST' }).catch(() => {});
    await store().delete(KEY);
    return json({ ok: true });
  }

  return json({ error: 'Không hỗ trợ' }, 404);
};

export const config = { path: '/api/gdrive/:action' };
