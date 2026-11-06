/* eslint-disable fiori-custom/sap-no-navigator */
import BaseController from "./BaseController";
import MessageToast from "sap/m/MessageToast";
import { URLHelper } from "sap/m/library";
import type Input from "sap/m/Input";
import type JSONModel from "sap/ui/model/json/JSONModel";

/**
 * Tela exibida dentro de navegadores embutidos de apps (Instagram, Facebook etc.):
 * explica como abrir o site no navegador do celular. Dados vêm do model "inApp".
 *
 * @namespace apps.dflc.benditalook.controller
 */
export default class OpenInBrowser extends BaseController {

    public onInit(): void {
        const model = this.getInAppModel();
        const appName = model.getProperty("/appName") as string | null;
        const intro = appName ? this.getText("openInBrowserIntroApp", [appName]) : this.getText("openInBrowserIntro");

        model.setProperty("/intro", intro);
    }

    public onOpenExternal(): void {
        const externalUrl = this.getInAppModel().getProperty("/externalUrl") as string | null;

        if (externalUrl) {
            URLHelper.redirect(externalUrl, false);
        }
    }

    public async onCopyLink(): Promise<void> {
        const link = this.getInAppModel().getProperty("/link") as string;
        const copiedToClipboard = await this.writeClipboard(link);
        const copied = copiedToClipboard || this.copyFromSelection();

        MessageToast.show(this.getText(copied ? "openInBrowserCopied" : "openInBrowserCopyFailed"));
    }

    private async writeClipboard(text: string): Promise<boolean> {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            return false;
        }
    }

    // Fallback para navegadores embutidos sem a API de área de transferência.
    private copyFromSelection(): boolean {
        const input = (this.byId("openInBrowserLink") as Input).getFocusDomRef() as HTMLInputElement | null;

        input?.select();

        // eslint-disable-next-line fiori-custom/sap-no-exec-command -- único meio de copiar em WebViews sem Clipboard API
        return document.execCommand("copy");
    }

    private getInAppModel(): JSONModel {
        return this.getAppComponent().getModel("inApp") as JSONModel;
    }

}
