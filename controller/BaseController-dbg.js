sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/core/UIComponent", "sap/ui/core/routing/History", "sap/m/MessageBox", "sap/m/MessageToast", "sap/m/InstanceManager", "sap/ui/core/Fragment", "../model/formatter", "../util/feedback", "../util/pwa", "../util/http", "../auth/AuthenticationService", "../service/NewsletterService"], function (Controller, UIComponent, History, MessageBox, MessageToast, InstanceManager, Fragment, __formatter, ___util_feedback, ___util_pwa, ___util_http, ___auth_AuthenticationService, __NewsletterService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const formatter = _interopRequireDefault(__formatter);
  const getBackendErrorMessage = ___util_feedback["getBackendErrorMessage"];
  const promptInstall = ___util_pwa["promptInstall"];
  const isAuthenticationError = ___util_http["isAuthenticationError"];
  const isBackendUnavailableError = ___util_http["isBackendUnavailableError"];
  const isSessionExpiredError = ___util_http["isSessionExpiredError"];
  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  const NewsletterService = _interopRequireDefault(__NewsletterService);
  /**
   * @namespace apps.dflc.benditalook.controller
   */
  const BaseController = Controller.extend("apps.dflc.benditalook.controller.BaseController", {
    constructor: function constructor() {
      Controller.prototype.constructor.apply(this, arguments);
      this.formatter = formatter;
    },
    getRouter: function _getRouter() {
      return UIComponent.getRouterFor(this);
    },
    getAppComponent: function _getAppComponent() {
      return this.getOwnerComponent();
    },
    navTo: function _navTo(route, parameters, replace) {
      this.getRouter().navTo(route, parameters, replace);
    },
    onNavBack: function _onNavBack() {
      if (History.getInstance().getPreviousHash() !== undefined) {
        window.history.go(-1);
        return;
      }
      this.navTo("catalog", {}, true);
    },
    onGoHome: function _onGoHome() {
      this.navTo("catalog");
    },
    onOpenCart: function _onOpenCart() {
      this.navTo("cart");
    },
    onOpenAdmin: function _onOpenAdmin() {
      this.navTo("admin");
    },
    onOpenPolicy: function _onOpenPolicy(event) {
      const context = event.getSource().getBindingContext("catalog");
      const policy = context?.getObject();
      const key = policy?.Slug || policy?.Type || policy?.ID;
      if (key) {
        this.navTo("policy", {
          type: key
        });
      }
    },
    /** Abre o tutorial "Como comprar" em um diálogo com passo a passo. */onOpenHowToBuy: async function _onOpenHowToBuy() {
      await this.openHowToBuyDialog();
    },
    /** Fecha o diálogo do tutorial (botão e tecla Esc). */onCloseHowToBuy: function _onCloseHowToBuy() {
      this.howToBuyDialog?.close();
    },
    /** Abre a página de ajuda com o passo a passo completo. */onOpenHelp: function _onOpenHelp() {
      this.howToBuyDialog?.close();
      this.navTo("help");
    },
    onStartShopping: function _onStartShopping() {
      this.howToBuyDialog?.close();
      this.navTo("catalog");
    },
    onPreviousStep: function _onPreviousStep() {
      this.getHowToBuyCarousel()?.previous();
    },
    onNextStep: function _onNextStep() {
      this.getHowToBuyCarousel()?.next();
    },
    onHowToBuyPageChanged: function _onHowToBuyPageChanged(event) {
      const pageId = event.getParameter("newActivePageId");
      const index = event.getSource().getPages().findIndex(page => page.getId() === pageId);
      this.getHowToBuyModel().setProperty("/currentIndex", Math.max(index, 0));
    },
    onHowToBuyAction: function _onHowToBuyAction(event) {
      const step = event.getSource().getBindingContext("howToBuy")?.getObject();
      if (!step?.actionRoute) {
        return;
      }
      this.howToBuyDialog?.close();
      this.navTo(step.actionRoute, step.actionParams ?? {});
    },
    formatStepCounter: function _formatStepCounter(index, total) {
      return this.getText("howToBuyStepCounter", [(index ?? 0) + 1, total ?? 0]);
    },
    /** Carrega (uma única vez) e abre o diálogo do tutorial, sempre a partir do primeiro passo. */openHowToBuyDialog: async function _openHowToBuyDialog() {
      if (!this.howToBuyDialog) {
        this.howToBuyDialog = await Fragment.load({
          id: this.getView()?.getId(),
          name: "apps.dflc.benditalook.view.fragments.HowToBuyDialog",
          controller: this
        });
        this.getView()?.addDependent(this.howToBuyDialog);
      }
      this.getHowToBuyModel().setProperty("/currentIndex", 0);
      this.howToBuyDialog.attachEventOnce("afterOpen", () => this.showFirstHowToBuyStep());
      this.howToBuyDialog.open();
    },
    /** O carrossel só troca de página com o DOM renderizado, então o passo inicial é aplicado após a abertura. */showFirstHowToBuyStep: function _showFirstHowToBuyStep() {
      const carousel = this.getHowToBuyCarousel();
      const firstPage = carousel?.getPages()[0];
      if (carousel && firstPage) {
        carousel.setActivePage(firstPage);
      }
    },
    getHowToBuyCarousel: function _getHowToBuyCarousel() {
      return Fragment.byId(this.getView()?.getId() ?? "", "howToBuyCarousel");
    },
    getHowToBuyModel: function _getHowToBuyModel() {
      return this.getAppComponent().getModel("howToBuy");
    },
    /**
     * Botão "Instalar app" (visível só no navegador, model "pwa"): abre o prompt
     * nativo do Chrome/Edge ou, no iPhone, explica o "Adicionar à Tela de Início".
     */
    onInstallApp: async function _onInstallApp() {
      const model = this.getOwnerComponent()?.getModel("pwa");
      const result = await promptInstall(model);
      if (result === "ios") {
        MessageBox.information(this.getText("installIosMessage"), {
          title: this.getText("installIosTitle")
        });
      }
    },
    onContactWhatsapp: function _onContactWhatsapp() {
      this.openWhatsapp(this.getText("whatsappGreeting"));
    },
    onContactEmail: function _onContactEmail() {
      window.open(formatter.mailtoUrl(this.getStoreModel().getProperty("/ContactEmail")), "_self");
    },
    /**
     * Inscreve o visitante na newsletter usando o email digitado no rodapé.
     * Mostra a mensagem devolvida pelo backend (já inscrito, sucesso, etc.).
     */
    onNewsletterSubscribe: async function _onNewsletterSubscribe() {
      const model = this.getAppComponent().getModel("newsletter");
      const name = (model.getProperty("/name") ?? "").trim();
      const email = (model.getProperty("/email") ?? "").trim();
      if (!email) {
        MessageBox.error(this.getText("newsletterEmailRequired"));
        return;
      }
      model.setProperty("/busy", true);
      try {
        const result = await new NewsletterService(this.getCatalogModel()).subscribe({
          Name: name || undefined,
          Email: email
        });
        model.setProperty("/subscribed", true);
        model.setProperty("/name", "");
        model.setProperty("/email", "");
        MessageToast.show(result.Message || this.getText("newsletterSubscribedThanks"));
      } catch (error) {
        this.handleError(error, "newsletterError");
      } finally {
        model.setProperty("/busy", false);
      }
    },
    onOpenInstagram: function _onOpenInstagram() {
      window.open(formatter.instagramUrl(this.getStoreModel().getProperty("/Instagram")), "_blank");
    },
    openWhatsapp: function _openWhatsapp(message) {
      window.open(formatter.whatsappUrl(this.getStoreModel().getProperty("/Whatsapp"), message), "_blank");
    },
    formatStatus: function _formatStatus(status) {
      return status ? this.getText(`orderStatus.${status}`) : "";
    },
    formatDeliveryType: function _formatDeliveryType(deliveryType) {
      return deliveryType ? this.getText(`deliveryType.${deliveryType}`) : "";
    },
    formatChannel: function _formatChannel(channel) {
      return channel ? this.getText(`channel.${channel}`) : "";
    },
    formatFulfillment: function _formatFulfillment(fulfillment) {
      return fulfillment ? this.getText(`fulfillment.${fulfillment}`) : "";
    },
    // Tipos livres sem chave de tradução aparecem como digitados.
    formatPolicyType: function _formatPolicyType(type) {
      if (!type) {
        return "";
      }
      const key = `policyType.${type.toUpperCase()}`;
      const bundle = this.getAppComponent().getModel("i18n").getResourceBundle();
      return bundle.hasText(key) ? this.getText(key) : type;
    },
    formatBalance: function _formatBalance(balance) {
      const amount = Number(balance ?? 0);
      if (!amount) {
        return this.getText("balanceEven");
      }
      return this.getText(amount > 0 ? "balanceToPay" : "balanceToRefund", [formatter.currency(Math.abs(amount))]);
    },
    formatReturnItem: function _formatReturnItem(kind, quantity, ...details) {
      const restock = details[3];
      const description = formatter.variantDescription(...details.slice(0, 3));
      const text = this.getText(kind === "RETURNED" ? "returnedItemLine" : "replacementItemLine", [quantity ?? 0, description]);
      return kind === "RETURNED" && restock === false ? this.getText("returnedNoRestock", [text]) : text;
    },
    formatReward: function _formatReward(rewardType, rewardValue, gift, maxDiscount) {
      if (!rewardType) {
        return "";
      }
      const value = Number(rewardValue ?? 0);
      const details = {
        PERCENT: this.getText("rewardSummary.PERCENT", [value]),
        FIXED: this.getText("rewardSummary.FIXED", [this.formatter.currency(value)]),
        GIFT: this.getText("rewardSummary.GIFT", [gift ?? ""]),
        CHEAPEST_FREE: this.getText("rewardSummary.CHEAPEST_FREE")
      };
      const summary = details[rewardType] ?? "";
      return maxDiscount ? this.getText("rewardSummaryLimit", [summary, this.formatter.currency(Number(maxDiscount))]) : summary;
    },
    formatCouponUsage: function _formatCouponUsage(couponCode, usedCount, maxUses) {
      if (!couponCode) {
        return this.getText("automaticPromotion");
      }
      return maxUses ? this.getText("couponUsageLimited", [couponCode, usedCount ?? 0, maxUses]) : this.getText("couponUsage", [couponCode, usedCount ?? 0]);
    },
    formatPeriod: function _formatPeriod(startDate, endDate) {
      if (!startDate && !endDate) {
        return this.getText("noPeriod");
      }
      return this.getText("periodRange", [this.formatter.date(startDate) || "...", this.formatter.date(endDate) || "..."]);
    },
    refreshStoreInfo: function _refreshStoreInfo() {
      return this.getAppComponent().refreshStoreInfo();
    },
    getText: function _getText(key, parameters) {
      const bundle = this.getAppComponent().getModel("i18n").getResourceBundle();
      return bundle.getText(key, parameters) ?? key;
    },
    getCatalogModel: function _getCatalogModel() {
      return this.getAppComponent().getModel("catalog");
    },
    getCartModel: function _getCartModel() {
      return this.getAppComponent().getModel("cart");
    },
    getStoreModel: function _getStoreModel() {
      return this.getAppComponent().getModel("store");
    },
    ensureAdminModel: function _ensureAdminModel() {
      return this.getAppComponent().ensureAdminModel();
    },
    getAdminModel: function _getAdminModel() {
      return this.getAppComponent().getModel();
    },
    showToast: function _showToast(key, parameters) {
      MessageToast.show(this.getText(key, parameters));
    },
    confirm: function _confirm(key, parameters) {
      return new Promise(resolve => {
        MessageBox.confirm(this.getText(key, parameters), {
          onClose: action => resolve(action === MessageBox.Action.OK)
        });
      });
    },
    handleError: function _handleError(error, key) {
      if (isSessionExpiredError(error)) {
        return;
      }
      if (isAuthenticationError(error)) {
        AuthenticationService.notifySessionExpired();
        return;
      }
      if (isBackendUnavailableError(error)) {
        this.getAppComponent().notifyBackendUnavailable();
        return;
      }
      const detail = getBackendErrorMessage(error, text => this.getText(text));
      const message = this.getText(key);
      const isRepeated = !!detail && message.toLowerCase().includes(detail.replace(/[.!]+$/, "").toLowerCase());
      MessageBox.error(detail && !isRepeated ? `${message}\n\n${detail}` : message);
    },
    runBusy: async function _runBusy(action) {
      const controls = [this.getView(), ...InstanceManager.getOpenDialogs()];
      controls.forEach(control => control?.setBusy(true));
      try {
        return await action();
      } finally {
        controls.forEach(control => control?.setBusy(false));
      }
    }
  });
  return BaseController;
});
//# sourceMappingURL=BaseController-dbg.js.map
