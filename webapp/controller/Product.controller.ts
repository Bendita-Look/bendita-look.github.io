import JSONModel from "sap/ui/model/json/JSONModel";
import type { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import type Carousel from "sap/m/Carousel";
import type Event from "sap/ui/base/Event";
import type Control from "sap/ui/core/Control";
import type Dialog from "sap/m/Dialog";
import type Table from "sap/m/Table";
import Column from "sap/m/Column";
import ColumnListItemControl from "sap/m/ColumnListItem";
import TextControl from "sap/m/Text";
import Fragment from "sap/ui/core/Fragment";
import BaseController from "./BaseController";
import { imagesForColor, sortBySize } from "../util/variants";

interface CatalogColor {
    ID: string;
    Name: string;
    HexCode?: string;
}

interface CatalogVariant {
    ID: string;
    Color_ID?: string | null;
    Size: string;
    Stock: number;
}

interface CatalogImage {
    ID: string;
    Color_ID?: string | null;
    SortOrder?: number | null;
}

interface MeasurementEntry {
    ID?: string;
    Size: string;
    Label: string;
    Value?: string | null;
    SortOrder?: number | null;
}

interface CatalogProduct {
    ID: string;
    Name: string;
    Description?: string;
    Price: number;
    Category?: { Name: string };
    Colors: CatalogColor[];
    Variants: CatalogVariant[];
    Images: CatalogImage[];
    Measurements?: MeasurementEntry[];
}

interface SizeGuideColumn {
    label: string;
}

interface SizeGuideRow {
    size: string;
    cells: string[];
}

interface SizeOption {
    key: string;
    text: string;
    enabled: boolean;
}


const PRODUCT_EXPAND = "Category($select=Name),Colors,Variants,Images($select=ID,Color_ID,SortOrder),"
    + "Measurements($select=ID,Size,Label,Value,SortOrder)";

/**
 * @namespace apps.dflc.benditalook.controller
 */
export default class Product extends BaseController {

    private productModel: JSONModel;

    private sizeGuideDialog?: Dialog;

    public onInit(): void {
        this.productModel = new JSONModel(this.emptyState());
        this.getView()?.setModel(this.productModel, "product");
        this.getRouter().getRoute("product")?.attachPatternMatched((event) => this.onRouteMatched(event));
    }

    public onSwatchPress(event: Event): void {
        this.selectColor((event.getSource() as Control).getBindingContext("product")?.getProperty("ID") as string ?? "");
    }

    public onThumbnailPress(event: Event): void {
        const image = (event.getSource() as Control).getBindingContext("product")?.getObject() as CatalogImage;
        const images = this.productModel.getProperty("/images") as CatalogImage[];
        const carousel = this.byId("productCarousel") as Carousel;
        const page = carousel.getPages()[images.indexOf(image)];

        if (page) {
            carousel.setActivePage(page);
        }
    }

    public onAskAboutProduct(): void {
        this.openWhatsapp(this.getText("whatsappProductMessage", [this.productModel.getProperty("/product/Name")]));
    }

    public onSizePress(event: Event): void {
        this.selectVariant((event.getSource() as Control).getBindingContext("product")?.getProperty("key") as string ?? "");
    }

    public onAddToCart(): void {
        const product = this.productModel.getProperty("/product") as CatalogProduct;
        const variant = this.findVariant(this.productModel.getProperty("/selectedVariantId") as string);

        if (!variant || variant.Stock < 1) {
            this.showToast("selectAvailableSize");
            return;
        }

        const quantity = this.getCartModel().addItem({
            VariantId: variant.ID,
            ProductId: product.ID,
            ProductName: product.Name,
            ColorName: product.Colors.find((color) => color.ID === variant.Color_ID)?.Name ?? "",
            Size: variant.Size,
            UnitPrice: Number(product.Price),
            Quantity: this.productModel.getProperty("/quantity") as number,
            MaxQuantity: variant.Stock,
            ImageId: (this.productModel.getProperty("/images") as CatalogImage[])[0]?.ID ?? ""
        });

        this.showToast("addedToCart", [quantity]);
    }

    private async onRouteMatched(event: Route$PatternMatchedEvent): Promise<void> {
        const { productId } = event.getParameter("arguments") as { productId: string };

        this.productModel.setData(this.emptyState());

        try {
            const product = await this.runBusy(() => this.getCatalogModel()
                .bindContext(`/Products(${productId})`, undefined, { $expand: PRODUCT_EXPAND })
                .requestObject() as Promise<CatalogProduct>);

            this.productModel.setProperty("/product", product);
            this.productModel.setProperty("/colors", product.Colors);
            this.applySizeGuide(product);
            this.productModel.setProperty("/loaded", true);
            this.selectColor(product.Colors[0]?.ID ?? "");
        } catch (error) {
            this.handleError(error, "productNotFound");
            this.navTo("catalog", {}, true);
        }
    }

    public async onOpenSizeGuide(): Promise<void> {
        const dialog = await this.getSizeGuideDialog();

        this.buildSizeGuideColumns();
        dialog.open();
    }

    public onCloseSizeGuide(): void {
        this.sizeGuideDialog?.close();
    }

    private applySizeGuide(product: CatalogProduct): void {
        const entries = product.Measurements ?? [];

        const labels: string[] = [];
        const sizes: string[] = [];

        entries.forEach((entry) => {
            if (entry.Label && !labels.includes(entry.Label)) {
                labels.push(entry.Label);
            }

            if (entry.Size && !sizes.includes(entry.Size)) {
                sizes.push(entry.Size);
            }
        });

        const hasSizeGuide = labels.length > 0 && sizes.length > 0;

        this.productModel.setProperty("/sizeGuide", {
            columns: labels.map((label) => ({ label })),
            rows: sizes.map((size) => ({
                size,
                cells: labels.map((label) => this.measurementOf(entries, size, label))
            }))
        });
        this.productModel.setProperty("/hasSizeGuide", hasSizeGuide);
    }

    private measurementOf(entries: MeasurementEntry[], size: string, label: string): string {
        const entry = entries.find((candidate) => candidate.Size === size && candidate.Label === label);

        return entry?.Value ?? "—";
    }

    private buildSizeGuideColumns(): void {
        const table = Fragment.byId(this.getView()?.getId() ?? "", "sizeGuideTable") as Table | undefined;
        const columns = this.productModel.getProperty("/sizeGuide/columns") as SizeGuideColumn[];

        if (!table) {
            return;
        }

        table.destroyColumns();
        table.destroyItems();

        table.addColumn(new Column({ header: new TextControl({ text: this.getText("size") }) }));
        columns.forEach((column) => table.addColumn(new Column({ header: new TextControl({ text: column.label }) })));

        const rows = this.productModel.getProperty("/sizeGuide/rows") as SizeGuideRow[];

        rows.forEach((row) => {
            const cells = [row.size, ...row.cells].map((text) => new TextControl({ text }));
            table.addItem(new ColumnListItemControl({ cells }));
        });
    }

    private async getSizeGuideDialog(): Promise<Dialog> {
        if (!this.sizeGuideDialog) {
            this.sizeGuideDialog = await Fragment.load({
                id: this.getView()?.getId(),
                name: "apps.dflc.benditalook.view.fragments.SizeGuideDialog",
                controller: this
            }) as Dialog;

            this.getView()?.addDependent(this.sizeGuideDialog);
        }

        return this.sizeGuideDialog;
    }

    private selectColor(colorId: string): void {
        const product = this.productModel.getProperty("/product") as CatalogProduct;
        const variants = sortBySize(product.Variants.filter((variant) => !colorId || variant.Color_ID === colorId));
        const sizes: SizeOption[] = variants.map((variant) => ({ key: variant.ID, text: variant.Size, enabled: variant.Stock > 0 }));

        this.productModel.setProperty("/selectedColorId", colorId);
        this.productModel.setProperty("/selectedColorName", product.Colors.find((color) => color.ID === colorId)?.Name ?? "");
        this.productModel.setProperty("/sizes", sizes);
        this.productModel.setProperty("/images", imagesForColor(product.Images, colorId));
        this.selectVariant(sizes.find((size) => size.enabled)?.key ?? "");
    }

    private selectVariant(variantId: string): void {
        const stock = this.findVariant(variantId)?.Stock ?? 0;

        this.productModel.setProperty("/selectedVariantId", variantId);
        this.productModel.setProperty("/stock", stock);
        this.productModel.setProperty("/quantity", 1);
    }

    private findVariant(variantId: string): CatalogVariant | undefined {
        const product = this.productModel.getProperty("/product") as CatalogProduct | null;
        return product?.Variants.find((variant) => variant.ID === variantId);
    }

    private emptyState(): object {
        return {
            loaded: false,
            product: null,
            colors: [],
            sizes: [],
            images: [],
            selectedColorId: "",
            selectedColorName: "",
            selectedVariantId: "",
            stock: 0,
            quantity: 1,
            sizeGuide: { columns: [], rows: [] },
            hasSizeGuide: false
        };
    }

}
