import { getStore } from '@netlify/blobs';
import { json } from '../lib/token.mjs';
import { guard } from '../lib/session.mjs';

const store = () => getStore({ name: 'photos', consistency: 'strong' });
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default async (req, context) => {
  const denied = await guard(req);
  if (denied) return denied;
  const id = context.params?.id || '';
  if (!/^[\w-]{6,80}$/.test(id)) return json({ error: 'id không hợp lệ' }, 400);
  const url = new URL(req.url);

  if (req.method === 'GET' || req.method === 'HEAD') {
    const s = store();
    let r = url.searchParams.get('t') ? await s.getWithMetadata(id + '_t', { type: 'arrayBuffer' }) : null;
    if (!r) r = await s.getWithMetadata(id, { type: 'arrayBuffer' });
    if (!r) return new Response(null, { status: 404 });
    return new Response(req.method === 'HEAD' ? null : r.data, {
      headers: {
        'content-type': r.metadata?.type || 'image/jpeg',
        'cache-control': 'private, max-age=31536000, immutable',
      },
    });
  }

  if (req.method === 'PUT') {
    const type = (req.headers.get('content-type') || '').split(';')[0];
    if (!OK_TYPES.includes(type)) return json({ error: 'Chỉ nhận ảnh JPEG/PNG/WebP/GIF' }, 400);
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 5.5 * 1024 * 1024) return json({ error: 'Ảnh quá lớn (tối đa ~5MB)' }, 413);
    await store().set(id, buf, { metadata: { type, size: buf.byteLength, at: Date.now() } });
    return json({ ok: true, id });
  }

  if (req.method === 'DELETE') {
    await store().delete(id);
    await store().delete(id + '_t').catch(() => {});
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/photos/:id' };
