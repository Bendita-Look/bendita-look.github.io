sap.ui.define(["sap/ui/model/json/JSONModel", "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "sap/ui/model/Sorter", "./BaseController"], function (JSONModel, Filter, FilterOperator, Sorter, __BaseController) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  const INITIAL_STATE = {
    hasSelection: false,
    isEmpty: false
  };
  const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /**
   * @namespace apps.dflc.benditalook.controller
   */
  const Policy = BaseController.extend("apps.dflc.benditalook.controller.Policy", {
    onInit: function _onInit() {
      this.policyModel = new JSONModel({
        ...INITIAL_STATE
      });
      this.getView()?.setModel(this.policyModel, "policy");
      this.getRouter().getRoute("policy")?.attachPatternMatched(event => void this.onRouteMatched(event));
    },
    onPolicyListUpdated: function _onPolicyListUpdated(event) {
      this.policyModel.setProperty("/isEmpty", event.getParameter("actual") === 0);
    },
    onBackToList: function _onBackToList() {
      this.navTo("policy", {});
    },
    onRouteMatched: async function _onRouteMatched(event) {
      const {
        type
      } = event.getParameter("arguments");
      this.policyModel.setProperty("/hasSelection", false);
      this.policyContent().unbindElement("catalog");
      if (type) {
        await this.selectPolicy(decodeURIComponent(type).trim());
      }
    },
    selectPolicy: async function _selectPolicy(key) {
      try {
        const path = await this.runBusy(() => this.findPolicyPath(key));
        if (path) {
          this.showPolicy(path);
        }
      } catch (error) {
        this.handleError(error, "policiesLoadError");
      }
    },
    findPolicyPath: async function _findPolicyPath(key) {
      if (GUID_PATTERN.test(key)) {
        return `/StorePolicies(${key})`;
      }
      const binding = this.getCatalogModel().bindList("/StorePolicies", undefined, [new Sorter("SortOrder")], [new Filter({
        filters: [new Filter({
          path: "Slug",
          operator: FilterOperator.EQ,
          value1: key,
          caseSensitive: false
        }), new Filter({
          path: "Type",
          operator: FilterOperator.EQ,
          value1: key,
          caseSensitive: false
        })],
        and: false
      })]);
      try {
        const contexts = await binding.requestContexts(0, 1);
        return contexts.length ? contexts[0].getPath() : undefined;
      } finally {
        binding.destroy();
      }
    },
    showPolicy: function _showPolicy(path) {
      this.policyContent().bindElement({
        path,
        model: "catalog"
      });
      this.policyModel.setProperty("/hasSelection", true);
    },
    policyContent: function _policyContent() {
      return this.byId("policyContent");
    }
  });
  return Policy;
});
//# sourceMappingURL=Policy-dbg.controller.js.map
