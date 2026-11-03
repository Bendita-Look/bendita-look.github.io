sap.ui.define(["./BaseController"], function (__BaseController) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  /**
   * Página de ajuda "Como comprar": mostra o passo a passo completo, com os
   * mesmos dados do diálogo do tutorial (model "howToBuy", definido no Component).
   *
   * @namespace apps.dflc.benditalook.controller
   */
  const Help = BaseController.extend("apps.dflc.benditalook.controller.Help", {
    onInit: function _onInit() {
      // Nada a carregar: os passos vêm do model "howToBuy" do Component.
    },
    onOpenCatalog: function _onOpenCatalog() {
      this.navTo("catalog");
    }
  });
  return Help;
});
//# sourceMappingURL=Help-dbg.controller.js.map
