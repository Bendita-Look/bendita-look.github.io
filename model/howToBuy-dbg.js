sap.ui.define([], function () {
  "use strict";

  /** Etapas numeradas do tutorial "como comprar", compartilhadas entre o diálogo e a página de ajuda. */
  const STEPS = [{
    id: "choose",
    icon: "sap-icon://search"
  }, {
    id: "size",
    icon: "sap-icon://measure"
  }, {
    id: "cart",
    icon: "sap-icon://cart"
  }, {
    id: "checkout",
    icon: "sap-icon://form"
  }, {
    id: "whatsapp",
    icon: "sap-icon://discussion"
  }, {
    id: "track",
    icon: "sap-icon://shipping-status"
  }];
  function buildHowToBuySteps(getText) {
    return STEPS.map(step => ({
      id: step.id,
      icon: step.icon,
      title: getText(`howToBuy.${step.id}.title`),
      text: getText(`howToBuy.${step.id}.text`)
    }));
  }
  var __exports = {
    __esModule: true
  };
  __exports.buildHowToBuySteps = buildHowToBuySteps;
  return __exports;
});
//# sourceMappingURL=howToBuy-dbg.js.map
