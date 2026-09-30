// Gọi Google Gemini. Chạy ở Edge nên stream được lâu, không bị giới hạn 10 giây.
import { env } from '../lib/token.mjs';

const err = (msg, status = 400) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export default async (req) => {
  if (req.method !== 'POST') return err('Method not allowed', 405);
  // Hỏi function /api/auth xem phiên còn hợp lệ không (đã đăng xuất / đang khoá thì từ chối)
  const chk = await fetch(new URL('/api/auth?check=1', req.url), { headers: { cookie: req.headers.get('cookie') || '' } }).catch(() => null);
  if (!chk || chk.status !== 204) return err('Chưa đăng nhập hoặc app đang khoá', 401);
  const key = env('GEMINI_API_KEY');
  if (!key) return err('Chưa khai báo GEMINI_API_KEY trên Netlify.', 500);

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) return err('Thiếu messages');

  const model = String(body.model || env('GEMINI_MODEL') || 'gemini-2.5-flash').replace(/[^\w.-]/g, '');
  const contents = body.messages
    .filter((m) => m && (m.text || m.images?.length || m.videos?.length))
    .map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [
        // Gemini xem được trực tiếp video YouTube công khai
        ...(m.videos || []).slice(0, 1).map((v) => ({ file_data: { file_uri: String(v) } })),
        ...(m.images || []).slice(0, 4).map((im) => ({ inline_data: { mime_type: im.mime || 'image/jpeg', data: im.data } })),
        ...(m.text ? [{ text: String(m.text) }] : []),
      ],
    }));

  const hasVideo = body.messages.some((m) => m?.videos?.length);
  const payload = {
    contents,
    generationConfig: {
      temperature: body.json ? 0.3 : 0.7,
      ...(body.json ? { responseMimeType: 'application/json' } : {}),
      ...(hasVideo ? { mediaResolution: 'MEDIA_RESOLUTION_LOW' } : {}), // video dài tốn ít token hơn
    },
  };
  if (body.system) payload.systemInstruction = { parts: [{ text: String(body.system) }] };

  const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
  const up = await fetch(body.json ? `${base}:generateContent` : `${base}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(payload),
  });

  if (!up.ok) {
    const t = await up.text();
    let msg = t;
    try { msg = JSON.parse(t).error?.message || t; } catch {}
    return err(`Gemini lỗi (${up.status}): ${msg.slice(0, 400)}`, 502);
  }

  const partsText = (d) =>
    (d?.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && p.text).map((p) => p.text).join('');

  if (body.json) {
    const d = await up.json();
    return new Response(partsText(d) || '{}', { headers: { 'content-type': 'application/json; charset=utf-8' } });
  }

  // SSE của Gemini -> text thuần stream về trình duyệt
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buf = '';
  const stream = new ReadableStream({
    async start(ctrl) {
      const reader = up.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            try {
              const t = partsText(JSON.parse(line.slice(5)));
              if (t) ctrl.enqueue(enc.encode(t));
            } catch {}
          }
        }
      } catch (e) {
        ctrl.enqueue(enc.encode('\n\n[Lỗi kết nối AI: ' + e.message + ']'));
      }
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
};

export const config = { path: '/api/ai' };
