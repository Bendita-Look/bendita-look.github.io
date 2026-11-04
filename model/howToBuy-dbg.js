sap.ui.define([], function () {
  "use strict";

  /** Etapas numeradas do tutorial "como comprar", compartilhadas entre o diálogo e a página de ajuda. */
  const STEPS = [{
    id: "choose",
    icon: "sap-icon://search",
    action: {
      route: "catalog"
    }
  }, {
    id: "size",
    icon: "sap-icon://measure"
  }, {
    id: "cart",
    icon: "sap-icon://cart",
    action: {
      route: "cart"
    }
  }, {
    id: "checkout",
    icon: "sap-icon://form"
  }, {
    id: "whatsapp",
    icon: "sap-icon://discussion"
  }, {
    id: "track",
    icon: "sap-icon://shipping-status",
    action: {
      route: "myOrders"
    }
  }, {
    id: "exchange",
    icon: "sap-icon://journey-change",
    action: {
      route: "policy",
      params: {
        type: "RETURN"
      }
    }
  }];
  function buildStepAction(step, getText) {
    if (!step.action) {
      return {};
    }
    return {
      actionText: getText(`howToBuy.${step.id}.action`),
      actionRoute: step.action.route,
      actionParams: step.action.params
    };
  }
  function buildHowToBuySteps(getText) {
    return STEPS.map((step, index) => ({
      id: step.id,
      icon: step.icon,
      number: index + 1,
      title: getText(`howToBuy.${step.id}.title`),
      text: getText(`howToBuy.${step.id}.text`),
      ...buildStepAction(step, getText)
    }));
  }
  var __exports = {
    __esModule: true
  };
  __exports.buildHowToBuySteps = buildHowToBuySteps;
  return __exports;
});
//# sourceMappingURL=howToBuy-dbg.js.map
