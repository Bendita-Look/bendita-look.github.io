sap.ui.define(["sap/ui/core/Fragment", "sap/m/MessageBox", "sap/m/MessageToast", "../../service/PushService", "../../util/pwa", "../../util/notifications", "../../util/sound"], function (Fragment, MessageBox, MessageToast, __PushService, ____util_pwa, ____util_notifications, ____util_sound) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const PushService = _interopRequireDefault(__PushService);
  const isIos = ____util_pwa["isIos"];
  const isStandalone = ____util_pwa["isStandalone"];
  const notificationPermission = ____util_notifications["notificationPermission"];
  const requestNotificationPermission = ____util_notifications["requestNotificationPermission"];
  const unlockAudio = ____util_sound["unlockAudio"];
  class PushSection {
    synced = false;
    constructor(controller) {
      this.controller = controller;
    }

    // Botão do header: ativa as notificações ou, se já ativas, abre o menu do aparelho.
    onPress = async event => {
      if (this.notifyModel().getProperty("/pushEnabled")) {
        await this.openMenu(event.getSource());
        return;
      }
      unlockAudio();
      await this.enable();
    };
    onSendTest = async () => {
      try {
        const message = await this.controller.runBusy(() => this.service().sendTest());
        MessageToast.show(message);
      } catch (error) {
        this.controller.handleError(error, "pushError");
      }
    };
    onDisable = async () => {
      try {
        await this.controller.runBusy(() => this.service().disable());
        this.setEnabled(false);
        this.controller.showToast("pushDisabled");
      } catch (error) {
        this.controller.handleError(error, "pushError");
      }
    };

    /** Ao abrir o painel, mantém a inscrição do aparelho em dia. Roda uma vez por carga do app; erros são ignorados. */
    async sync() {
      if (this.synced) {
        return;
      }
      this.synced = true;
      try {
        this.setEnabled(await this.service().sync());
      } catch {
        this.setEnabled(false);
      }
    }

    /** Aparelho compartilhado não pode continuar recebendo vendas depois de sair; falha aqui não impede o logout. */
    async beforeLogout() {
      try {
        await this.service().disable();
      } catch {
        // Falha de rede ou de sessão não pode impedir o logout.
      } finally {
        this.setEnabled(false);
      }
    }
    async enable() {
      try {
        await this.handleEnableResult(await this.service().enable());
      } catch (error) {
        this.controller.handleError(error, "pushError");
      }
    }
    async handleEnableResult(result) {
      switch (result) {
        case "enabled":
          this.setEnabled(true);
          this.refreshPermission();
          this.controller.showToast("pushEnabledToast");
          return;
        case "dismissed":
          this.refreshPermission();
          return;
        case "denied":
          this.refreshPermission();
          MessageBox.information(this.controller.getText("notificationsBlocked"));
          return;
        case "notConfigured":
          await this.requestBrowserPermission();
          MessageBox.information(this.controller.getText("pushNotConfigured"));
          return;
        case "unsupported":
          await this.handleUnsupported();
          return;
      }
    }
    async handleUnsupported() {
      if (isIos() && !isStandalone()) {
        MessageBox.information(this.controller.getText("pushIosInstallHint"));
        return;
      }
      await this.requestPermissionAlone();
    }

    /** Comportamento anterior ao push: só a permissão, para os avisos com o painel aberto. */
    async requestPermissionAlone() {
      const permission = await this.requestBrowserPermission();
      if (permission === "granted") {
        this.controller.showToast("notificationsEnabled");
      } else if (permission === "denied") {
        MessageBox.information(this.controller.getText("notificationsBlocked"));
      }
    }
    async requestBrowserPermission() {
      const permission = await requestNotificationPermission();
      this.notifyModel().setProperty("/permission", permission);
      return permission;
    }
    refreshPermission() {
      this.notifyModel().setProperty("/permission", notificationPermission());
    }
    setEnabled(enabled) {
      this.notifyModel().setProperty("/pushEnabled", enabled);
    }
    async openMenu(button) {
      const menu = await this.getMenu();
      menu.openBy(button);
    }
    async getMenu() {
      if (!this.menu) {
        const view = this.controller.getView();
        this.menu = await Fragment.load({
          id: view?.getId(),
          name: "apps.dflc.benditalook.view.fragments.PushMenu",
          controller: this.controller
        });
        view?.addDependent(this.menu);
      }
      return this.menu;
    }
    notifyModel() {
      return this.controller.getView()?.getModel("notify");
    }
    service() {
      return new PushService(this.controller.getAdminModel());
    }
  }
  return PushSection;
});
//# sourceMappingURL=PushSection-dbg.js.map
