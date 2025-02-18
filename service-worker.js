const CACHE_NAME = 'learning-hub-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/assets/images/logo-192.png',
    '/assets/images/logo-512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE.map(url => new Request(url, {mode: 'no-cors'})));
            })
            .catch(error => {
                console.error('Cache addAll error:', error);
                // Continue with service worker installation even if caching fails
                return Promise.resolve();
            })
    );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch Event Handler
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension requests
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    // Handle HTTPS requirement for API calls
    if (event.request.url.includes('api.aladhan.com')) {
        const secureUrl = event.request.url.replace('http://', 'https://');
        event.respondWith(
            fetch(secureUrl, { 
                mode: 'cors',
                credentials: 'omit'
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }

                // Clone the request because it can only be used once
                const fetchRequest = event.request.clone();

                // Only cache same-origin requests
                if (!fetchRequest.url.startsWith(self.location.origin) && 
                    !fetchRequest.url.startsWith('https://cdnjs.cloudflare.com')) {
                    return fetch(fetchRequest);
                }

                return fetch(fetchRequest).then((response) => {
                    // Check if response is valid
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response because it can only be used once
                    const responseToCache = response.clone();

                    // Only cache successful responses from our origin
                    if (fetchRequest.url.startsWith(self.location.origin)) {
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            })
                            .catch(error => {
                                console.error('Cache put error:', error);
                            });
                    }

                    return response;
                }).catch(error => {
                    console.error('Fetch error:', error);
                    // Return a fallback response or let the error propagate
                    return new Response('Offline content not available');
                });
            })
    );
}); 