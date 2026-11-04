import JSONModel from "sap/ui/model/json/JSONModel";
import type { ListBase$DeleteEvent } from "sap/m/ListBase";
import type { ListItemBase$PressEvent } from "sap/m/ListItemBase";
import type Control from "sap/ui/core/Control";
import BaseController from "./BaseController";
import ContactStorage from "../service/ContactStorage";
import MyOrdersStorage from "../service/MyOrdersStorage";
import OrderService from "../service/OrderService";
import type { OrderSummary } from "../service/OrderService";

interface MyOrdersState {
    loading: boolean;
    orders: OrderSummary[];
    email: string;
    emailState: "None" | "Error";
    sending: boolean;
    sentMessage: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @namespace apps.dflc.benditalook.controller
 */
export default class MyOrders extends BaseController {

    private model: JSONModel;

    public onInit(): void {
        this.model = new JSONModel(this.initialState());
        this.getView()?.setModel(this.model, "myOrders");
        this.getRouter().getRoute("myOrders")?.attachPatternMatched(() => this.onRouteMatched());
    }

    public onOpenOrder(event: ListItemBase$PressEvent): void {
        const order = this.getOrderOf(event.getSource());

        if (order) {
            this.navTo("order", { orderNumber: order.Number, accessCode: order.AccessCode });
        }
    }

    public onRemoveOrder(event: ListBase$DeleteEvent): void {
        const order = this.getOrderOf(event.getParameter("listItem"));

        if (!order) {
            return;
        }

        const orders = this.model.getProperty("/orders") as OrderSummary[];

        MyOrdersStorage.remove(order.Number);
        this.syncOrderPush();
        this.model.setProperty("/orders", orders.filter((item) => item.Number !== order.Number));
        this.showToast("myOrdersRemoved");
    }

    public async onRequestLinks(): Promise<void> {
        const email = (this.model.getProperty("/email") as string).trim();

        if (!EMAIL_PATTERN.test(email)) {
            this.model.setProperty("/emailState", "Error");
            return;
        }

        this.model.setProperty("/emailState", "None");
        this.model.setProperty("/sending", true);

        try {
            const message = await new OrderService(this.getCatalogModel()).requestOrderLinks(email);
            this.model.setProperty("/sentMessage", message);
        } catch (error) {
            this.handleError(error, "myOrdersRecoverError");
        } finally {
            this.model.setProperty("/sending", false);
        }
    }

    private onRouteMatched(): void {
        this.model.setProperty("/email", ContactStorage.load().CustomerEmail ?? "");
        void this.loadOrders();
    }

    /** A lista vem só dos pedidos guardados no aparelho; o servidor devolve apenas os que ainda existem. */
    private async loadOrders(): Promise<void> {
        const storedOrders = MyOrdersStorage.list();

        if (!storedOrders.length) {
            this.model.setProperty("/orders", []);
            return;
        }

        this.model.setProperty("/loading", true);

        try {
            const orders = await new OrderService(this.getCatalogModel()).lookupOrders(storedOrders);

            this.model.setProperty("/orders", orders);
            MyOrdersStorage.keep(orders.map((order) => order.Number));
        } catch (error) {
            this.handleError(error, "myOrdersLoadError");
        } finally {
            this.model.setProperty("/loading", false);
        }
    }

    private getOrderOf(control: Control | undefined): OrderSummary | undefined {
        return control?.getBindingContext("myOrders")?.getObject() as OrderSummary | undefined;
    }

    private initialState(): MyOrdersState {
        return { loading: false, orders: [], email: "", emailState: "None", sending: false, sentMessage: "" };
    }

}
