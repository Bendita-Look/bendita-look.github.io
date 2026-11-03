sap.ui.define(["sap/ui/util/Storage", "../auth/AuthenticationService", "../auth/providers/XsuaaAuthHelper", "../util/http"], function (Storage, ___auth_AuthenticationService, ___auth_providers_XsuaaAuthHelper, ___util_http) {
  "use strict";

  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  const XsuaaAuthHelper = ___auth_providers_XsuaaAuthHelper["XsuaaAuthHelper"];
  const buildAuthHeaders = ___util_http["buildAuthHeaders"];
  const POLL_INTERVAL = 30_000;
  const FIRST_RUN_LOOKBACK = 5 * 60 * 1000;
  const MAX_PER_POLL = 20;
  const STORAGE_KEY = "orders.watermark";
  /**
   * Vigia novos pedidos enquanto o administrador está logado — não importa em
   * qual tela ele esteja. Faz polling no serviço administrativo e entrega os
   * pedidos novos para quem escuta (o Component cuida do som e do aviso).
   *
   * A marca d'água (createdAt do último pedido visto) fica no localStorage,
   * assim o vigia não repete avisos entre recargas.
   */
  class OrderWatcher {
    static instance = null;
    started = false;
    polling = false;
    listeners = new Set();
    storage = new Storage(Storage.Type.local, "benditaLook");
    constructor() {
      this.watermark = this.storedWatermark() ?? new Date(Date.now() - FIRST_RUN_LOOKBACK).toISOString();
    }
    static getInstance() {
      if (!this.instance) {
        this.instance = new OrderWatcher();
      }
      return this.instance;
    }
    onOrders(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    /** (Re)inicia o vigia ao entrar/sair, para não vazar timers nem avisar deslogado. */
    async sync() {
      if (await AuthenticationService.isAuthenticated()) {
        this.start();
      } else {
        this.stop();
      }
    }
    start() {
      if (this.started) {
        return;
      }
      this.started = true;
      void this.poll();
      this.timer = setInterval(() => void this.poll(), POLL_INTERVAL);
    }
    stop() {
      this.started = false;
      clearInterval(this.timer);
      this.timer = undefined;
    }
    async poll() {
      if (this.polling) {
        return;
      }
      this.polling = true;
      try {
        const orders = await this.fetchNewOrders();
        if (orders.length) {
          const latest = orders[orders.length - 1];
          this.watermark = latest.createdAt ?? new Date().toISOString();
          this.storeWatermark(this.watermark);
          this.listeners.forEach(listener => listener(orders));
        }
      } catch {
        // Sem rede/sessão: tenta de novo no próximo ciclo.
      } finally {
        this.polling = false;
      }
    }
    async fetchNewOrders() {
      const query = new URLSearchParams({
        $filter: `createdAt gt ${this.watermark}`,
        $select: "ID,Number,CustomerName,TotalAmount,createdAt",
        $orderby: "createdAt asc",
        $top: String(MAX_PER_POLL)
      });
      const response = await fetch(`${XsuaaAuthHelper.getConfig().adminService}Orders?${query.toString()}`, {
        headers: buildAuthHeaders()
      });
      if (!response.ok) {
        return [];
      }
      const payload = await response.json();
      return payload.value ?? [];
    }
    storedWatermark() {
      return this.storage.get(STORAGE_KEY) ?? null;
    }
    storeWatermark(value) {
      this.storage.put(STORAGE_KEY, value);
    }
  }
  return OrderWatcher;
});
//# sourceMappingURL=OrderWatcher-dbg.js.map
