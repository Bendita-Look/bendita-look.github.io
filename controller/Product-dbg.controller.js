sap.ui.define(["sap/ui/model/json/JSONModel", "sap/m/Column", "sap/m/ColumnListItem", "sap/m/Text", "sap/ui/core/Fragment", "./BaseController", "../util/variants"], function (JSONModel, Column, ColumnListItemControl, TextControl, Fragment, __BaseController, ___util_variants) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  const imagesForColor = ___util_variants["imagesForColor"];
  const sortBySize = ___util_variants["sortBySize"];
  const PRODUCT_EXPAND = "Category($select=Name),Colors,Variants,Images($select=ID,Color_ID,SortOrder)," + "Measurements($select=ID,Size,Label,Value,SortOrder)";

  /**
   * @namespace apps.dflc.benditalook.controller
   */
  const Product = BaseController.extend("apps.dflc.benditalook.controller.Product", {
    onInit: function _onInit() {
      this.productModel = new JSONModel(this.emptyState());
      this.getView()?.setModel(this.productModel, "product");
      this.getRouter().getRoute("product")?.attachPatternMatched(event => this.onRouteMatched(event));
    },
    onSwatchPress: function _onSwatchPress(event) {
      this.selectColor(event.getSource().getBindingContext("product")?.getProperty("ID") ?? "");
    },
    onThumbnailPress: function _onThumbnailPress(event) {
      const image = event.getSource().getBindingContext("product")?.getObject();
      const images = this.productModel.getProperty("/images");
      const carousel = this.byId("productCarousel");
      const page = carousel.getPages()[images.indexOf(image)];
      if (page) {
        carousel.setActivePage(page);
      }
    },
    onAskAboutProduct: function _onAskAboutProduct() {
      this.openWhatsapp(this.getText("whatsappProductMessage", [this.productModel.getProperty("/product/Name")]));
    },
    onSizePress: function _onSizePress(event) {
      this.selectVariant(event.getSource().getBindingContext("product")?.getProperty("key") ?? "");
    },
    onAddToCart: function _onAddToCart() {
      const product = this.productModel.getProperty("/product");
      const variant = this.findVariant(this.productModel.getProperty("/selectedVariantId"));
      if (!variant || variant.Stock < 1) {
        this.showToast("selectAvailableSize");
        return;
      }
      const quantity = this.getCartModel().addItem({
        VariantId: variant.ID,
        ProductId: product.ID,
        ProductName: product.Name,
        ColorName: product.Colors.find(color => color.ID === variant.Color_ID)?.Name ?? "",
        Size: variant.Size,
        UnitPrice: Number(product.Price),
        Quantity: this.productModel.getProperty("/quantity"),
        MaxQuantity: variant.Stock,
        ImageId: this.productModel.getProperty("/images")[0]?.ID ?? ""
      });
      this.showToast("addedToCart", [quantity]);
    },
    onRouteMatched: async function _onRouteMatched(event) {
      const {
        productId
      } = event.getParameter("arguments");
      this.productModel.setData(this.emptyState());
      try {
        const product = await this.runBusy(() => this.getCatalogModel().bindContext(`/Products(${productId})`, undefined, {
          $expand: PRODUCT_EXPAND
        }).requestObject());
        this.productModel.setProperty("/product", product);
        this.productModel.setProperty("/colors", product.Colors);
        this.applySizeGuide(product);
        this.productModel.setProperty("/loaded", true);
        this.selectColor(product.Colors[0]?.ID ?? "");
      } catch (error) {
        this.handleError(error, "productNotFound");
        this.navTo("catalog", {}, true);
      }
    },
    onOpenSizeGuide: async function _onOpenSizeGuide() {
      const dialog = await this.getSizeGuideDialog();
      this.buildSizeGuideColumns();
      dialog.open();
    },
    onCloseSizeGuide: function _onCloseSizeGuide() {
      this.sizeGuideDialog?.close();
    },
    applySizeGuide: function _applySizeGuide(product) {
      const entries = product.Measurements ?? [];
      const labels = [];
      const sizes = [];
      entries.forEach(entry => {
        if (entry.Label && !labels.includes(entry.Label)) {
          labels.push(entry.Label);
        }
        if (entry.Size && !sizes.includes(entry.Size)) {
          sizes.push(entry.Size);
        }
      });
      const hasSizeGuide = labels.length > 0 && sizes.length > 0;
      this.productModel.setProperty("/sizeGuide", {
        columns: labels.map(label => ({
          label
        })),
        rows: sizes.map(size => ({
          size,
          cells: labels.map(label => this.measurementOf(entries, size, label))
        }))
      });
      this.productModel.setProperty("/hasSizeGuide", hasSizeGuide);
    },
    measurementOf: function _measurementOf(entries, size, label) {
      const entry = entries.find(candidate => candidate.Size === size && candidate.Label === label);
      return entry?.Value ?? "—";
    },
    buildSizeGuideColumns: function _buildSizeGuideColumns() {
      const table = Fragment.byId(this.getView()?.getId() ?? "", "sizeGuideTable");
      const columns = this.productModel.getProperty("/sizeGuide/columns");
      if (!table) {
        return;
      }
      table.destroyColumns();
      table.destroyItems();
      table.addColumn(new Column({
        header: new TextControl({
          text: this.getText("size")
        })
      }));
      columns.forEach(column => table.addColumn(new Column({
        header: new TextControl({
          text: column.label
        })
      })));
      const rows = this.productModel.getProperty("/sizeGuide/rows");
      rows.forEach(row => {
        const cells = [row.size, ...row.cells].map(text => new TextControl({
          text
        }));
        table.addItem(new ColumnListItemControl({
          cells
        }));
      });
    },
    getSizeGuideDialog: async function _getSizeGuideDialog() {
      if (!this.sizeGuideDialog) {
        this.sizeGuideDialog = await Fragment.load({
          id: this.getView()?.getId(),
          name: "apps.dflc.benditalook.view.fragments.SizeGuideDialog",
          controller: this
        });
        this.getView()?.addDependent(this.sizeGuideDialog);
      }
      return this.sizeGuideDialog;
    },
    selectColor: function _selectColor(colorId) {
      const product = this.productModel.getProperty("/product");
      const variants = sortBySize(product.Variants.filter(variant => !colorId || variant.Color_ID === colorId));
      const sizes = variants.map(variant => ({
        key: variant.ID,
        text: variant.Size,
        enabled: variant.Stock > 0
      }));
      this.productModel.setProperty("/selectedColorId", colorId);
      this.productModel.setProperty("/selectedColorName", product.Colors.find(color => color.ID === colorId)?.Name ?? "");
      this.productModel.setProperty("/sizes", sizes);
      this.productModel.setProperty("/images", imagesForColor(product.Images, colorId));
      this.selectVariant(sizes.find(size => size.enabled)?.key ?? "");
    },
    selectVariant: function _selectVariant(variantId) {
      const stock = this.findVariant(variantId)?.Stock ?? 0;
      this.productModel.setProperty("/selectedVariantId", variantId);
      this.productModel.setProperty("/stock", stock);
      this.productModel.setProperty("/quantity", 1);
    },
    findVariant: function _findVariant(variantId) {
      const product = this.productModel.getProperty("/product");
      return product?.Variants.find(variant => variant.ID === variantId);
    },
    emptyState: function _emptyState() {
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
        sizeGuide: {
          columns: [],
          rows: []
        },
        hasSizeGuide: false
      };
    }
  });
  return Product;
});
//# sourceMappingURL=Product-dbg.controller.js.map
