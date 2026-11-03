sap.ui.define(["sap/ui/model/Filter", "sap/ui/model/FilterOperator"], function (Filter, FilterOperator) {
  "use strict";

  /**
   * Serviço de newsletter: usa o modelo público (Catalog) para o cadastro no rodapé
   * e o modelo administrativo (BenditaLook) para envio e contagem de inscritos.
   */
  class NewsletterService {
    constructor(model) {
      this.model = model;
    }
    async subscribe(input) {
      const operation = this.model.bindContext("/Subscribe(...)");
      operation.setParameter("Input", input);
      await operation.invoke();
      return operation.getBoundContext().getObject();
    }
    async unsubscribe(token) {
      const operation = this.model.bindContext("/Unsubscribe(...)");
      operation.setParameter("Token", token);
      await operation.invoke();
      return operation.getBoundContext().getObject();
    }
    async send(input) {
      const operation = this.model.bindContext("/SendNewsletter(...)");
      operation.setParameter("Campaign", input);
      await operation.invoke();
      return operation.getBoundContext().getObject();
    }
    async activeCount() {
      const binding = this.model.bindList("/Subscribers", undefined, undefined, [new Filter("Active", FilterOperator.EQ, true)], {
        $count: true,
        $$groupId: "$direct"
      });
      try {
        await binding.requestContexts(0, 1);
        return binding.getCount() ?? 0;
      } finally {
        binding.destroy();
      }
    }
  }
  return NewsletterService;
});
//# sourceMappingURL=NewsletterService-dbg.js.map
