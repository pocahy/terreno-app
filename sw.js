// Service worker mínimo do Terreno: só existe para permitir notificações
// no Android e abrir o app ao tocar nelas. Não guarda cache de propósito,
// assim toda atualização subida no GitHub aparece na hora.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return self.clients.openWindow('./');
    })
  );
});
