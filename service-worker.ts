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

self.addEventListener("fetch", (event: any) => {
	caches.match(event.request).then((cacheHit) => {
		if (!cacheHit) {
			event.respondWith(fetch(event.request));
			return;
		}

		const promiseChain = fetch(event.request)
			.then((response) => {
				console.log(response);
				if (response.ok) {
					return response;
				}
				throw `bad response ${response.status}`;
			})
			.catch(() => {
				return (
					cacheHit ||
					new Response(
						`Device offline and file not in cache: ${event.request?.url}`,
						{
							status: 404,
						}
					)
				);
			});

		event.respondWith(promiseChain);
	});
});
