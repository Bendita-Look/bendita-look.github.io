sap.ui.define(["sap/ui/model/json/JSONModel", "sap/m/MessageBox", "./BaseController", "./admin/OrdersSection", "./admin/ProductsSection", "./admin/CategoriesSection", "./admin/PoliciesSection", "./admin/NewsletterSection", "./admin/BackupSection", "./admin/ReportsSection", "./admin/SettingsSection", "./admin/EmailServerSection", "./admin/PromotionsSection", "./admin/StoreSaleSection", "./admin/OrderEditSection", "./admin/OrderReturnSection", "./admin/ProductPicker", "./admin/WhatsappComposer", "./admin/StockSection", "../auth/AuthenticationService", "../util/notifications", "../util/sound"], function (JSONModel, MessageBox, __BaseController, __OrdersSection, __ProductsSection, __CategoriesSection, __PoliciesSection, __NewsletterSection, __BackupSection, __ReportsSection, __SettingsSection, __EmailServerSection, __PromotionsSection, __StoreSaleSection, __OrderEditSection, __OrderReturnSection, __ProductPicker, __WhatsappComposer, __StockSection, ___auth_AuthenticationService, ___util_notifications, ___util_sound) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  const OrdersSection = _interopRequireDefault(__OrdersSection);
  const ProductsSection = _interopRequireDefault(__ProductsSection);
  const CategoriesSection = _interopRequireDefault(__CategoriesSection);
  const PoliciesSection = _interopRequireDefault(__PoliciesSection);
  const NewsletterSection = _interopRequireDefault(__NewsletterSection);
  const BackupSection = _interopRequireDefault(__BackupSection);
  const ReportsSection = _interopRequireDefault(__ReportsSection);
  const SettingsSection = _interopRequireDefault(__SettingsSection);
  const EmailServerSection = _interopRequireDefault(__EmailServerSection);
  const PromotionsSection = _interopRequireDefault(__PromotionsSection);
  const StoreSaleSection = _interopRequireDefault(__StoreSaleSection);
  const OrderEditSection = _interopRequireDefault(__OrderEditSection);
  const OrderReturnSection = _interopRequireDefault(__OrderReturnSection);
  const ProductPicker = _interopRequireDefault(__ProductPicker);
  const WhatsappComposer = _interopRequireDefault(__WhatsappComposer);
  const StockSection = _interopRequireDefault(__StockSection);
  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  const requestNotificationPermission = ___util_notifications["requestNotificationPermission"];
  const unlockAudio = ___util_sound["unlockAudio"];
  const DEFAULT_TAB = "orders";
  const REPORTS_TAB = "reports";
  const SETTINGS_TAB = "settings";
  const NEWSLETTER_TAB = "newsletter";

  /**
   * @namespace apps.dflc.benditalook.controller
   */
  const Admin = BaseController.extend("apps.dflc.benditalook.controller.Admin", {
    constructor: function constructor() {
      BaseController.prototype.constructor.apply(this, arguments);
      this.orders = new OrdersSection(this);
      this.products = new ProductsSection(this);
      this.categories = new CategoriesSection(this);
      this.policies = new PoliciesSection(this);
      this.newsletter = new NewsletterSection(this);
      this.backup = new BackupSection(this);
      this.reports = new ReportsSection(this);
      this.settings = new SettingsSection(this);
      this.emailServer = new EmailServerSection(this);
      this.promotions = new PromotionsSection(this);
      this.storeSale = new StoreSaleSection(this);
      this.orderEdit = new OrderEditSection(this);
      this.orderReturn = new OrderReturnSection(this);
      this.productPicker = new ProductPicker(this);
      this.whatsapp = new WhatsappComposer(this);
      this.stock = new StockSection(this);
      /** Novo pedido enquanto o painel está aberto: atualiza a lista de pedidos. */
      this.onOrderAlert = () => {
        this.orders.refresh();
      };
    },
    onInit: function _onInit() {
      this.viewModel = new JSONModel({
        tab: DEFAULT_TAB,
        userName: ""
      });
      this.getView()?.setModel(this.viewModel, "adminView");
      this.getView()?.setModel(this.getAppComponent().getModel("notify"), "notify");
      this.getView()?.setModel(this.reports.model, "report");
      this.getView()?.setModel(this.settings.model, "settings");
      this.getView()?.setModel(this.emailServer.model, "emailServer");
      this.getView()?.setModel(this.orders.filterModel, "ordersFilter");
      this.getView()?.setModel(this.orders.stateModel, "ordersState");
      this.getView()?.setModel(this.products.filterModel, "productsFilter");
      this.getView()?.setModel(this.categories.model, "category");
      this.getView()?.setModel(this.policies.model, "policy");
      this.getView()?.setModel(this.newsletter.model, "newsletterAdmin");
      this.getRouter().getRoute("admin")?.attachPatternMatched(event => this.onRouteMatched(event));
      window.addEventListener("bl-order-alert", this.onOrderAlert);
    },
    onExit: function _onExit() {
      window.removeEventListener("bl-order-alert", this.onOrderAlert);
    },
    /** Pede ao navegador permissão para mostrar notificações de novos pedidos. */onEnableNotifications: async function _onEnableNotifications() {
      const model = this.getAppComponent().getModel("notify");
      unlockAudio();
      const permission = await requestNotificationPermission();
      model.setProperty("/permission", permission);
      if (permission === "granted") {
        this.showToast("notificationsEnabled");
      } else if (permission === "denied") {
        MessageBox.information(this.getText("notificationsBlocked"));
      }
    },
    onTabSelect: function _onTabSelect(event) {
      this.navTo("admin", {
        tab: event.getParameter("key")
      }, true);
    },
    onOpenStore: function _onOpenStore() {
      this.navTo("catalog");
    },
    onLogout: async function _onLogout() {
      await AuthenticationService.logout();
      this.navTo("catalog", {}, true);
    },
    byControlId: function _byControlId(id) {
      return this.byId(id);
    },
    onRouteMatched: async function _onRouteMatched(event) {
      const {
        tab
      } = event.getParameter("arguments");
      const adminModel = await this.ensureAdminModel();
      if (!adminModel) {
        this.navTo("login", {}, true);
        return;
      }
      const selectedTab = tab || DEFAULT_TAB;
      this.viewModel.setProperty("/tab", selectedTab);
      this.viewModel.setProperty("/userName", AuthenticationService.getSession()?.userName ?? "");
      this.orders.refresh();
      this.products.refresh();
      this.promotions.refresh();
      this.stock.refresh();
      if (selectedTab === REPORTS_TAB) {
        await this.reports.load();
      }
      if (selectedTab === SETTINGS_TAB) {
        await Promise.all([this.settings.load(), this.emailServer.load()]);
      }
      if (selectedTab === NEWSLETTER_TAB) {
        await this.newsletter.load();
      }
    }
  });
  return Admin;
});
//# sourceMappingURL=Admin-dbg.controller.js.map
