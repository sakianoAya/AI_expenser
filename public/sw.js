self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title || 'DailyApp 提醒'
    const options = {
      body: data.body || '您有一則新提醒',
      icon: '/icon-192x192.png',
      badge: '/icon.svg',
      data: data.data || { url: '/dashboard' },
      vibrate: [200, 100, 200]
    }

    event.waitUntil(self.registration.showNotification(title, options))
  } catch (err) {
    // Fallback if data is not JSON
    event.waitUntil(
      self.registration.showNotification('DailyApp', {
        body: event.data.text()
      })
    )
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i]
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }
      // If none, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
