// Service Worker mínimo, só para receber notificações push.
self.addEventListener('push', (event) => {
    let data = { title: 'Amo-te, Maria ❤️', body: 'Alguém mudou de estado.' };
    try {
        if (event.data) data = event.data.json();
    } catch (_) {}

    event.waitUntil(
        self.registration.showNotification(data.title || 'Amo-te, Maria ❤️', {
            body: data.body || '',
            icon: 'favicon.svg',
            badge: 'favicon.svg'
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((list) => {
            for (const client of list) {
                if ('focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('/');
        })
    );
});
