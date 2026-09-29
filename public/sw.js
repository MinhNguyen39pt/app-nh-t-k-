// Service worker tối giản: giúp app cài được như app riêng và mở nhanh hơn.
// Không bao giờ lưu /api (dữ liệu nhật ký luôn lấy mới từ máy chủ).
const CACHE = 'nhat-ky-v1';
const SHELL = ['/', '/index.html', '/app.css', '/app.js', '/tuvi.js', '/manifest.webmanifest', '/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  // Mạng trước, mất mạng thì dùng bản đã lưu
  e.respondWith(
    fetch(e.request)
      .then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(u.pathname === '/' ? '/' : e.request, copy)); } return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/')))
  );
});
