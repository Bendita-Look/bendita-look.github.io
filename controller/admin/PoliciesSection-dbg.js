sap.ui.define(["sap/ui/core/Fragment", "sap/ui/model/json/JSONModel", "../../service/DraftService"], function (Fragment, JSONModel, __DraftService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const DraftService = _interopRequireDefault(__DraftService);
  const KNOWN_TYPES = ["RETURN", "EXCHANGE", "PRIVACY", "DELIVERY", "TERMS", "OTHER"];
  class PoliciesSection {
    model = new JSONModel({
      types: KNOWN_TYPES.map(type => ({
        key: type
      })),
      isFreeType: false
    });
    constructor(controller) {
      this.controller = controller;
    }
    onNewPolicy = async () => {
      try {
        const draft = await this.controller.runBusy(() => this.draftService().createDraft(this.getTableBinding(), {
          Active: true,
          Type: "OTHER",
          SortOrder: 0
        }));
        await this.openDialog(draft);
      } catch (error) {
        this.controller.handleError(error, "policyCreateError");
      }
    };
    onEditPolicy = async event => {
      const context = this.contextOf(event);
      try {
        const draft = context.getProperty("IsActiveEntity") === false ? context : await this.controller.runBusy(() => this.draftService().editDraft(context));
        await this.openDialog(draft);
      } catch (error) {
        this.controller.handleError(error, "policyEditError");
      }
    };
    onDeletePolicy = async event => {
      const context = this.contextOf(event);
      if (!(await this.controller.confirm("confirmDeletePolicy", [context.getProperty("Title") ?? ""]))) {
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
    onSavePolicy = async () => {
      try {
        await this.controller.runBusy(async () => {
          const context = this.getDialogContext();
          await context.setProperty("Type", this.resolveType());
          await this.draftService().activateDraft(context);
        });
        this.closeDialog();
        this.controller.showToast("policySaved");
      } catch (error) {
        this.controller.handleError(error, "policySaveError");
      }
    };
    onCancelPolicy = async () => {
      try {
        await this.draftService().discardDraft(this.getDialogContext());
      } catch (error) {
        this.controller.handleError(error, "policyCancelError");
      } finally {
        this.closeDialog();
      }
    };

    /** Alterna entre os tipos fixos e o tipo livre digitado pelo usuário. */
    onTypeChange = event => {
      const value = event.getSource().getSelectedKey();
      if (value === "CUSTOM") {
        this.model.setProperty("/isFreeType", true);
        this.model.setProperty("/selectedType", "CUSTOM");
        return;
      }
      this.model.setProperty("/isFreeType", false);
      this.model.setProperty("/freeType", "");
    };
    resolveType() {
      if (this.model.getProperty("/isFreeType")) {
        return (this.model.getProperty("/freeType") ?? "").trim().toUpperCase() || "OTHER";
      }
      return this.model.getProperty("/selectedType") || "OTHER";
    }
    applyType(value) {
      const known = KNOWN_TYPES.includes(value.toUpperCase());
      const free = value && !known ? value : "";
      this.model.setProperty("/selectedType", known ? value.toUpperCase() : value ? "CUSTOM" : "OTHER");
      this.model.setProperty("/isFreeType", !known && !!value);
      this.model.setProperty("/freeType", free);
    }
    closeDialog() {
      this.dialog?.close();
      this.dialog?.unbindElement();
      this.getTableBinding().refresh();
    }
    async openDialog(draft) {
      const dialog = await this.getDialog();
      dialog.setBindingContext(draft);
      this.applyType(draft.getProperty("Type") ?? "OTHER");
      dialog.open();
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
      return this.controller.byControlId("policiesTable").getBinding("items");
    }
    async getDialog() {
      if (!this.dialog) {
        const view = this.controller.getView();
        this.dialog = await Fragment.load({
          id: view?.getId(),
          name: "apps.dflc.benditalook.view.fragments.PolicyDialog",
          controller: this.controller
        });
        view?.addDependent(this.dialog);
      }
      return this.dialog;
    }
  }
  return PoliciesSection;
});
//# sourceMappingURL=PoliciesSection-dbg.js.map
