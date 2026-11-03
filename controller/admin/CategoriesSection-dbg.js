sap.ui.define(["sap/ui/core/Fragment", "sap/ui/model/json/JSONModel", "../../service/DraftService", "../../service/MediaService", "../../service/ImageCompressor"], function (Fragment, JSONModel, __DraftService, __MediaService, __ImageCompressor) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const DraftService = _interopRequireDefault(__DraftService);
  const MediaService = _interopRequireDefault(__MediaService);
  const ImageCompressor = _interopRequireDefault(__ImageCompressor);
  class CategoriesSection {
    model = new JSONModel({
      categoryImagePreview: null
    });
    constructor(controller) {
      this.controller = controller;
    }
    onNewCategory = async () => {
      try {
        const draft = await this.controller.runBusy(() => this.draftService().createDraft(this.getTableBinding(), {
          Active: true
        }));
        await this.openDialog(draft);
      } catch (error) {
        this.controller.handleError(error, "categoryCreateError");
      }
    };
    onEditCategory = async event => {
      const context = this.contextOf(event);
      try {
        const draft = context.getProperty("IsActiveEntity") === false ? context : await this.controller.runBusy(() => this.draftService().editDraft(context));
        await this.openDialog(draft);
      } catch (error) {
        this.controller.handleError(error, "categoryEditError");
      }
    };
    onDeleteCategory = async event => {
      const context = this.contextOf(event);
      if (!(await this.controller.confirm("confirmDeleteCategory", [context.getProperty("Name") ?? ""]))) {
        return;
      }
      try {
        await this.controller.runBusy(() => context.delete());
        this.controller.showToast("categoryDeleted");
      } catch (error) {
        this.getTableBinding().refresh();
        this.controller.handleError(error, "categoryDeleteError");
      }
    };
    onSaveCategory = async () => {
      try {
        await this.controller.runBusy(() => this.draftService().activateDraft(this.getDialogContext()));
        this.closeDialog();
        this.controller.showToast("categorySaved");
      } catch (error) {
        this.controller.handleError(error, "categorySaveError");
      }
    };
    onCancelCategory = async () => {
      try {
        await this.draftService().discardDraft(this.getDialogContext());
      } catch (error) {
        this.controller.handleError(error, "categoryCancelError");
      } finally {
        this.closeDialog();
      }
    };
    onCategoryImageSelected = async event => {
      const uploader = event.getSource();
      const file = event.getParameter("files")?.[0];
      uploader.clear();
      if (!file) {
        return;
      }
      try {
        await this.controller.runBusy(async () => {
          const context = this.getDialogContext();
          const content = await ImageCompressor.compress(file);
          await MediaService.uploadMedia(this.imagePath(context), content, ImageCompressor.outputType);
          context.setProperty("CategoryImageType", ImageCompressor.outputType);
          this.setPreview(URL.createObjectURL(content));
        });
      } catch (error) {
        this.controller.handleError(error, "categoryImageUploadError");
      }
    };
    onRemoveCategoryImage = async () => {
      try {
        await this.controller.runBusy(async () => {
          const context = this.getDialogContext();
          await MediaService.deleteMedia(this.imagePath(context));
          context.setProperty("CategoryImageType", null);
          this.setPreview(null);
        });
      } catch (error) {
        this.controller.handleError(error, "categoryImageUploadError");
      }
    };
    closeDialog() {
      this.dialog?.close();
      this.dialog?.unbindElement();
      this.setPreview(null);
      this.getTableBinding().refresh();
    }
    async openDialog(draft) {
      const dialog = await this.getDialog();
      dialog.setBindingContext(draft);
      dialog.open();
      void this.loadPreview(draft);
    }
    async loadPreview(context) {
      const imageType = await context.requestProperty("CategoryImageType");
      if (!imageType) {
        this.setPreview(null);
        return;
      }
      try {
        this.setPreview(await MediaService.loadMedia(this.imagePath(context)));
      } catch {
        this.setPreview(null);
      }
    }
    setPreview(url) {
      const previous = this.model.getProperty("/categoryImagePreview");
      if (previous && previous !== url) {
        URL.revokeObjectURL(previous);
      }
      this.model.setProperty("/categoryImagePreview", url);
    }
    imagePath(context) {
      return MediaService.categoryImagePath(context.getProperty("ID"), context.getProperty("IsActiveEntity") !== false);
    }
    getDialogContext() {
      return this.dialog?.getBindingContext();
    }
    contextOf(event) {
      return event.getSource().getBindingContext();
    }
    draftService() {
      return new DraftService(this.controller.getAdminModel());
    }
    getTableBinding() {
      return this.controller.byControlId("categoriesTable").getBinding("items");
    }
    async getDialog() {
      if (!this.dialog) {
        const view = this.controller.getView();
        this.dialog = await Fragment.load({
          id: view?.getId(),
          name: "apps.dflc.benditalook.view.fragments.CategoryDialog",
          controller: this.controller
        });
        view?.addDependent(this.dialog);
      }
      return this.dialog;
    }
  }
  return CategoriesSection;
});
//# sourceMappingURL=CategoriesSection-dbg.js.map
