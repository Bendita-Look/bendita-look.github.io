import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Sorter from "sap/ui/model/Sorter";
import type { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import type VBox from "sap/m/VBox";
import type { ListBase$UpdateFinishedEvent } from "sap/m/ListBase";
import BaseController from "./BaseController";

const INITIAL_STATE = { hasSelection: false, isEmpty: false };
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @namespace apps.dflc.benditalook.controller
 */
export default class Policy extends BaseController {

    private policyModel: JSONModel;

    public onInit(): void {
        this.policyModel = new JSONModel({ ...INITIAL_STATE });
        this.getView()?.setModel(this.policyModel, "policy");
        this.getRouter().getRoute("policy")?.attachPatternMatched((event) => void this.onRouteMatched(event));
    }

    public onPolicyListUpdated(event: ListBase$UpdateFinishedEvent): void {
        this.policyModel.setProperty("/isEmpty", event.getParameter("actual") === 0);
    }

    public onBackToList(): void {
        this.navTo("policy", {});
    }

    private async onRouteMatched(event: Route$PatternMatchedEvent): Promise<void> {
        const { type } = event.getParameter("arguments") as { type?: string };

        this.policyModel.setProperty("/hasSelection", false);
        this.policyContent().unbindElement("catalog");

        if (type) {
            await this.selectPolicy(decodeURIComponent(type).trim());
        }
    }

    private async selectPolicy(key: string): Promise<void> {
        try {
            const path = await this.runBusy(() => this.findPolicyPath(key));

            if (path) {
                this.showPolicy(path);
            }
        } catch (error) {
            this.handleError(error, "policiesLoadError");
        }
    }

    private async findPolicyPath(key: string): Promise<string | undefined> {
        if (GUID_PATTERN.test(key)) {
            return `/StorePolicies(${key})`;
        }

        const binding = this.getCatalogModel().bindList("/StorePolicies", undefined, [new Sorter("SortOrder")], [
            new Filter({
                filters: [
                    new Filter({ path: "Slug", operator: FilterOperator.EQ, value1: key, caseSensitive: false }),
                    new Filter({ path: "Type", operator: FilterOperator.EQ, value1: key, caseSensitive: false })
                ],
                and: false
            })
        ]);

        try {
            const contexts = await binding.requestContexts(0, 1);

            return contexts.length ? contexts[0].getPath() : undefined;
        } finally {
            binding.destroy();
        }
    }

    private showPolicy(path: string): void {
        this.policyContent().bindElement({ path, model: "catalog" });
        this.policyModel.setProperty("/hasSelection", true);
    }

    private policyContent(): VBox {
        return this.byId("policyContent") as VBox;
    }

}
