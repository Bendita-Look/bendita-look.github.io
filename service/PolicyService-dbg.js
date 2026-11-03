sap.ui.define([], function () {
  "use strict";

  const POLICY_SELECT = "ID,Type,Title,Slug,SortOrder";
  class PolicyService {
    constructor(catalogModel) {
      this.catalogModel = catalogModel;
    }
    async list() {
      const contexts = await this.catalogModel.bindList("/StorePolicies", undefined, undefined, undefined, {
        $select: POLICY_SELECT,
        $orderby: "SortOrder,Title"
      }).requestContexts();
      return contexts.map(context => context.getObject());
    }
  }
  return PolicyService;
});
//# sourceMappingURL=PolicyService-dbg.js.map
