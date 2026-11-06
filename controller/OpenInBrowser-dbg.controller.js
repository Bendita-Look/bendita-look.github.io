sap.ui.define(["./BaseController", "sap/m/MessageToast", "sap/m/library"], function (__BaseController, MessageToast, sap_m_library) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  /* eslint-disable fiori-custom/sap-no-navigator */
  const BaseController = _interopRequireDefault(__BaseController);
  const URLHelper = sap_m_library["URLHelper"];
  /**
   * Tela exibida dentro de navegadores embutidos de apps (Instagram, Facebook etc.):
   * explica como abrir o site no navegador do celular. Dados vêm do model "inApp".
   *
   * @namespace apps.dflc.benditalook.controller
   */
  const OpenInBrowser = BaseController.extend("apps.dflc.benditalook.controller.OpenInBrowser", {
    onInit: function _onInit() {
      const model = this.getInAppModel();
      const appName = model.getProperty("/appName");
      const intro = appName ? this.getText("openInBrowserIntroApp", [appName]) : this.getText("openInBrowserIntro");
      model.setProperty("/intro", intro);
    },
    onOpenExternal: function _onOpenExternal() {
      const externalUrl = this.getInAppModel().getProperty("/externalUrl");
      if (externalUrl) {
        URLHelper.redirect(externalUrl, false);
      }
    },
    onCopyLink: async function _onCopyLink() {
      const link = this.getInAppModel().getProperty("/link");
      const copiedToClipboard = await this.writeClipboard(link);
      const copied = copiedToClipboard || this.copyFromSelection();
      MessageToast.show(this.getText(copied ? "openInBrowserCopied" : "openInBrowserCopyFailed"));
    },
    writeClipboard: async function _writeClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return false;
      }
    },
    // Fallback para navegadores embutidos sem a API de área de transferência.
    copyFromSelection: function _copyFromSelection() {
      const input = this.byId("openInBrowserLink").getFocusDomRef();
      input?.select();

      // eslint-disable-next-line fiori-custom/sap-no-exec-command -- único meio de copiar em WebViews sem Clipboard API
      return document.execCommand("copy");
    },
    getInAppModel: function _getInAppModel() {
      return this.getAppComponent().getModel("inApp");
    }
  });
  return OpenInBrowser;
});
//# sourceMappingURL=OpenInBrowser-dbg.controller.js.map
