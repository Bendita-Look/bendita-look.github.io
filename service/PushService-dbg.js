sap.ui.define(["../util/notifications", "../util/push"], function (___util_notifications, ___util_push) {
  "use strict";

  const notificationPermission = ___util_notifications["notificationPermission"];
  const requestNotificationPermission = ___util_notifications["requestNotificationPermission"];
  const arrayBufferToBase64Url = ___util_push["arrayBufferToBase64Url"];
  const browserUserAgent = ___util_push["browserUserAgent"];
  const currentPushSubscription = ___util_push["currentPushSubscription"];
  const hasApplicationServerKey = ___util_push["hasApplicationServerKey"];
  const pushSupported = ___util_push["pushSupported"];
  const serviceWorkerReady = ___util_push["serviceWorkerReady"];
  const urlBase64ToUint8Array = ___util_push["urlBase64ToUint8Array"];
  class PushService {
    constructor(adminModel) {
      this.adminModel = adminModel;
    }
    async publicKey() {
      const operation = this.adminModel.bindContext("/PushPublicKey(...)");
      await operation.invoke();
      return operation.getBoundContext().getObject().value;
    }
    async enable() {
      if (!pushSupported()) {
        return "unsupported";
      }
      const key = await this.publicKey();
      if (!key) {
        return "notConfigured";
      }
      const permission = await requestNotificationPermission();
      if (permission === "default") {
        return "dismissed";
      }
      if (permission === "denied") {
        return "denied";
      }
      if (permission !== "granted") {
        return "unsupported";
      }
      const subscription = await this.subscribe(key);
      await this.register(subscription);
      return "enabled";
    }

    /**
     * Mantém o servidor em dia com a inscrição atual (ex.: depois de importar backup).
     * Se a chave VAPID mudou, recria a inscrição (a permissão já está concedida, então não precisa de gesto).
     * Nunca pede permissão nem cria inscrição do zero.
     */
    async sync() {
      if (!pushSupported() || notificationPermission() !== "granted") {
        return false;
      }
      const current = await currentPushSubscription();
      if (!current) {
        return false;
      }
      const key = await this.publicKey();
      if (!key) {
        return false;
      }
      const subscription = hasApplicationServerKey(current, key) ? current : await this.subscribe(key);
      await this.register(subscription);
      return true;
    }
    async disable() {
      const subscription = await currentPushSubscription();
      if (!subscription) {
        return;
      }
      await this.unregister(subscription.endpoint);
      await subscription.unsubscribe();
    }
    async sendTest() {
      const operation = this.adminModel.bindContext("/SendPushTest(...)");
      await operation.invoke();
      return operation.getBoundContext().getObject().data;
    }
    async subscribe(key) {
      const current = await currentPushSubscription();
      if (current && hasApplicationServerKey(current, key)) {
        return current;
      }
      await current?.unsubscribe();
      const registration = await serviceWorkerReady();
      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key)
      });
    }
    async register(subscription) {
      const operation = this.adminModel.bindContext("/SubscribePush(...)");
      operation.setParameter("Endpoint", subscription.endpoint);
      operation.setParameter("P256dh", arrayBufferToBase64Url(subscription.getKey("p256dh")));
      operation.setParameter("Auth", arrayBufferToBase64Url(subscription.getKey("auth")));
      operation.setParameter("UserAgent", browserUserAgent());
      await operation.invoke();
    }
    async unregister(endpoint) {
      const operation = this.adminModel.bindContext("/UnsubscribePush(...)");
      operation.setParameter("Endpoint", endpoint);
      await operation.invoke();
    }
  }
  return PushService;
});
//# sourceMappingURL=PushService-dbg.js.map
