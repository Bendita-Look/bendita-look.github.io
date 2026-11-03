sap.ui.define(["sap/ui/model/json/JSONModel", "sap/m/MessageBox", "../../service/NewsletterService"], function (JSONModel, MessageBox, __NewsletterService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const NewsletterService = _interopRequireDefault(__NewsletterService);
  class NewsletterSection {
    model = new JSONModel(this.emptyState());
    constructor(controller) {
      this.controller = controller;
    }

    /** Envia a campanha para todos os inscritos ativos. */
    onSend = async () => {
      const state = this.state();
      const subject = (state.subject ?? "").trim();
      const body = state.body ?? "";
      if (!subject || !body.trim()) {
        MessageBox.error(this.controller.getText("newsletterMissingContent"));
        return;
      }
      if (!(await this.controller.confirm("confirmSendNewsletter", [this.activeSubscriberCount()]))) {
        return;
      }
      this.model.setProperty("/sending", true);
      try {
        await this.controller.runBusy(async () => {
          const result = await new NewsletterService(this.controller.getAdminModel()).send({
            Subject: subject,
            Body: body
          });
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
    onDeleteSubscriber = async event => {
      const context = this.contextOf(event);
      if (!(await this.controller.confirm("confirmDeleteSubscriber", [context.getProperty("Email") ?? ""]))) {
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
    onDeleteCampaign = async event => {
      const context = this.contextOf(event);
      if (!(await this.controller.confirm("confirmDeleteCampaign", [context.getProperty("Subject") ?? ""]))) {
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
    async load() {
      try {
        await this.controller.runBusy(async () => {
          const count = await new NewsletterService(this.controller.getAdminModel()).activeCount();
          this.model.setProperty("/activeSubscribers", count);
        });
      } catch (error) {
        this.controller.handleError(error, "newsletterLoadError");
      }
    }
    activeSubscriberCount() {
      return this.model.getProperty("/activeSubscribers") ?? 0;
    }
    refreshCampaigns() {
      this.campaignsBinding()?.refresh();
    }
    state() {
      return this.model.getData();
    }
    emptyState() {
      return {
        subject: "",
        body: "",
        sending: false,
        activeSubscribers: 0
      };
    }
    contextOf(event) {
      return event.getSource().getBindingContext();
    }
    subscribersBinding() {
      return this.controller.byControlId("subscribersTable")?.getBinding("items");
    }
    campaignsBinding() {
      return this.controller.byControlId("campaignsTable")?.getBinding("items");
    }
  }
  return NewsletterSection;
});
//# sourceMappingURL=NewsletterSection-dbg.js.map
