sap.ui.define(["sap/ui/model/json/JSONModel", "./BaseController", "../service/NewsletterService"], function (JSONModel, __BaseController, __NewsletterService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  const NewsletterService = _interopRequireDefault(__NewsletterService);
  /**
   * @namespace apps.dflc.benditalook.controller
   */
  const Unsubscribe = BaseController.extend("apps.dflc.benditalook.controller.Unsubscribe", {
    constructor: function constructor() {
      BaseController.prototype.constructor.apply(this, arguments);
      this.token = "";
    },
    onInit: function _onInit() {
      this.model = new JSONModel({
        state: "idle",
        busy: false,
        message: ""
      });
      this.getView()?.setModel(this.model, "unsubscribe");
      this.getRouter().getRoute("unsubscribe")?.attachPatternMatched(event => this.onRouteMatched(event));
    },
    /** Confirma o descadastro: só executa quando o visitante clica, evitando pré-visualizações. */onConfirm: async function _onConfirm() {
      if (!this.token) {
        return;
      }
      this.model.setProperty("/busy", true);
      try {
        const result = await new NewsletterService(this.getCatalogModel()).unsubscribe(this.token);
        this.model.setProperty("/state", "done");
        this.model.setProperty("/message", result.Message || this.getText("unsubscribedSuccess"));
      } catch (error) {
        this.model.setProperty("/state", "error");
        this.model.setProperty("/message", this.getText("unsubscribeError"));
      } finally {
        this.model.setProperty("/busy", false);
      }
    },
    onRouteMatched: function _onRouteMatched(event) {
      const {
        token
      } = event.getParameter("arguments");
      this.token = token ? decodeURIComponent(token) : "";
      this.model.setData({
        state: this.token ? "confirm" : "error",
        busy: false,
        message: this.token ? "" : this.getText("unsubscribeInvalidLink")
      });
    }
  });
  return Unsubscribe;
});
//# sourceMappingURL=Unsubscribe-dbg.controller.js.map
