import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * Notificações do navegador (Web Notifications) para avisar o administrador
 * sobre novos pedidos mesmo quando ele está em outra aba/parte do site.
 * A permissão é pedida pelo botão no painel; se negada, o app ainda toca o som
 * e mostra o aviso interno.
 */

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

export function notificationSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermissionState {
    return notificationSupported() ? Notification.permission : "unsupported";
}

/** Model "notify": controla o botão de ativar avisos e mostra o estado atual. */
export function createNotificationModel(): JSONModel {
    return new JSONModel({
        supported: notificationSupported(),
        permission: notificationPermission()
    });
}

/** Pede a permissão do navegador; devolve o estado final. */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
    if (!notificationSupported()) {
        return "unsupported";
    }

    try {
        return await Notification.requestPermission();
    } catch {
        return notificationPermission();
    }
}

/** Mostra uma notificação do navegador; falha em silêncio se não houver permissão. */
export function showBrowserNotification(title: string, body: string, tag: string): void {
    if (notificationPermission() !== "granted") {
        return;
    }

    try {
        const notification = new Notification(title, {
            body,
            tag,
            icon: "img/favicon.png",
            badge: "img/favicon.png"
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } catch {
        // Alguns navegadores (ex.: iOS no Safari) exigem o Service Worker.
    }
}
