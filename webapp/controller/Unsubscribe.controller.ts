import JSONModel from "sap/ui/model/json/JSONModel";
import type { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import BaseController from "./BaseController";
import NewsletterService from "../service/NewsletterService";

type UnsubscribeState = "idle" | "confirm" | "done" | "error";

interface UnsubscribeModel {
    state: UnsubscribeState;
    busy: boolean;
    message: string;
}

/**
 * @namespace apps.dflc.benditalook.controller
 */
export default class Unsubscribe extends BaseController {

    private token = "";

    private model: JSONModel;

    public onInit(): void {
        this.model = new JSONModel({ state: "idle", busy: false, message: "" } as UnsubscribeModel);
        this.getView()?.setModel(this.model, "unsubscribe");
        this.getRouter().getRoute("unsubscribe")?.attachPatternMatched((event) => this.onRouteMatched(event));
    }

    /** Confirma o descadastro: só executa quando o visitante clica, evitando pré-visualizações. */
    public async onConfirm(): Promise<void> {
        if (!this.token) {
            return;
        }

        this.model.setProperty("/busy", true);

        try {
            const result = await new NewsletterService(this.getCatalogModel()).unsubscribe(this.token);

            this.model.setProperty("/state", "done");
            this.model.setProperty("/message", result.Message || this.getText("unsubscribedSuccess"));
        } catch (error) {
            this.model.setProperty("/state", "error");
            this.model.setProperty("/message", this.getText("unsubscribeError"));
        } finally {
            this.model.setProperty("/busy", false);
        }
    }

    private onRouteMatched(event: Route$PatternMatchedEvent): void {
        const { token } = event.getParameter("arguments") as { token?: string };

        this.token = token ? decodeURIComponent(token) : "";

        this.model.setData({
            state: this.token ? "confirm" : "error",
            busy: false,
            message: this.token ? "" : this.getText("unsubscribeInvalidLink")
        } as UnsubscribeModel);
    }

}
