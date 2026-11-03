sap.ui.define(["sap/ui/model/json/JSONModel", "./BaseController", "../service/PolicyService"], function (JSONModel, __BaseController, __PolicyService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  const PolicyService = _interopRequireDefault(__PolicyService);
  /**
   * @namespace apps.dflc.benditalook.controller
   */
  const Policy = BaseController.extend("apps.dflc.benditalook.controller.Policy", {
    onInit: function _onInit() {
      this.policyModel = new JSONModel(this.emptyState());
      this.getView()?.setModel(this.policyModel, "policy");
      this.getRouter().getRoute("policy")?.attachPatternMatched(event => this.onRouteMatched(event));
    },
    onPolicyPress: function _onPolicyPress(event) {
      const policy = event.getSource().getBindingContext("policy")?.getObject();
      this.showPolicy(policy);
    },
    onPolicySelect: function _onPolicySelect(event) {
      const policy = event.getParameter("listItem")?.getBindingContext("policy")?.getObject();
      if (policy) {
        this.showPolicy(policy);
      }
    },
    onRouteMatched: async function _onRouteMatched(event) {
      const {
        type
      } = event.getParameter("arguments");
      this.policyModel.setData(this.emptyState());
      try {
        const all = await this.runBusy(() => new PolicyService(this.getCatalogModel()).list());
        this.policyModel.setProperty("/all", all);
        this.policyModel.setProperty("/loaded", true);
        const selected = this.findPolicy(all, type);
        if (selected) {
          this.showPolicy(selected);
        }
      } catch (error) {
        this.handleError(error, "policiesLoadError");
      }
    },
    findPolicy: function _findPolicy(policies, type) {
      if (!type) {
        return policies.length === 1 ? policies[0] : undefined;
      }
      const normalized = decodeURIComponent(type).trim().toLowerCase();
      return policies.find(policy => (policy.Slug ?? "").toLowerCase() === normalized) ?? policies.find(policy => policy.Type.toLowerCase() === normalized) ?? policies.find(policy => policy.ID.toLowerCase() === normalized);
    },
    showPolicy: function _showPolicy(policy) {
      this.policyModel.setProperty("/policy", policy);
      this.policyModel.setProperty("/hasSelection", true);
    },
    emptyState: function _emptyState() {
      return {
        loaded: false,
        all: [],
        policy: null,
        hasSelection: false
      };
    }
  });
  return Policy;
});
//# sourceMappingURL=Policy-dbg.controller.js.map
