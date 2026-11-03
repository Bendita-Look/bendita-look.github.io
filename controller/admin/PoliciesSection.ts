import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import type Dialog from "sap/m/Dialog";
import type Table from "sap/m/Table";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import type Context from "sap/ui/model/odata/v4/Context";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import type Admin from "../Admin.controller";
import DraftService from "../../service/DraftService";

const KNOWN_TYPES = ["RETURN", "EXCHANGE", "PRIVACY", "DELIVERY", "TERMS", "OTHER"];

export default class PoliciesSection {

    public readonly model = new JSONModel({ types: KNOWN_TYPES.map((type) => ({ key: type })), isFreeType: false });

    private dialog?: Dialog;

    constructor(private readonly controller: Admin) { }

    public onNewPolicy = async (): Promise<void> => {
        try {
            const draft = await this.controller.runBusy(() => this.draftService().createDraft(this.getTableBinding(), { Active: true, Type: "OTHER", SortOrder: 0 }));
            await this.openDialog(draft);
        } catch (error) {
            this.controller.handleError(error, "policyCreateError");
        }
    };

    public onEditPolicy = async (event: Event): Promise<void> => {
        const context = this.contextOf(event);

        try {
            const draft = context.getProperty("IsActiveEntity") === false
                ? context
                : await this.controller.runBusy(() => this.draftService().editDraft(context));

            await this.openDialog(draft);
        } catch (error) {
            this.controller.handleError(error, "policyEditError");
        }
    };

    public onDeletePolicy = async (event: Event): Promise<void> => {
        const context = this.contextOf(event);

        if (!await this.controller.confirm("confirmDeletePolicy", [context.getProperty("Title") ?? ""])) {
            return;
        }

        try {
            await this.controller.runBusy(() => context.delete());
            this.controller.showToast("policyDeleted");
        } catch (error) {
            this.getTableBinding().refresh();
            this.controller.handleError(error, "policyDeleteError");
        }
    };

    public onSavePolicy = async (): Promise<void> => {
        try {
            await this.controller.runBusy(async () => {
                const context = this.getDialogContext();

                if (this.model.getProperty("/isFreeType")) {
                    const freeType = (this.model.getProperty("/freeType") as string ?? "").trim().toUpperCase();

                    context.setProperty("Type", freeType || "OTHER");
                }

                await this.draftService().activateDraft(context);
            });
            this.closeDialog();
            this.controller.showToast("policySaved");
        } catch (error) {
            this.controller.handleError(error, "policySaveError");
        }
    };

    public onCancelPolicy = async (): Promise<void> => {
        try {
            await this.draftService().discardDraft(this.getDialogContext());
        } catch (error) {
            this.controller.handleError(error, "policyCancelError");
        } finally {
            this.closeDialog();
        }
    };

    /** Alterna entre os tipos fixos e o tipo livre digitado pelo usuário. */
    public onTypeChange = (event: Event): void => {
        const value = (event.getSource() as Control & { getSelectedKey(): string }).getSelectedKey();

        if (value === "CUSTOM") {
            this.model.setProperty("/isFreeType", true);
            this.model.setProperty("/selectedType", "CUSTOM");
            return;
        }

        this.model.setProperty("/isFreeType", false);
        this.model.setProperty("/freeType", "");
    };

    /** Ao digitar um tipo livre, reflete o valor no rótulo do próprio campo. */
    public onFreeTypeChange = (event: Event): void => {
        this.model.setProperty("/freeType", (event.getSource() as Control & { getValue(): string }).getValue());
    };

    private applyType(value: string): void {
        const known = KNOWN_TYPES.includes(value.toUpperCase());
        const free = value && !known ? value : "";

        this.model.setProperty("/selectedType", known ? value.toUpperCase() : (value ? "CUSTOM" : "OTHER"));
        this.model.setProperty("/isFreeType", !known && !!value);
        this.model.setProperty("/freeType", free);
    }

    private closeDialog(): void {
        this.dialog?.close();
        this.dialog?.unbindElement();
        this.getTableBinding().refresh();
    }

    private async openDialog(draft: Context): Promise<void> {
        const dialog = await this.getDialog();

        dialog.setBindingContext(draft);
        this.applyType(draft.getProperty("Type") as string ?? "OTHER");
        dialog.open();
    }

    private getDialogContext(): Context {
        return this.dialog?.getBindingContext() as Context;
    }

    private contextOf(event: Event): Context {
        return (event.getSource() as Control).getBindingContext() as Context;
    }

    private draftService(): DraftService {
        return new DraftService(this.controller.getAdminModel());
    }

    private getTableBinding(): ODataListBinding {
        return this.controller.byControlId<Table>("policiesTable").getBinding("items") as ODataListBinding;
    }

    private async getDialog(): Promise<Dialog> {
        if (!this.dialog) {
            const view = this.controller.getView();

            this.dialog = await Fragment.load({
                id: view?.getId(),
                name: "apps.dflc.benditalook.view.fragments.PolicyDialog",
                controller: this.controller
            }) as Dialog;

            view?.addDependent(this.dialog);
        }

        return this.dialog;
    }

}
