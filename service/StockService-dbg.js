sap.ui.define([], function () {
  "use strict";

  class StockService {
    constructor(adminModel) {
      this.adminModel = adminModel;
    }
    async registerEntry(entry) {
      const operation = this.adminModel.bindContext("/RegisterStockEntry(...)");
      operation.setParameter("Entry", {
        Note: entry.Note,
        Items: entry.Items.map(item => ({
          Variant_ID: item.VariantId,
          Quantity: item.Quantity,
          UnitCost: item.UnitCost
        }))
      });
      await operation.invoke();
    }
    async deleteEntry(entryId) {
      const operation = this.adminModel.bindContext("/DeleteStockEntry(...)");
      operation.setParameter("EntryId", entryId);
      await operation.invoke();
      return operation.getBoundContext().getObject().data;
    }
  }
  return StockService;
});
//# sourceMappingURL=StockService-dbg.js.map
