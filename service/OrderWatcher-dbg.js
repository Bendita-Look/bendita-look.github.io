sap.ui.define(["sap/ui/util/Storage", "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "sap/ui/model/Sorter", "../auth/AuthenticationService", "../util/http"], function (Storage, Filter, FilterOperator, Sorter, ___auth_AuthenticationService, ___util_http) {
  "use strict";

  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  const isAuthenticationError = ___util_http["isAuthenticationError"];
  const isAuthorizationError = ___util_http["isAuthorizationError"];
  const POLL_INTERVAL = 30_000;
  const FIRST_RUN_LOOKBACK = 5 * 60 * 1000;
  const MAX_PER_POLL = 20;
  const STORAGE_KEY = "orders.watermark";
  /**
   * Vigia novos pedidos enquanto o administrador está logado — não importa em
   * qual tela ele esteja. Faz polling no serviço administrativo (OData V4) e entrega
   * os pedidos novos para quem escuta (o Component cuida do som e do aviso).
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
    constructor(resolveAdminModel) {
      this.resolveAdminModel = resolveAdminModel;
      this.watermark = this.storedWatermark() ?? new Date(Date.now() - FIRST_RUN_LOOKBACK).toISOString();
    }
    static getInstance(resolveAdminModel) {
      if (!this.instance) {
        this.instance = new OrderWatcher(resolveAdminModel);
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
      document.addEventListener("visibilitychange", this.onVisibilityChange);
    }
    stop() {
      this.started = false;
      clearInterval(this.timer);
      this.timer = undefined;
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
    }

    /** Ao voltar para a aba, consulta na hora em vez de esperar o próximo ciclo. */
    onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void this.poll();
      }
    };
    async poll() {
      if (this.polling || document.visibilityState === "hidden") {
        return;
      }
      this.polling = true;
      this.watermark = this.storedWatermark() ?? this.watermark;
      try {
        const orders = await this.fetchNewOrders();
        if (orders.length) {
          const latest = orders[orders.length - 1];
          this.watermark = latest.createdAt ?? new Date().toISOString();
          this.storeWatermark(this.watermark);
          this.listeners.forEach(listener => listener(orders));
        }
      } catch (error) {
        this.handleFailure(error);
      } finally {
        this.polling = false;
      }
    }

    // 401/403: para o timer. Só a sessão expirada (401) mostra o aviso padrão; outras falhas tentam no próximo ciclo.
    handleFailure(error) {
      if (!isAuthorizationError(error)) {
        return;
      }
      this.stop();
      if (isAuthenticationError(error)) {
        AuthenticationService.notifySessionExpired();
      }
    }
    async fetchNewOrders() {
      const model = await this.resolveAdminModel();
      if (!model) {
        this.stop();
        return [];
      }
      const binding = model.bindList("/Orders", undefined, [new Sorter("createdAt")], [new Filter("createdAt", FilterOperator.GT, this.watermark)], {
        $select: "ID,Number,CustomerName,TotalAmount,createdAt",
        $$groupId: "$direct"
      });
      try {
        const contexts = await binding.requestContexts(0, MAX_PER_POLL);
        return contexts.map(context => context.getObject());
      } finally {
        binding.destroy();
      }
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
