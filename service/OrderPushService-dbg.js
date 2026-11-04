sap.ui.define(["sap/ui/util/Storage", "./MyOrdersStorage", "../util/notifications", "../util/push"], function (Storage, __MyOrdersStorage, ___util_notifications, ___util_push) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const MyOrdersStorage = _interopRequireDefault(__MyOrdersStorage);
  const notificationPermission = ___util_notifications["notificationPermission"];
  const requestNotificationPermission = ___util_notifications["requestNotificationPermission"];
  const arrayBufferToBase64Url = ___util_push["arrayBufferToBase64Url"];
  const currentPushSubscription = ___util_push["currentPushSubscription"];
  const ensurePushSubscription = ___util_push["ensurePushSubscription"];
  const hasApplicationServerKey = ___util_push["hasApplicationServerKey"];
  const pushSupported = ___util_push["pushSupported"];
  const STORAGE_KEY = "benditaLook.orderPush";

  /**
   * Avisos de status dos pedidos (Web Push da loja). O servidor só sabe quais pedidos avisar
   * quando recebe a lista do aparelho, então a inscrição é sempre enviada com MyOrdersStorage.
   */
  class OrderPushService {
    static storage = new Storage(Storage.Type.local);
    constructor(catalogModel) {
      this.catalogModel = catalogModel;
    }
    isEnabled() {
      return OrderPushService.storage.get(STORAGE_KEY) === true;
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
      const subscription = await ensurePushSubscription(key);
      await this.register(subscription);
      this.setEnabled(true);
      return "enabled";
    }

    /**
     * Envia a lista atual de pedidos do aparelho ao servidor. Nunca pede permissão nem cria inscrição do zero;
     * se a chave VAPID mudou, recria a inscrição (a permissão já está concedida).
     */
    async sync() {
      if (!this.isEnabled() || !pushSupported() || notificationPermission() !== "granted") {
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
      const subscription = hasApplicationServerKey(current, key) ? current : await ensurePushSubscription(key);
      await this.register(subscription);
      return true;
    }

    /** Não cancela a inscrição do navegador: o mesmo aparelho pode receber os avisos de venda do admin. */
    async disable() {
      const subscription = await currentPushSubscription();
      if (subscription) {
        await this.unregister(subscription.endpoint);
      }
      this.setEnabled(false);
    }
    async publicKey() {
      const operation = this.catalogModel.bindContext("/PushPublicKey(...)");
      await operation.invoke();

      // Sem VAPID o servidor responde 204 e o contexto fica sem objeto.
      return operation.getBoundContext().getObject()?.value ?? null;
    }
    async register(subscription) {
      const operation = this.catalogModel.bindContext("/SubscribeOrdersPush(...)");
      operation.setParameter("Endpoint", subscription.endpoint);
      operation.setParameter("P256dh", arrayBufferToBase64Url(subscription.getKey("p256dh")));
      operation.setParameter("Auth", arrayBufferToBase64Url(subscription.getKey("auth")));
      operation.setParameter("Orders", this.trackedOrders());
      await operation.invoke();
    }
    async unregister(endpoint) {
      const operation = this.catalogModel.bindContext("/UnsubscribeOrdersPush(...)");
      operation.setParameter("Endpoint", endpoint);
      await operation.invoke();
    }
    trackedOrders() {
      return MyOrdersStorage.list().map(order => ({
        Number: order.Number,
        AccessCode: order.AccessCode
      }));
    }
    setEnabled(enabled) {
      OrderPushService.storage.put(STORAGE_KEY, enabled);
    }
  }
  return OrderPushService;
});
//# sourceMappingURL=OrderPushService-dbg.js.map
