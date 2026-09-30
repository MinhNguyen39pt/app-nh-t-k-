import { getStore } from '@netlify/blobs';
import { json } from '../lib/token.mjs';
import { guard } from '../lib/session.mjs';

// Lưu cài đặt, lịch sử chat với trợ lý, bản đồ file Google Drive...
const store = () => getStore({ name: 'kv', consistency: 'strong' });

export default async (req, context) => {
  const denied = await guard(req);
  if (denied) return denied;
  const key = context.params?.key || '';
  if (!/^[a-z0-9_-]{1,40}$/.test(key)) return json({ error: 'key không hợp lệ' }, 400);

  if (req.method === 'GET') {
    return json({ value: (await store().get(key, { type: 'json' })) ?? null });
  }
  if (req.method === 'PUT') {
    const body = await req.json().catch(() => undefined);
    if (body === undefined) return json({ error: 'JSON không hợp lệ' }, 400);
    await store().setJSON(key, body.value ?? null);
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/kv/:key' };
