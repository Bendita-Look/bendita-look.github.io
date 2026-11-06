/* eslint-disable fiori-custom/sap-no-navigator */
import BaseController from "./BaseController";
import MessageToast from "sap/m/MessageToast";
import { URLHelper } from "sap/m/library";
import type Input from "sap/m/Input";
import type JSONModel from "sap/ui/model/json/JSONModel";

const OPEN_CHECK_DELAY_MS = 1500;

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

        model.setProperty("/intro", this.appText("openInBrowserIntro", appName));
        model.setProperty("/blockedText", this.appText("openInBrowserBlocked", appName));
    }

    public onOpenExternal(): void {
        const model = this.getInAppModel();
        const externalUrl = model.getProperty("/externalUrl") as string | null;

        if (externalUrl) {
            model.setProperty("/openFailed", false);
            URLHelper.redirect(externalUrl, false);
            this.flagIfStillInApp(model);
        }
    }

    // Apps como o Instagram bloqueiam o atalho sem erro: se a página continua visível, o link não saiu do app.
    private flagIfStillInApp(model: JSONModel): void {
        setTimeout(() => {
            if (document.visibilityState === "visible") {
                model.setProperty("/openFailed", true);
            }
        }, OPEN_CHECK_DELAY_MS);
    }

    private appText(key: string, appName: string | null): string {
        return appName ? this.getText(`${key}App`, [appName]) : this.getText(key);
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
