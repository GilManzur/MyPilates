self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.notification?.title || 'MyPilates'
  const options = {
    body: data.notification?.body || '',
    dir: 'rtl',
    lang: 'he',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})
