self.addEventListener("install", function (event: any) {
	event.waitUntil(
		caches.open("sw-cache").then((cache) => {
			return cache.addAll([
				"index.html",
				"index.ts",
				"index.css",
				"favicon.ico",
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
