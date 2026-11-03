import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import History from "sap/ui/core/routing/History";
import type Router from "sap/ui/core/routing/Router";
import type Event from "sap/ui/base/Event";
import type Control from "sap/ui/core/Control";
import type Context from "sap/ui/model/odata/v4/Context";
import type ResourceModel from "sap/ui/model/resource/ResourceModel";
import type ResourceBundle from "sap/base/i18n/ResourceBundle";
import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import InstanceManager from "sap/m/InstanceManager";
import Fragment from "sap/ui/core/Fragment";
import type Dialog from "sap/m/Dialog";
import type { Button$PressEvent } from "sap/m/Button";
import type Carousel from "sap/m/Carousel";
import type { Carousel$PageChangedEvent } from "sap/m/Carousel";
import formatter from "../model/formatter";
import type CartModel from "../model/CartModel";
import type { HowToBuyStep } from "../model/howToBuy";
import type Component from "../Component";
import { getBackendErrorMessage } from "../util/feedback";
import { promptInstall } from "../util/pwa";
import { isAuthenticationError, isBackendUnavailableError, isSessionExpiredError } from "../util/http";
import { AuthenticationService } from "../auth/AuthenticationService";
import NewsletterService from "../service/NewsletterService";

/**
 * @namespace apps.dflc.benditalook.controller
 */
export default abstract class BaseController extends Controller {

    public readonly formatter = formatter;

    private howToBuyDialog?: Dialog;

    protected getRouter(): Router {
        return UIComponent.getRouterFor(this);
    }

    protected getAppComponent(): Component {
        return this.getOwnerComponent() as unknown as Component;
    }

    public navTo(route: string, parameters?: object, replace?: boolean): void {
        this.getRouter().navTo(route, parameters, replace);
    }

    public onNavBack(): void {
        if (History.getInstance().getPreviousHash() !== undefined) {
            window.history.go(-1);
            return;
        }

        this.navTo("catalog", {}, true);
    }

    public onGoHome(): void {
        this.navTo("catalog");
    }

    public onOpenCart(): void {
        this.navTo("cart");
    }

    public onOpenAdmin(): void {
        this.navTo("admin");
    }

    public onOpenPolicy(event: Event): void {
        const context = event.getSource<Control>().getBindingContext("catalog") as Context | undefined;
        const policy = context?.getObject() as { Slug?: string | null; Type?: string; ID?: string } | undefined;
        const key = policy?.Slug || policy?.Type || policy?.ID;

        if (key) {
            this.navTo("policy", { type: key });
        }
    }

    /** Abre o tutorial "Como comprar" em um diálogo com passo a passo. */
    public async onOpenHowToBuy(): Promise<void> {
        await this.openHowToBuyDialog();
    }

    /** Fecha o diálogo do tutorial (botão e tecla Esc). */
    public onCloseHowToBuy(): void {
        this.howToBuyDialog?.close();
    }

    /** Abre a página de ajuda com o passo a passo completo. */
    public onOpenHelp(): void {
        this.howToBuyDialog?.close();
        this.navTo("help");
    }

    public onStartShopping(): void {
        this.howToBuyDialog?.close();
        this.navTo("catalog");
    }

    public onPreviousStep(): void {
        this.getHowToBuyCarousel()?.previous();
    }

    public onNextStep(): void {
        this.getHowToBuyCarousel()?.next();
    }

    public onHowToBuyPageChanged(event: Carousel$PageChangedEvent): void {
        const pageId = event.getParameter("newActivePageId");
        const index = event.getSource().getPages().findIndex((page) => page.getId() === pageId);

        this.getHowToBuyModel().setProperty("/currentIndex", Math.max(index, 0));
    }

    public onHowToBuyAction(event: Button$PressEvent): void {
        const step = event.getSource().getBindingContext("howToBuy")?.getObject() as HowToBuyStep | undefined;

        if (!step?.actionRoute) {
            return;
        }

        this.howToBuyDialog?.close();
        this.navTo(step.actionRoute, step.actionParams ?? {});
    }

    public formatStepCounter(index: number | undefined, total: number | undefined): string {
        return this.getText("howToBuyStepCounter", [(index ?? 0) + 1, total ?? 0]);
    }

    /** Carrega (uma única vez) e abre o diálogo do tutorial, sempre a partir do primeiro passo. */
    protected async openHowToBuyDialog(): Promise<void> {
        if (!this.howToBuyDialog) {
            this.howToBuyDialog = await Fragment.load({
                id: this.getView()?.getId(),
                name: "apps.dflc.benditalook.view.fragments.HowToBuyDialog",
                controller: this
            }) as Dialog;

            this.getView()?.addDependent(this.howToBuyDialog);
        }

        this.resetHowToBuyStep();
        this.howToBuyDialog.open();
    }

    private resetHowToBuyStep(): void {
        const carousel = this.getHowToBuyCarousel();
        const firstPage = carousel?.getPages()[0];

        if (carousel && firstPage) {
            carousel.setActivePage(firstPage);
        }

        this.getHowToBuyModel().setProperty("/currentIndex", 0);
    }

    private getHowToBuyCarousel(): Carousel | undefined {
        return Fragment.byId(this.getView()?.getId() ?? "", "howToBuyCarousel") as Carousel | undefined;
    }

    private getHowToBuyModel(): JSONModel {
        return this.getAppComponent().getModel("howToBuy") as JSONModel;
    }

    /**
     * Botão "Instalar app" (visível só no navegador, model "pwa"): abre o prompt
     * nativo do Chrome/Edge ou, no iPhone, explica o "Adicionar à Tela de Início".
     */
    public async onInstallApp(): Promise<void> {
        const model = this.getOwnerComponent()?.getModel("pwa") as JSONModel;
        const result = await promptInstall(model);

        if (result === "ios") {
            MessageBox.information(this.getText("installIosMessage"), {
                title: this.getText("installIosTitle")
            });
        }
    }

    public onContactWhatsapp(): void {
        this.openWhatsapp(this.getText("whatsappGreeting"));
    }

    public onContactEmail(): void {
        window.open(formatter.mailtoUrl(this.getStoreModel().getProperty("/ContactEmail") as string), "_self");
    }

    /**
     * Inscreve o visitante na newsletter usando o email digitado no rodapé.
     * Mostra a mensagem devolvida pelo backend (já inscrito, sucesso, etc.).
     */
    public async onNewsletterSubscribe(): Promise<void> {
        const model = this.getAppComponent().getModel("newsletter") as JSONModel;
        const name = ((model.getProperty("/name") as string) ?? "").trim();
        const email = ((model.getProperty("/email") as string) ?? "").trim();

        if (!email) {
            MessageBox.error(this.getText("newsletterEmailRequired"));
            return;
        }

        model.setProperty("/busy", true);

        try {
            const result = await new NewsletterService(this.getCatalogModel()).subscribe({ Name: name || undefined, Email: email });

            model.setProperty("/subscribed", true);
            model.setProperty("/name", "");
            model.setProperty("/email", "");
            MessageToast.show(result.Message || this.getText("newsletterSubscribedThanks"));
        } catch (error) {
            this.handleError(error, "newsletterError");
        } finally {
            model.setProperty("/busy", false);
        }
    }

    public onOpenInstagram(): void {
        window.open(formatter.instagramUrl(this.getStoreModel().getProperty("/Instagram") as string), "_blank");
    }

    protected openWhatsapp(message: string): void {
        window.open(formatter.whatsappUrl(this.getStoreModel().getProperty("/Whatsapp") as string, message), "_blank");
    }

    public formatStatus(status: string | null | undefined): string {
        return status ? this.getText(`orderStatus.${status}`) : "";
    }

    public formatDeliveryType(deliveryType: string | null | undefined): string {
        return deliveryType ? this.getText(`deliveryType.${deliveryType}`) : "";
    }

    public formatChannel(channel: string | null | undefined): string {
        return channel ? this.getText(`channel.${channel}`) : "";
    }

    public formatFulfillment(fulfillment: string | null | undefined): string {
        return fulfillment ? this.getText(`fulfillment.${fulfillment}`) : "";
    }

    // Tipos livres sem chave de tradução aparecem como digitados.
    public formatPolicyType(type: string | null | undefined): string {
        if (!type) {
            return "";
        }

        const key = `policyType.${type.toUpperCase()}`;
        const bundle = (this.getAppComponent().getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle;

        return bundle.hasText(key) ? this.getText(key) : type;
    }

    public formatBalance(balance: number | string | null | undefined): string {
        const amount = Number(balance ?? 0);

        if (!amount) {
            return this.getText("balanceEven");
        }

        return this.getText(amount > 0 ? "balanceToPay" : "balanceToRefund", [formatter.currency(Math.abs(amount))]);
    }

    public formatReturnItem(
        kind: string | null | undefined,
        quantity: number | null | undefined,
        ...details: Array<string | boolean | null | undefined>
    ): string {
        const restock = details[3];
        const description = formatter.variantDescription(...details.slice(0, 3) as Array<string | null | undefined>);
        const text = this.getText(kind === "RETURNED" ? "returnedItemLine" : "replacementItemLine", [quantity ?? 0, description]);

        return kind === "RETURNED" && restock === false ? this.getText("returnedNoRestock", [text]) : text;
    }

    public formatReward(
        rewardType: string | null | undefined,
        rewardValue: number | string | null | undefined,
        gift: string | null | undefined,
        maxDiscount?: number | string | null
    ): string {
        if (!rewardType) {
            return "";
        }

        const value = Number(rewardValue ?? 0);
        const details: Record<string, string> = {
            PERCENT: this.getText("rewardSummary.PERCENT", [value]),
            FIXED: this.getText("rewardSummary.FIXED", [this.formatter.currency(value)]),
            GIFT: this.getText("rewardSummary.GIFT", [gift ?? ""]),
            CHEAPEST_FREE: this.getText("rewardSummary.CHEAPEST_FREE")
        };

        const summary = details[rewardType] ?? "";

        return maxDiscount
            ? this.getText("rewardSummaryLimit", [summary, this.formatter.currency(Number(maxDiscount))])
            : summary;
    }

    public formatCouponUsage(couponCode: string | null | undefined, usedCount: number | null | undefined, maxUses: number | null | undefined): string {
        if (!couponCode) {
            return this.getText("automaticPromotion");
        }

        return maxUses
            ? this.getText("couponUsageLimited", [couponCode, usedCount ?? 0, maxUses])
            : this.getText("couponUsage", [couponCode, usedCount ?? 0]);
    }

    public formatPeriod(startDate: string | null | undefined, endDate: string | null | undefined): string {
        if (!startDate && !endDate) {
            return this.getText("noPeriod");
        }

        return this.getText("periodRange", [this.formatter.date(startDate) || "...", this.formatter.date(endDate) || "..."]);
    }

    public refreshStoreInfo(): Promise<void> {
        return this.getAppComponent().refreshStoreInfo();
    }

    public getText(key: string, parameters?: unknown[]): string {
        const bundle = (this.getAppComponent().getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle;
        return bundle.getText(key, parameters) ?? key;
    }

    public getCatalogModel(): ODataModel {
        return this.getAppComponent().getModel("catalog") as ODataModel;
    }

    protected getCartModel(): CartModel {
        return this.getAppComponent().getModel("cart") as CartModel;
    }

    public getStoreModel(): JSONModel {
        return this.getAppComponent().getModel("store") as JSONModel;
    }

    protected ensureAdminModel(): Promise<ODataModel | null> {
        return this.getAppComponent().ensureAdminModel();
    }

    public getAdminModel(): ODataModel {
        return this.getAppComponent().getModel() as ODataModel;
    }

    public showToast(key: string, parameters?: unknown[]): void {
        MessageToast.show(this.getText(key, parameters));
    }

    public confirm(key: string, parameters?: unknown[]): Promise<boolean> {
        return new Promise((resolve) => {
            MessageBox.confirm(this.getText(key, parameters), {
                onClose: (action: string | null) => resolve(action === MessageBox.Action.OK)
            });
        });
    }

    public handleError(error: unknown, key: string): void {
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

        const detail = getBackendErrorMessage(error);
        const message = this.getText(key);
        const isRepeated = !!detail && message.toLowerCase().includes(detail.replace(/[.!]+$/, "").toLowerCase());

        MessageBox.error(detail && !isRepeated ? `${message}\n\n${detail}` : message);
    }

    public async runBusy<Result>(action: () => Promise<Result>): Promise<Result> {
        const controls = [this.getView(), ...InstanceManager.getOpenDialogs()];

        controls.forEach((control) => control?.setBusy(true));

        try {
            return await action();
        } finally {
            controls.forEach((control) => control?.setBusy(false));
        }
    }

}
