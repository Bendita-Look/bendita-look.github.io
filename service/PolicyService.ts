import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

export interface StorePolicySummary {
    ID: string;
    Type: string;
    Title: string;
    Slug?: string | null;
    SortOrder?: number | null;
}

const POLICY_SELECT = "ID,Type,Title,Slug,SortOrder";

export default class PolicyService {

    constructor(private readonly catalogModel: ODataModel) { }

    public async list(): Promise<StorePolicySummary[]> {
        const contexts = await this.catalogModel
            .bindList("/StorePolicies", undefined, undefined, undefined, {
                $select: POLICY_SELECT,
                $orderby: "SortOrder,Title"
            })
            .requestContexts();

        return contexts.map((context) => context.getObject() as StorePolicySummary);
    }

}
