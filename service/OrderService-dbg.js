sap.ui.define([], function () {
  "use strict";

  var FulfillmentType = /*#__PURE__*/function (FulfillmentType) {
    FulfillmentType["Delivery"] = "DELIVERY";
    FulfillmentType["Pickup"] = "PICKUP";
    return FulfillmentType;
  }(FulfillmentType || {});
  var CouponStatus = /*#__PURE__*/function (CouponStatus) {
    CouponStatus["Applied"] = "APPLIED";
    CouponStatus["NotBetter"] = "NOT_BETTER";
    return CouponStatus;
  }(CouponStatus || {});
  class OrderService {
    constructor(catalogModel) {
      this.catalogModel = catalogModel;
    }
    async submitOrder(contact, items) {
      const operation = this.catalogModel.bindContext("/SubmitOrder(...)");
      operation.setParameter("Order", {
        ...contact,
        Items: this.toItemsInput(items)
      });
      await operation.invoke();
      return operation.getBoundContext().getObject();
    }
    async quoteOrder(items, couponCode) {
      const operation = this.catalogModel.bindContext("/QuoteOrder(...)");
      operation.setParameter("Items", this.toItemsInput(items));
      operation.setParameter("CouponCode", couponCode || null);
      await operation.invoke();
      return operation.getBoundContext().getObject();
    }
    async activePromotions() {
      const operation = this.catalogModel.bindContext("/ActivePromotions(...)");
      await operation.invoke();
      return operation.getBoundContext().getObject().value;
    }
    async trackOrder(orderNumber, accessCode) {
      const operation = this.catalogModel.bindContext("/TrackOrder(...)");
      operation.setParameter("Number", orderNumber);
      operation.setParameter("AccessCode", accessCode);
      await operation.invoke();
      return operation.getBoundContext().getObject();
    }
    async lookupOrders(orders) {
      const operation = this.catalogModel.bindContext("/LookupOrders(...)");
      operation.setParameter("Orders", orders.map(order => ({
        Number: order.Number,
        AccessCode: order.AccessCode
      })));
      await operation.invoke();
      return operation.getBoundContext().getObject().value;
    }
    async requestOrderLinks(email) {
      const operation = this.catalogModel.bindContext("/RequestOrderLinks(...)");
      operation.setParameter("Email", email);
      await operation.invoke();
      return operation.getBoundContext().getObject().data;
    }
    toItemsInput(items) {
      return items.map(item => ({
        Variant_ID: item.VariantId,
        Quantity: item.Quantity
      }));
    }
  }
  OrderService.FulfillmentType = FulfillmentType;
  OrderService.CouponStatus = CouponStatus;
  return OrderService;
});
//# sourceMappingURL=OrderService-dbg.js.map
