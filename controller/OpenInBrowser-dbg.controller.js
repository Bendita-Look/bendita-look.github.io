sap.ui.define(["./BaseController", "sap/m/MessageToast", "sap/m/library"], function (__BaseController, MessageToast, sap_m_library) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  /* eslint-disable fiori-custom/sap-no-navigator */
  const BaseController = _interopRequireDefault(__BaseController);
  const URLHelper = sap_m_library["URLHelper"];
  const OPEN_CHECK_DELAY_MS = 1500;

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
      model.setProperty("/intro", this.appText("openInBrowserIntro", appName));
      model.setProperty("/blockedText", this.appText("openInBrowserBlocked", appName));
    },
    onOpenExternal: function _onOpenExternal() {
      const model = this.getInAppModel();
      const externalUrl = model.getProperty("/externalUrl");
      if (externalUrl) {
        model.setProperty("/openFailed", false);
        URLHelper.redirect(externalUrl, false);
        this.flagIfStillInApp(model);
      }
    },
    // Apps como o Instagram bloqueiam o atalho sem erro: se a página continua visível, o link não saiu do app.
    flagIfStillInApp: function _flagIfStillInApp(model) {
      setTimeout(() => {
        if (document.visibilityState === "visible") {
          model.setProperty("/openFailed", true);
        }
      }, OPEN_CHECK_DELAY_MS);
    },
    appText: function _appText(key, appName) {
      return appName ? this.getText(`${key}App`, [appName]) : this.getText(key);
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
