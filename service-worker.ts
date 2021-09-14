self.addEventListener("install", function (event: any) {
	event.waitUntil(
		caches.open("sw-cache").then((cache) => {
			return cache.addAll([
				"index.html",
				"index.js",
				"index.css",
				"manifest.json",
				"favicon.ico",
				"service-worker.js",
				"/icons/android-chrome-192x192.png",
				"/icons/android-chrome-512x512.png",
			]);
		})
	);
});

self.addEventListener("fetch", function (event: any) {
	event.respondWith(
		caches.match(event.request).then(function (response) {
			return response || fetch(event.request);
		})
	);
});
