sap.ui.define(["sap/ui/util/Storage"], function (Storage) {
  "use strict";

  const STORAGE_KEY = "benditaLook.myOrders";
  const MAX_ORDERS = 50;

  /** Pedidos guardados neste aparelho; é a única fonte da lista "Meus pedidos" (nunca filtrada pelo e-mail). */
  class MyOrdersStorage {
    static storage = new Storage(Storage.Type.local);
    static list() {
      return this.storage.get(STORAGE_KEY) ?? [];
    }
    static add(orderNumber, accessCode) {
      const others = this.list().filter(order => order.Number !== orderNumber);
      const order = {
        Number: orderNumber,
        AccessCode: accessCode,
        SavedAt: new Date().toISOString()
      };
      this.write([order, ...others]);
    }
    static remove(orderNumber) {
      this.write(this.list().filter(order => order.Number !== orderNumber));
    }
    static keep(orderNumbers) {
      this.write(this.list().filter(order => orderNumbers.includes(order.Number)));
    }
    static write(orders) {
      this.storage.put(STORAGE_KEY, orders.slice(0, MAX_ORDERS));
    }
  }
  return MyOrdersStorage;
});
//# sourceMappingURL=MyOrdersStorage-dbg.js.map
