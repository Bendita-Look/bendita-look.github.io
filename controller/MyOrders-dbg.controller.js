sap.ui.define(["sap/ui/model/json/JSONModel", "./BaseController", "../service/ContactStorage", "../service/MyOrdersStorage", "../service/OrderService"], function (JSONModel, __BaseController, __ContactStorage, __MyOrdersStorage, __OrderService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  const ContactStorage = _interopRequireDefault(__ContactStorage);
  const MyOrdersStorage = _interopRequireDefault(__MyOrdersStorage);
  const OrderService = _interopRequireDefault(__OrderService);
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * @namespace apps.dflc.benditalook.controller
   */
  const MyOrders = BaseController.extend("apps.dflc.benditalook.controller.MyOrders", {
    onInit: function _onInit() {
      this.model = new JSONModel(this.initialState());
      this.getView()?.setModel(this.model, "myOrders");
      this.getRouter().getRoute("myOrders")?.attachPatternMatched(() => this.onRouteMatched());
    },
    onOpenOrder: function _onOpenOrder(event) {
      const order = this.getOrderOf(event.getSource());
      if (order) {
        this.navTo("order", {
          orderNumber: order.Number,
          accessCode: order.AccessCode
        });
      }
    },
    onRemoveOrder: function _onRemoveOrder(event) {
      const order = this.getOrderOf(event.getParameter("listItem"));
      if (!order) {
        return;
      }
      const orders = this.model.getProperty("/orders");
      MyOrdersStorage.remove(order.Number);
      this.syncOrderPush();
      this.model.setProperty("/orders", orders.filter(item => item.Number !== order.Number));
      this.showToast("myOrdersRemoved");
    },
    onRequestLinks: async function _onRequestLinks() {
      const email = this.model.getProperty("/email").trim();
      if (!EMAIL_PATTERN.test(email)) {
        this.model.setProperty("/emailState", "Error");
        return;
      }
      this.model.setProperty("/emailState", "None");
      this.model.setProperty("/sending", true);
      try {
        const message = await new OrderService(this.getCatalogModel()).requestOrderLinks(email);
        this.model.setProperty("/sentMessage", message);
      } catch (error) {
        this.handleError(error, "myOrdersRecoverError");
      } finally {
        this.model.setProperty("/sending", false);
      }
    },
    onRouteMatched: function _onRouteMatched() {
      this.model.setProperty("/email", ContactStorage.load().CustomerEmail ?? "");
      void this.loadOrders();
    },
    /** A lista vem só dos pedidos guardados no aparelho; o servidor devolve apenas os que ainda existem. */loadOrders: async function _loadOrders() {
      const storedOrders = MyOrdersStorage.list();
      if (!storedOrders.length) {
        this.model.setProperty("/orders", []);
        return;
      }
      this.model.setProperty("/loading", true);
      try {
        const orders = await new OrderService(this.getCatalogModel()).lookupOrders(storedOrders);
        this.model.setProperty("/orders", orders);
        MyOrdersStorage.keep(orders.map(order => order.Number));
      } catch (error) {
        this.handleError(error, "myOrdersLoadError");
      } finally {
        this.model.setProperty("/loading", false);
      }
    },
    getOrderOf: function _getOrderOf(control) {
      return control?.getBindingContext("myOrders")?.getObject();
    },
    initialState: function _initialState() {
      return {
        loading: false,
        orders: [],
        email: "",
        emailState: "None",
        sending: false,
        sentMessage: ""
      };
    }
  });
  return MyOrders;
});
//# sourceMappingURL=MyOrders-dbg.controller.js.map
