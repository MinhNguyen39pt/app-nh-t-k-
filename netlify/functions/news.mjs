// Tin tức, xu hướng tìm kiếm, tin giao thông — đọc RSS công khai, gộp và lọc trùng.
import { json } from '../lib/token.mjs';
import { guard } from '../lib/session.mjs';

const UA = 'Mozilla/5.0 (compatible; NhatKyRieng/1.0; +https://netlify.app)';
const cache = new Map(); // bộ nhớ đệm 10 phút trong một instance

const VNE = (c) => `https://vnexpress.net/rss/${c}.rss`;
const GNEWS = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=vi&gl=VN&ceid=VN:vi`;
const FEEDS = {
  hot: [VNE('tin-noi-bat'), VNE('tin-moi-nhat'), 'https://tuoitre.vn/rss/tin-moi-nhat.rss', 'https://thanhnien.vn/rss/home.rss', 'https://news.google.com/rss?hl=vi&gl=VN&ceid=VN:vi'],
  'thoi-su': [VNE('thoi-su'), 'https://tuoitre.vn/rss/thoi-su.rss'],
  'the-gioi': [VNE('the-gioi'), 'https://tuoitre.vn/rss/the-gioi.rss'],
  'kinh-doanh': [VNE('kinh-doanh'), 'https://tuoitre.vn/rss/kinh-doanh.rss'],
  'phap-luat': [VNE('phap-luat')],
  'giai-tri': [VNE('giai-tri')],
  'the-thao': [VNE('the-thao')],
  'suc-khoe': [VNE('suc-khoe')],
  'so-hoa': [VNE('so-hoa')],
  'giao-duc': [VNE('giao-duc')],
  'du-lich': [VNE('du-lich')],
  'khoa-hoc': [VNE('khoa-hoc')],
};

const decode = (s = '') => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i')); return m ? decode(m[1]).trim() : ''; };
const strip = (h = '') => decode(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function parseRss(xml, feedUrl) {
  const host = (() => { try { return new URL(feedUrl).hostname.replace(/^www\./, ''); } catch { return ''; } })();
  const items = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const it = m[0];
    const rawDesc = tag(it, 'description');
    const img = (rawDesc.match(/<img[^>]+src=["']([^"']+)/i) || it.match(/<enclosure[^>]+url=["']([^"']+)/i) || it.match(/<media:content[^>]+url=["']([^"']+)/i) || it.match(/<media:thumbnail[^>]+url=["']([^"']+)/i) || [])[1] || '';
    let title = strip(tag(it, 'title'));
    let source = strip(tag(it, 'source'));
    if (host === 'news.google.com' && !source) { const i = title.lastIndexOf(' - '); if (i > 0) source = title.slice(i + 3); }
    if (host === 'news.google.com' && source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    const date = Date.parse(tag(it, 'pubDate') || tag(it, 'dc:date')) || 0;
    items.push({
      title, link: strip(tag(it, 'link')), date, img,
      desc: host === 'news.google.com' ? '' : strip(rawDesc).slice(0, 220),
      source: source || { 'vnexpress.net': 'VnExpress', 'tuoitre.vn': 'Tuổi Trẻ', 'thanhnien.vn': 'Thanh Niên' }[host] || host,
    });
  }
  return items;
}

function parseTrends(xml) {
  const out = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const it = m[0];
    const news = [...it.matchAll(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/gi)].slice(0, 3).map((n) => ({
      title: strip(tag(n[1], 'ht:news_item_title')), link: strip(tag(n[1], 'ht:news_item_url')), source: strip(tag(n[1], 'ht:news_item_source')),
    }));
    out.push({ title: strip(tag(it, 'title')), traffic: strip(tag(it, 'ht:approx_traffic')), img: strip(tag(it, 'ht:picture')), date: Date.parse(tag(it, 'pubDate')) || 0, news });
  }
  return out;
}

async function get(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml, */*' }, signal: AbortSignal.timeout(7000) });
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.text();
}

async function cached(key, fn, ttl = 10 * 60000) {
  const c = cache.get(key);
  if (c && Date.now() - c.at < ttl) return c.data;
  const data = await fn();
  cache.set(key, { at: Date.now(), data });
  return data;
}

async function news(urls, limit = 40) {
  const res = await Promise.allSettled(urls.map(async (u) => parseRss(await get(u), u)));
  const seen = new Set(), all = [];
  for (const r of res) if (r.status === 'fulfilled') for (const it of r.value) {
    const k = it.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').slice(0, 60);
    if (!it.title || !it.link || seen.has(k)) continue;
    seen.add(k); all.push(it);
  }
  all.sort((a, b) => b.date - a.date);
  return { items: all.slice(0, limit), sources: res.filter((r) => r.status === 'fulfilled').length, total: urls.length };
}

export default async (req) => {
  const denied = await guard(req);
  if (denied) return denied;
  const q = new URL(req.url).searchParams;
  const kind = q.get('kind') || 'hot';
  const headers = { 'cache-control': 'private, max-age=300' };
  try {
    if (kind === 'trends') {
      const data = await cached('trends', async () => {
        for (const u of ['https://trends.google.com/trending/rss?geo=VN', 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=VN']) {
          try { const t = parseTrends(await get(u)); if (t.length) return { items: t.slice(0, 20) }; } catch {}
        }
        // Dự phòng: tin nổi bật Google News
        return { items: [], fallback: (await news(['https://news.google.com/rss?hl=vi&gl=VN&ceid=VN:vi'], 15)).items };
      });
      return json(data, 200, headers);
    }
    if (kind === 'traffic') {
      const city = (q.get('city') || 'Hà Nội').slice(0, 40);
      const data = await cached('traffic:' + city, () => news([GNEWS(`giao thông ${city} when:2d`), GNEWS(`ùn tắc ${city} when:2d`), GNEWS(`tai nạn ${city} when:1d`)], 15), 5 * 60000);
      return json(data, 200, headers);
    }
    const cat = FEEDS[kind] ? kind : 'hot';
    const data = await cached('news:' + cat, () => news(FEEDS[cat], 40));
    return json(data, 200, headers);
  } catch (e) {
    return json({ error: 'Không lấy được tin: ' + e.message, items: [] }, 502);
  }
};

export const config = { path: '/api/news' };
