const CACHE_NAME = 'toolbox-v3';
const PRECACHE_URLS = ['/manifest.json', '/logo.svg'];

const ASSET_CONTENT_TYPES = {
  '.css': 'text/css',
  '.js': 'javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
};

function getExpectedContentType(pathname) {
  const matchedExt = Object.keys(ASSET_CONTENT_TYPES).find((ext) => pathname.endsWith(ext));
  return matchedExt ? ASSET_CONTENT_TYPES[matchedExt] : null;
}

function isValidAssetResponse(request, response) {
  const { pathname } = new URL(request.url);
  const expectedType = getExpectedContentType(pathname);
  if (!expectedType) return true;

  const contentType = response.headers.get('content-type') || '';
  return contentType.includes(expectedType);
}

function assetNotFoundResponse() {
  return new Response('', {
    status: 404,
    statusText: 'Asset Not Found',
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

// 安装时预缓存关键资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

// 允许页面侧主动触发等待中的 SW 立即接管
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;

    return fetch(request).then((response) => {
      if (!isValidAssetResponse(request, response)) {
        return assetNotFoundResponse();
      }

      if (response.ok && response.type === 'basic') {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
      }
      return response;
    });
  });
}

function networkFirst(request) {
  return fetch(request).then((response) => {
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && response.type === 'basic' && contentType.includes('text/html')) {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
    }
    return response;
  }).catch(() => caches.match(request).then((cached) => cached || caches.match('/')));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Vite 产物带内容哈希,适合缓存优先;HTML 使用上面的网络优先避免发布后卡旧版本
  if (url.pathname.startsWith('/assets/') || url.pathname === '/logo.svg' || url.pathname === '/manifest.json') {
    event.respondWith(cacheFirst(request));
  }
});
