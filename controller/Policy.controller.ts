import JSONModel from "sap/ui/model/json/JSONModel";
import type { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import type Event from "sap/ui/base/Event";
import type Control from "sap/ui/core/Control";
import type { ListBase$SelectionChangeEvent } from "sap/m/ListBase";
import BaseController from "./BaseController";
import PolicyService from "../service/PolicyService";

interface StorePolicy {
    ID: string;
    Type: string;
    Title: string;
    Slug?: string | null;
    Content?: string | null;
    SortOrder?: number | null;
}

interface PolicyState {
    loaded: boolean;
    all: StorePolicy[];
    policy: StorePolicy | null;
    hasSelection: boolean;
}

/**
 * @namespace apps.dflc.benditalook.controller
 */
export default class Policy extends BaseController {

    private policyModel: JSONModel;

    public onInit(): void {
        this.policyModel = new JSONModel(this.emptyState());
        this.getView()?.setModel(this.policyModel, "policy");
        this.getRouter().getRoute("policy")?.attachPatternMatched((event) => this.onRouteMatched(event));
    }

    public onPolicyPress(event: Event): void {
        const policy = (event.getSource() as Control).getBindingContext("policy")?.getObject() as StorePolicy;

        this.showPolicy(policy);
    }

    public onPolicySelect(event: ListBase$SelectionChangeEvent): void {
        const policy = event.getParameter("listItem")?.getBindingContext("policy")?.getObject() as StorePolicy | undefined;

        if (policy) {
            this.showPolicy(policy);
        }
    }

    private async onRouteMatched(event: Route$PatternMatchedEvent): Promise<void> {
        const { type } = event.getParameter("arguments") as { type?: string };

        this.policyModel.setData(this.emptyState());

        try {
            const all = await this.runBusy(() => new PolicyService(this.getCatalogModel()).list() as Promise<StorePolicy[]>);

            this.policyModel.setProperty("/all", all);
            this.policyModel.setProperty("/loaded", true);

            const selected = this.findPolicy(all, type);

            if (selected) {
                this.showPolicy(selected);
            }
        } catch (error) {
            this.handleError(error, "policiesLoadError");
        }
    }

    private findPolicy(policies: StorePolicy[], type?: string): StorePolicy | undefined {
        if (!type) {
            return policies.length === 1 ? policies[0] : undefined;
        }

        const normalized = decodeURIComponent(type).trim().toLowerCase();

        return policies.find((policy) => (policy.Slug ?? "").toLowerCase() === normalized)
            ?? policies.find((policy) => policy.Type.toLowerCase() === normalized)
            ?? policies.find((policy) => policy.ID.toLowerCase() === normalized);
    }

    private showPolicy(policy: StorePolicy): void {
        this.policyModel.setProperty("/policy", policy);
        this.policyModel.setProperty("/hasSelection", true);
    }

    private emptyState(): PolicyState {
        return { loaded: false, all: [], policy: null, hasSelection: false };
    }

}
