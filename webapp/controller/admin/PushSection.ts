import Fragment from "sap/ui/core/Fragment";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import type ActionSheet from "sap/m/ActionSheet";
import type Button from "sap/m/Button";
import type { Button$PressEvent } from "sap/m/Button";
import type JSONModel from "sap/ui/model/json/JSONModel";
import type Admin from "../Admin.controller";
import PushService from "../../service/PushService";
import type { PushEnableResult } from "../../service/PushService";
import { isIos, isStandalone } from "../../util/pwa";
import { notificationPermission, requestNotificationPermission } from "../../util/notifications";
import type { NotificationPermissionState } from "../../util/notifications";
import { unlockAudio } from "../../util/sound";

export default class PushSection {

    private menu?: ActionSheet;

    private synced = false;

    constructor(private readonly controller: Admin) { }

    // Botão do header: ativa as notificações ou, se já ativas, abre o menu do aparelho.
    public onPress = async (event: Button$PressEvent): Promise<void> => {
        if (this.notifyModel().getProperty("/pushEnabled") as boolean) {
            await this.openMenu(event.getSource());
            return;
        }

        unlockAudio();
        await this.enable();
    };

    public onSendTest = async (): Promise<void> => {
        try {
            const message = await this.controller.runBusy(() => this.service().sendTest());

            MessageToast.show(message);
        } catch (error) {
            this.controller.handleError(error, "pushError");
        }
    };

    public onDisable = async (): Promise<void> => {
        try {
            await this.controller.runBusy(() => this.service().disable());
            this.setEnabled(false);
            this.controller.showToast("pushDisabled");
        } catch (error) {
            this.controller.handleError(error, "pushError");
        }
    };

    /** Ao abrir o painel, mantém a inscrição do aparelho em dia. Roda uma vez por carga do app; erros são ignorados. */
    public async sync(): Promise<void> {
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
    public async beforeLogout(): Promise<void> {
        try {
            await this.service().disable();
        } catch {
            // Falha de rede ou de sessão não pode impedir o logout.
        } finally {
            this.setEnabled(false);
        }
    }

    private async enable(): Promise<void> {
        try {
            await this.handleEnableResult(await this.service().enable());
        } catch (error) {
            this.controller.handleError(error, "pushError");
        }
    }

    private async handleEnableResult(result: PushEnableResult): Promise<void> {
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

    private async handleUnsupported(): Promise<void> {
        if (isIos() && !isStandalone()) {
            MessageBox.information(this.controller.getText("pushIosInstallHint"));
            return;
        }

        await this.requestPermissionAlone();
    }

    /** Comportamento anterior ao push: só a permissão, para os avisos com o painel aberto. */
    private async requestPermissionAlone(): Promise<void> {
        const permission = await this.requestBrowserPermission();

        if (permission === "granted") {
            this.controller.showToast("notificationsEnabled");
        } else if (permission === "denied") {
            MessageBox.information(this.controller.getText("notificationsBlocked"));
        }
    }

    private async requestBrowserPermission(): Promise<NotificationPermissionState> {
        const permission = await requestNotificationPermission();

        this.notifyModel().setProperty("/permission", permission);

        return permission;
    }

    private refreshPermission(): void {
        this.notifyModel().setProperty("/permission", notificationPermission());
    }

    private setEnabled(enabled: boolean): void {
        this.notifyModel().setProperty("/pushEnabled", enabled);
    }

    private async openMenu(button: Button): Promise<void> {
        const menu = await this.getMenu();

        menu.openBy(button);
    }

    private async getMenu(): Promise<ActionSheet> {
        if (!this.menu) {
            const view = this.controller.getView();

            this.menu = await Fragment.load({
                id: view?.getId(),
                name: "apps.dflc.benditalook.view.fragments.PushMenu",
                controller: this.controller
            }) as ActionSheet;

            view?.addDependent(this.menu);
        }

        return this.menu;
    }

    private notifyModel(): JSONModel {
        return this.controller.getView()?.getModel("notify") as JSONModel;
    }

    private service(): PushService {
        return new PushService(this.controller.getAdminModel());
    }

}
