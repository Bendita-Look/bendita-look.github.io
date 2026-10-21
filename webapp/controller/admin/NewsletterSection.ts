import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import type Table from "sap/m/Table";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import type Context from "sap/ui/model/odata/v4/Context";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import type Admin from "../Admin.controller";
import NewsletterService from "../../service/NewsletterService";

interface NewsletterState {
    subject: string;
    body: string;
    sending: boolean;
    activeSubscribers: number;
}

export default class NewsletterSection {

    public readonly model = new JSONModel(this.emptyState());

    constructor(private readonly controller: Admin) { }

    /** Envia a campanha para todos os inscritos ativos. */
    public onSend = async (): Promise<void> => {
        const state = this.state();
        const subject = (state.subject ?? "").trim();
        const body = state.body ?? "";

        if (!subject || !body.trim()) {
            MessageBox.error(this.controller.getText("newsletterMissingContent"));
            return;
        }

        if (!await this.controller.confirm("confirmSendNewsletter", [this.activeSubscriberCount()])) {
            return;
        }

        this.model.setProperty("/sending", true);

        try {
            await this.controller.runBusy(async () => {
                const result = await new NewsletterService(this.controller.getAdminModel()).send({ Subject: subject, Body: body });

                this.controller.showToast("newsletterSent", [result.Recipients, result.Failures]);
            });

            this.model.setProperty("/subject", "");
            this.model.setProperty("/body", "");
            this.refreshCampaigns();
        } catch (error) {
            this.controller.handleError(error, "newsletterSendError");
        } finally {
            this.model.setProperty("/sending", false);
        }
    };

    /** Remove um inscrito da lista. */
    public onDeleteSubscriber = async (event: Event): Promise<void> => {
        const context = this.contextOf(event);

        if (!await this.controller.confirm("confirmDeleteSubscriber", [context.getProperty("Email") ?? ""])) {
            return;
        }

        try {
            await this.controller.runBusy(() => context.delete());
            this.controller.showToast("subscriberDeleted");
        } catch (error) {
            this.subscribersBinding()?.refresh();
            this.controller.handleError(error, "subscriberDeleteError");
        }
    };

    /** Remove uma campanha do histórico. */
    public onDeleteCampaign = async (event: Event): Promise<void> => {
        const context = this.contextOf(event);

        if (!await this.controller.confirm("confirmDeleteCampaign", [context.getProperty("Subject") ?? ""])) {
            return;
        }

        try {
            await this.controller.runBusy(() => context.delete());
            this.controller.showToast("campaignDeleted");
        } catch (error) {
            this.campaignsBinding()?.refresh();
            this.controller.handleError(error, "campaignDeleteError");
        }
    };

    /** Carrega contadores e o histórico ao abrir a aba. */
    public async load(): Promise<void> {
        try {
            await this.controller.runBusy(async () => {
                const count = await new NewsletterService(this.controller.getAdminModel()).activeCount();

                this.model.setProperty("/activeSubscribers", count);
            });
        } catch (error) {
            this.controller.handleError(error, "newsletterLoadError");
        }
    }

    public activeSubscriberCount(): number {
        return (this.model.getProperty("/activeSubscribers") as number) ?? 0;
    }

    private refreshCampaigns(): void {
        this.campaignsBinding()?.refresh();
    }

    private state(): NewsletterState {
        return this.model.getData() as NewsletterState;
    }

    private emptyState(): NewsletterState {
        return { subject: "", body: "", sending: false, activeSubscribers: 0 };
    }

    private contextOf(event: Event): Context {
        return (event.getSource() as Control).getBindingContext() as Context;
    }

    private subscribersBinding(): ODataListBinding | undefined {
        return this.controller.byControlId<Table>("subscribersTable")?.getBinding("items") as ODataListBinding | undefined;
    }

    private campaignsBinding(): ODataListBinding | undefined {
        return this.controller.byControlId<Table>("campaignsTable")?.getBinding("items") as ODataListBinding | undefined;
    }

}
