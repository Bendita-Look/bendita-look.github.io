sap.ui.define(["sap/ui/model/json/JSONModel"], function (JSONModel) {
  "use strict";

  /**
   * Notificações do navegador (Web Notifications) para avisar o administrador
   * sobre novos pedidos mesmo quando ele está em outra aba/parte do site.
   * A permissão é pedida pelo botão no painel; se negada, o app ainda toca o som
   * e mostra o aviso interno.
   */

  function notificationSupported() {
    return typeof window !== "undefined" && "Notification" in window;
  }
  function notificationPermission() {
    return notificationSupported() ? Notification.permission : "unsupported";
  }

  /** Model "notify": controla o botão de ativar avisos e mostra o estado atual. */
  function createNotificationModel() {
    return new JSONModel({
      supported: notificationSupported(),
      permission: notificationPermission()
    });
  }

  /** Pede a permissão do navegador; devolve o estado final. */
  async function requestNotificationPermission() {
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
  function showBrowserNotification(title, body, tag) {
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
  var __exports = {
    __esModule: true
  };
  __exports.notificationSupported = notificationSupported;
  __exports.notificationPermission = notificationPermission;
  __exports.createNotificationModel = createNotificationModel;
  __exports.requestNotificationPermission = requestNotificationPermission;
  __exports.showBrowserNotification = showBrowserNotification;
  return __exports;
});
//# sourceMappingURL=notifications-dbg.js.map
