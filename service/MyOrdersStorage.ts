import Storage from "sap/ui/util/Storage";

export interface StoredOrder {
    Number: number;
    AccessCode: string;
    SavedAt: string;
}

const STORAGE_KEY = "benditaLook.myOrders";
const MAX_ORDERS = 50;

/** Pedidos guardados neste aparelho; é a única fonte da lista "Meus pedidos" (nunca filtrada pelo e-mail). */
export default class MyOrdersStorage {

    private static readonly storage = new Storage(Storage.Type.local);

    public static list(): StoredOrder[] {
        return (this.storage.get(STORAGE_KEY) as StoredOrder[] | null) ?? [];
    }

    public static add(orderNumber: number, accessCode: string): void {
        const others = this.list().filter((order) => order.Number !== orderNumber);
        const order: StoredOrder = { Number: orderNumber, AccessCode: accessCode, SavedAt: new Date().toISOString() };

        this.write([order, ...others]);
    }

    public static remove(orderNumber: number): void {
        this.write(this.list().filter((order) => order.Number !== orderNumber));
    }

    public static keep(orderNumbers: number[]): void {
        this.write(this.list().filter((order) => orderNumbers.includes(order.Number)));
    }

    private static write(orders: StoredOrder[]): void {
        this.storage.put(STORAGE_KEY, orders.slice(0, MAX_ORDERS));
    }

}
