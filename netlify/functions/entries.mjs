import { getStore } from '@netlify/blobs';
import { json } from '../lib/token.mjs';
import { guard } from '../lib/session.mjs';

const KEY = 'entries.json';
const store = () => getStore({ name: 'nhatky', consistency: 'strong' });

async function load() {
  return (await store().get(KEY, { type: 'json' })) || {};
}
async function save(map) {
  await store().setJSON(KEY, map);
}

function clean(e) {
  if (!e || typeof e !== 'object' || !/^[\w-]{6,64}$/.test(e.id || '')) return null;
  return {
    id: e.id,
    type: String(e.type || 'nhatky').slice(0, 20),
    title: String(e.title || '').slice(0, 300),
    content: String(e.content || '').slice(0, 100000),
    date: String(e.date || '').slice(0, 25),
    mood: Math.max(0, Math.min(5, Number(e.mood) || 0)),
    tags: Array.isArray(e.tags) ? e.tags.map((t) => String(t).slice(0, 50)).slice(0, 30) : [],
    photos: Array.isArray(e.photos) ? e.photos.slice(0, 50) : [],
    location: e.location && typeof e.location === 'object' ? e.location : null,
    links: Array.isArray(e.links) ? e.links.slice(0, 30) : [],
    ai: String(e.ai || '').slice(0, 20000),
    // Kho link
    category: String(e.category || '').slice(0, 60),
    status: ['later', 'done', 'fav'].includes(e.status) ? e.status : '',
    summary: String(e.summary || '').slice(0, 20000),
    // Thư mục, nhật ký con, bài nhạc gắn kèm
    folderId: /^[\w-]{1,64}$/.test(e.folderId || '') ? e.folderId : '',
    parentId: /^[\w-]{6,64}$/.test(e.parentId || '') && e.parentId !== e.id ? e.parentId : '',
    music: e.music && typeof e.music === 'object' && e.music.id ? { id: String(e.music.id).slice(0, 100), name: String(e.music.name || '').slice(0, 200) } : null,
    createdAt: Number(e.createdAt) || Date.now(),
    updatedAt: Number(e.updatedAt) || Date.now(),
  };
}

export default async (req, context) => {
  const denied = await guard(req);
  if (denied) return denied;
  const id = context.params?.id;

  if (req.method === 'GET') {
    const map = await load();
    return json({ entries: Object.values(map) });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: 'Dữ liệu không hợp lệ' }, 400);
    const incoming = Array.isArray(body.entries) ? body.entries : [body];
    const map = await load();
    let changed = 0;
    const saved = [];
    for (const raw of incoming) {
      const e = clean(raw);
      if (!e) continue;
      const cur = map[e.id];
      // Gộp theo updatedAt: bản mới hơn thắng
      if (!cur || e.updatedAt >= cur.updatedAt) {
        map[e.id] = e;
        changed++;
      }
      saved.push(map[e.id]);
    }
    if (changed) await save(map);
    return json({ ok: true, changed, entries: saved });
  }

  if (req.method === 'DELETE' && id) {
    const map = await load();
    const e = map[id];
    if (e) {
      delete map[id];
      await save(map);
      const ps = getStore({ name: 'photos', consistency: 'strong' });
      for (const p of e.photos || []) {
        const pid = typeof p === 'string' ? p : p?.id;
        if (!pid) continue;
        await ps.delete(pid).catch(() => {});
        await ps.delete(pid + '_t').catch(() => {});
        await ps.delete(pid + '_s').catch(() => {});
      }
    }
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = { path: ['/api/entries', '/api/entries/:id'] };
