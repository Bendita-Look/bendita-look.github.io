/*
 * Service worker do Bendita Look: recebe as notificações push de novas vendas
 * mesmo com o app fechado. Precisa ficar na raiz do webapp para ter escopo do site todo.
 * Não faz cache nem intercepta requisições: só cuida de push e de clique na notificação.
 */

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

function readPayload(event) {
    if (!event.data) {
        return {};
    }

    try {
        return event.data.json() ?? {};
    } catch {
        return { body: event.data.text() };
    }
}

function assetUrl(path) {
    return new URL(path, self.registration.scope).href;
}

function showPushNotification(event) {
    const payload = readPayload(event);

    return self.registration.showNotification(payload.title || "Bendita Look", {
        body: payload.body,
        tag: payload.tag,
        renotify: !!payload.tag,
        icon: assetUrl("img/icon-192.png"),
        badge: assetUrl("img/favicon.png"),
        data: { url: payload.url || self.registration.scope }
    });
}

async function openNotificationUrl(url) {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const client = windows.find((windowClient) => windowClient.url.startsWith(self.registration.scope));

    if (!client) {
        return self.clients.openWindow(url);
    }

    await client.focus();

    try {
        return await client.navigate(url);
    } catch {
        return self.clients.openWindow(url);
    }
}

self.addEventListener("push", (event) => {
    event.waitUntil(showPushNotification(event));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(openNotificationUrl(event.notification.data?.url || self.registration.scope));
});
