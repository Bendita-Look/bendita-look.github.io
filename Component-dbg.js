sap.ui.define(["sap/ui/core/UIComponent", "sap/ui/model/odata/v4/ODataModel", "sap/ui/model/json/JSONModel", "sap/m/MessageBox", "sap/m/MessageToast", "./model/models", "./util/pwa", "./model/CartModel", "./auth/AuthenticationService", "./auth/providers/AuthenticatedProviderFactory", "./auth/providers/XsuaaAuthHelper", "./auth/storage/SessionStorage", "./util/Environment", "./util/http", "./util/feedback", "./service/StoreService", "./service/PolicyService", "./service/OrderWatcher", "./util/notifications", "./util/sound", "./model/howToBuy"], function (BaseComponent, ODataModel, JSONModel, MessageBox, MessageToast, ___model_models, ___util_pwa, __CartModel, ___auth_AuthenticationService, ___auth_providers_AuthenticatedProviderFactory, ___auth_providers_XsuaaAuthHelper, ___auth_storage_SessionStorage, __Environment, ___util_http, ___util_feedback, __StoreService, __PolicyService, __OrderWatcher, ___util_notifications, ___util_sound, ___model_howToBuy) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const createDeviceModel = ___model_models["createDeviceModel"];
  const createPwaModel = ___util_pwa["createPwaModel"];
  const CartModel = _interopRequireDefault(__CartModel);
  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  const AuthenticatedProviderFactory = ___auth_providers_AuthenticatedProviderFactory["AuthenticatedProviderFactory"];
  const XsuaaAuthHelper = ___auth_providers_XsuaaAuthHelper["XsuaaAuthHelper"];
  const SessionStorage = ___auth_storage_SessionStorage["SessionStorage"];
  const Environment = _interopRequireDefault(__Environment);
  const isAuthenticationError = ___util_http["isAuthenticationError"];
  const isAuthorizationError = ___util_http["isAuthorizationError"];
  const isBackendUnavailableError = ___util_http["isBackendUnavailableError"];
  const isSessionExpiredError = ___util_http["isSessionExpiredError"];
  const getBackendErrorMessage = ___util_feedback["getBackendErrorMessage"];
  const StoreService = _interopRequireDefault(__StoreService);
  const PolicyService = _interopRequireDefault(__PolicyService);
  const OrderWatcher = _interopRequireDefault(__OrderWatcher);
  const createNotificationModel = ___util_notifications["createNotificationModel"];
  const showBrowserNotification = ___util_notifications["showBrowserNotification"];
  const playOrderChime = ___util_sound["playOrderChime"];
  const buildHowToBuySteps = ___model_howToBuy["buildHowToBuySteps"];
  const ADMIN_ROUTE = "admin";
  const LOGIN_ROUTE = "login";

  /**
   * @namespace apps.dflc.benditalook
   */
  const Component = BaseComponent.extend("apps.dflc.benditalook.Component", {
    constructor: function constructor() {
      BaseComponent.prototype.constructor.apply(this, arguments);
      this.sessionExpiredShown = false;
      this.unexpectedErrorShown = false;
      this.backendUnavailableShown = false;
      this.watcherListenerAttached = false;
    },
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]
    },
    init: function _init() {
      BaseComponent.prototype.init.call(this);
      void this.start();
    },
    start: async function _start() {
      await this.loadRuntimeConfig();
      AuthenticationService.initialize(AuthenticatedProviderFactory.create());
      AuthenticationService.onSessionExpired(() => this.handleSessionExpired());
      AuthenticationService.onAuthError(message => this.handleAuthError(message));
      AuthenticationService.onAuthChanged(() => void this.syncOrderWatcher());
      this.registerGlobalErrorHandlers();
      this.setModel(createDeviceModel(), "device");
      this.setModel(createPwaModel(), "pwa");
      this.setModel(createNotificationModel(), "notify");
      this.setModel(new CartModel(), "cart");
      this.setModel(new JSONModel({}), "store");
      this.setModel(new JSONModel({
        name: "",
        email: "",
        busy: false,
        subscribed: false
      }), "newsletter");
      this.setModel(this.createHowToBuyModel(), "howToBuy");
      this.setModel(this.createODataModel(XsuaaAuthHelper.getConfig().catalogService), "catalog");
      void this.refreshStoreInfo();
      void this.syncOrderWatcher();
      const router = this.getRouter();
      router.getTargetHandler().setCloseDialogs(false);
      router.initialize();
      await this.completeLoginRedirect();
    },
    /** Liga/desliga o vigia de pedidos conforme a sessão e registra o aviso de novos pedidos. */syncOrderWatcher: async function _syncOrderWatcher() {
      const watcher = OrderWatcher.getInstance();
      if (!this.watcherListenerAttached) {
        watcher.onOrders(orders => this.alertNewOrders(orders));
        this.watcherListenerAttached = true;
      }
      await watcher.sync();
    },
    /** Avisa o administrador: som, notificação do navegador e aviso interno na tela. */alertNewOrders: function _alertNewOrders(orders) {
      const first = orders[0];
      const count = orders.length;
      const title = count > 1 ? this.getText("orderAlertTitlePlural", [String(count)]) : this.getText("orderAlertTitle", [String(first.Number)]);
      const body = count > 1 ? this.getText("orderAlertBodyPlural", [String(count)]) : this.getText("orderAlertBody", [String(first.Number), first.CustomerName ?? ""]);
      playOrderChime();
      showBrowserNotification(title, body, `order-${first.ID}`);
      MessageToast.show(count > 1 ? title : body);
      window.dispatchEvent(new CustomEvent("bl-order-alert", {
        detail: {
          orders,
          title,
          body
        }
      }));
    },
    ensureAdminModel: async function _ensureAdminModel() {
      if (!(await AuthenticationService.isAuthenticated())) {
        return null;
      }
      const accessToken = AuthenticationService.getSession()?.accessToken ?? "";
      const current = this.getModel();
      if (current && current.getHttpHeaders().Authorization === this.authorizationHeader(accessToken)) {
        return current;
      }
      const model = this.createODataModel(XsuaaAuthHelper.getConfig().adminService, accessToken);
      this.setModel(model);
      current?.destroy();
      return model;
    },
    refreshStoreInfo: async function _refreshStoreInfo() {
      try {
        const catalogModel = this.getModel("catalog");
        const storeInfo = await new StoreService(catalogModel).storeInfo();
        this.getModel("store").setData(storeInfo);
      } catch (error) {
        if (isBackendUnavailableError(error)) {
          this.notifyBackendUnavailable();
        }
      }
      try {
        const policies = await new PolicyService(this.getModel("catalog")).list();
        this.getModel("store").setProperty("/Policies", policies);
      } catch (error) {
        if (isBackendUnavailableError(error)) {
          this.notifyBackendUnavailable();
        }
      }
    },
    notifyBackendUnavailable: function _notifyBackendUnavailable() {
      if (this.backendUnavailableShown) {
        return;
      }
      this.backendUnavailableShown = true;
      const retry = this.getText("retry");
      MessageBox.error(this.getText("backendUnavailable"), {
        actions: [retry, MessageBox.Action.CLOSE],
        emphasizedAction: retry,
        onClose: action => {
          this.backendUnavailableShown = false;
          if (action === retry) {
            window.location.reload();
          }
        }
      });
    },
    handleUnexpectedError: function _handleUnexpectedError(reason) {
      if (!reason || isSessionExpiredError(reason) || isBackendUnavailableError(reason) || this.unexpectedErrorShown) {
        return;
      }
      this.unexpectedErrorShown = true;
      const detail = getBackendErrorMessage(reason);
      const message = this.getText("unexpectedError");
      MessageBox.error(detail ? `${message}\n\n${detail}` : message, {
        onClose: () => {
          this.unexpectedErrorShown = false;
        }
      });
    },
    loadRuntimeConfig: async function _loadRuntimeConfig() {
      try {
        await XsuaaAuthHelper.loadRuntimeConfig();
      } catch (error) {
        console.error(error);
      }
      if (Environment.isLocal()) {
        XsuaaAuthHelper.setLocalOverrides();
        delete XsuaaAuthHelper.getConfig().auth;
      }
    },
    completeLoginRedirect: async function _completeLoginRedirect() {
      if (!new URLSearchParams(window.location.search).has("code")) {
        return;
      }
      if (await AuthenticationService.isAuthenticated()) {
        this.getRouter().navTo(ADMIN_ROUTE, {}, true);
      }
    },
    createODataModel: function _createODataModel(serviceUrl, accessToken = "") {
      const model = new ODataModel({
        serviceUrl,
        httpHeaders: accessToken ? {
          Authorization: this.authorizationHeader(accessToken)
        } : {},
        operationMode: "Server",
        autoExpandSelect: true,
        earlyRequests: true
      });
      model.attachSessionTimeout(() => AuthenticationService.notifySessionExpired());
      model.getMetaModel().requestObject("/").catch(error => {
        if (accessToken && isAuthenticationError(error)) {
          AuthenticationService.notifySessionExpired();
        } else if (!isAuthorizationError(error)) {
          this.notifyBackendUnavailable();
        }
      });
      return model;
    },
    authorizationHeader: function _authorizationHeader(accessToken) {
      return accessToken ? `Bearer ${accessToken}` : undefined;
    },
    registerGlobalErrorHandlers: function _registerGlobalErrorHandlers() {
      window.addEventListener("unhandledrejection", event => {
        event.preventDefault();
        this.handleUnexpectedError(event.reason);
      });
      window.addEventListener("error", event => this.handleUnexpectedError(event.error));
    },
    handleSessionExpired: function _handleSessionExpired() {
      if (this.sessionExpiredShown) {
        return;
      }
      this.sessionExpiredShown = true;
      SessionStorage.clear();
      MessageBox.warning(this.getText("sessionExpiredMessage"), {
        title: this.getText("sessionExpiredTitle"),
        onClose: () => {
          this.sessionExpiredShown = false;
          this.getRouter().navTo(LOGIN_ROUTE);
        }
      });
    },
    handleAuthError: function _handleAuthError(message) {
      MessageBox.error(this.getText("authError", [message]), {
        onClose: () => {
          AuthenticationService.clearAuthError();
          this.getRouter().navTo(LOGIN_ROUTE);
        }
      });
    },
    getText: function _getText(key, parameters) {
      const bundle = this.getModel("i18n").getResourceBundle();
      return bundle.getText(key, parameters) ?? key;
    },
    /** Passos do tutorial "como comprar", compartilhados entre o diálogo e a página de ajuda. */createHowToBuyModel: function _createHowToBuyModel() {
      return new JSONModel({
        steps: buildHowToBuySteps(key => this.getText(key))
      });
    }
  });
  return Component;
});
//# sourceMappingURL=Component-dbg.js.map
