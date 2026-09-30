import { json } from '../lib/token.mjs';
import { guard } from '../lib/session.mjs';

// Lấy tiêu đề / mô tả / ảnh / (tuỳ chọn) nội dung chữ của một link.
// Hỗ trợ riêng: YouTube, TikTok (oEmbed), Facebook (giả crawler của Facebook để đọc thẻ og:).
const BLOCK = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?|.*\.local$|.*\.internal$)/i;
const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const UA_FB = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

export function platformOf(host = '') {
  host = host.replace(/^www\.|^m\.|^mobile\./, '');
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) return 'youtube';
  if (/(^|\.)facebook\.com$|^fb\.watch$|^fb\.com$/.test(host)) return 'facebook';
  if (/(^|\.)tiktok\.com$/.test(host)) return 'tiktok';
  if (/(^|\.)instagram\.com$/.test(host)) return 'instagram';
  if (/^(x|twitter)\.com$/.test(host)) return 'x';
  return 'web';
}

const decode = (s = '') =>
  s
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, ' ').trim();

function meta(html, names) {
  for (const n of names) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${n}["'][^>]*content=["']([^"']*)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${n}["']`, 'i');
    const m = html.match(re1) || html.match(re2);
    if (m && m[1]) return decode(m[1]);
  }
  return '';
}

// Rút phần chữ chính của trang (đơn giản, không cần thư viện)
function extractText(html) {
  let h = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|aside|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const art = h.match(/<article[\s\S]*?<\/article>/i) || h.match(/<main[\s\S]*?<\/main>/i);
  if (art && art[0].length > 1500) h = art[0];
  const blocks = [];
  h.replace(/<(h[1-4]|p|li|blockquote|figcaption)[^>]*>([\s\S]*?)<\/\1>/gi, (_, tag, inner) => {
    const t = decode(inner.replace(/<[^>]+>/g, ' '));
    if (t.length > 25 || /^h/i.test(tag)) blocks.push((/^h/i.test(tag) ? '## ' : '') + t);
  });
  let text = blocks.join('\n');
  if (text.length < 300) text = decode(h.replace(/<[^>]+>/g, ' '));
  return text.slice(0, 20000);
}

async function readBody(r, limit) {
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let html = '', size = 0;
  while (size < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    html += dec.decode(value, { stream: true });
  }
  reader.cancel().catch(() => {});
  return html;
}

async function oembed(endpoint) {
  try {
    const r = await fetch(endpoint, { signal: AbortSignal.timeout(5000), headers: { 'user-agent': UA_BROWSER } });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export default async (req) => {
  const denied = await guard(req);
  if (denied) return denied;
  const q = new URL(req.url).searchParams;
  const full = q.get('full') === '1';
  let u;
  try {
    u = new URL(q.get('url') || '');
  } catch {
    return json({ error: 'URL không hợp lệ' }, 400);
  }
  if (!/^https?:$/.test(u.protocol) || BLOCK.test(u.hostname)) return json({ error: 'URL không được phép' }, 400);

  const platform = platformOf(u.hostname);
  const out = { url: u.href, title: '', desc: '', image: '', site: u.hostname.replace(/^www\./, ''), platform, author: '', text: '' };

  // oEmbed cho YouTube / TikTok (ổn định hơn đọc HTML)
  if (platform === 'youtube') {
    const o = await oembed('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(u.href));
    if (o) Object.assign(out, { title: o.title || '', author: o.author_name || '', image: o.thumbnail_url || '', site: 'YouTube' });
  } else if (platform === 'tiktok') {
    const o = await oembed('https://www.tiktok.com/oembed?url=' + encodeURIComponent(u.href));
    if (o) Object.assign(out, { title: o.title || '', author: o.author_name || '', image: o.thumbnail_url || '', site: 'TikTok' });
  }

  try {
    const r = await fetch(u.href, {
      redirect: 'follow',
      signal: AbortSignal.timeout(7000),
      headers: { 'user-agent': platform === 'facebook' || platform === 'instagram' ? UA_FB : UA_BROWSER, 'accept-language': 'vi,en;q=0.8', accept: 'text/html,*/*' },
    });
    const type = r.headers.get('content-type') || '';
    if (r.ok && type.includes('html')) {
      const html = await readBody(r, full ? 1500000 : 700000);
      out.url = r.url || out.url;
      out.title ||= meta(html, ['og:title', 'twitter:title']) || decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]);
      out.desc = meta(html, ['og:description', 'twitter:description', 'description']).slice(0, 1200);
      out.site = platform === 'web' ? meta(html, ['og:site_name']) || out.site : out.site;
      if (!out.author) out.author = meta(html, ['author', 'article:author']);
      const img = out.image || meta(html, ['og:image', 'twitter:image']);
      if (img) try { out.image = new URL(img, r.url).href; } catch {}
      if (full && platform === 'web') out.text = extractText(html);
    }
  } catch {}
  if (platform === 'facebook') out.site = 'Facebook';
  if (/^(Facebook|Log in|Đăng nhập)/i.test(out.title) && !out.desc) out.title = '';
  if (!out.title) out.title = out.site;
  return json(out);
};

export const config = { path: '/api/unfurl' };
