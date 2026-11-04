import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

export interface StockEntryLineInput {
    VariantId: string;
    Quantity: number;
    UnitCost: number;
}

export interface StockEntryInput {
    Note: string;
    Items: StockEntryLineInput[];
}

export default class StockService {

    constructor(private readonly adminModel: ODataModel) { }

    public async registerEntry(entry: StockEntryInput): Promise<void> {
        const operation = this.adminModel.bindContext("/RegisterStockEntry(...)");

        operation.setParameter("Entry", {
            Note: entry.Note,
            Items: entry.Items.map((item) => ({ Variant_ID: item.VariantId, Quantity: item.Quantity, UnitCost: item.UnitCost }))
        });

        await operation.invoke();
    }

    public async deleteEntry(entryId: string): Promise<string> {
        const operation = this.adminModel.bindContext("/DeleteStockEntry(...)");

        operation.setParameter("EntryId", entryId);

        await operation.invoke();

        return (operation.getBoundContext().getObject() as { data: string }).data;
    }

}
