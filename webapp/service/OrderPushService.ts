import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import Storage from "sap/ui/util/Storage";
import MyOrdersStorage from "./MyOrdersStorage";
import type { PushEnableResult } from "./PushService";
import { notificationPermission, requestNotificationPermission } from "../util/notifications";
import {
    arrayBufferToBase64Url,
    currentPushSubscription,
    ensurePushSubscription,
    hasApplicationServerKey,
    pushSupported
} from "../util/push";

interface OrderRef {
    Number: number;
    AccessCode: string;
}

const STORAGE_KEY = "benditaLook.orderPush";

/**
 * Avisos de status dos pedidos (Web Push da loja). O servidor só sabe quais pedidos avisar
 * quando recebe a lista do aparelho, então a inscrição é sempre enviada com MyOrdersStorage.
 */
export default class OrderPushService {

    private static readonly storage = new Storage(Storage.Type.local);

    constructor(private readonly catalogModel: ODataModel) { }

    public isEnabled(): boolean {
        return OrderPushService.storage.get(STORAGE_KEY) === true;
    }

    public async enable(): Promise<PushEnableResult> {
        if (!pushSupported()) {
            return "unsupported";
        }

        const key = await this.publicKey();

        if (!key) {
            return "notConfigured";
        }

        const permission = await requestNotificationPermission();

        if (permission === "default") {
            return "dismissed";
        }

        if (permission === "denied") {
            return "denied";
        }

        if (permission !== "granted") {
            return "unsupported";
        }

        const subscription = await ensurePushSubscription(key);

        await this.register(subscription);
        this.setEnabled(true);

        return "enabled";
    }

    /**
     * Envia a lista atual de pedidos do aparelho ao servidor. Nunca pede permissão nem cria inscrição do zero;
     * se a chave VAPID mudou, recria a inscrição (a permissão já está concedida).
     */
    public async sync(): Promise<boolean> {
        if (!this.isEnabled() || !pushSupported() || notificationPermission() !== "granted") {
            return false;
        }

        const current = await currentPushSubscription();

        if (!current) {
            return false;
        }

        const key = await this.publicKey();

        if (!key) {
            return false;
        }

        const subscription = hasApplicationServerKey(current, key) ? current : await ensurePushSubscription(key);

        await this.register(subscription);

        return true;
    }

    /** Não cancela a inscrição do navegador: o mesmo aparelho pode receber os avisos de venda do admin. */
    public async disable(): Promise<void> {
        const subscription = await currentPushSubscription();

        if (subscription) {
            await this.unregister(subscription.endpoint);
        }

        this.setEnabled(false);
    }

    private async publicKey(): Promise<string | null> {
        const operation = this.catalogModel.bindContext("/PushPublicKey(...)");

        await operation.invoke();

        // Sem VAPID o servidor responde 204 e o contexto fica sem objeto.
        return (operation.getBoundContext().getObject() as { value?: string | null } | null)?.value ?? null;
    }

    private async register(subscription: PushSubscription): Promise<void> {
        const operation = this.catalogModel.bindContext("/SubscribeOrdersPush(...)");

        operation.setParameter("Endpoint", subscription.endpoint);
        operation.setParameter("P256dh", arrayBufferToBase64Url(subscription.getKey("p256dh")));
        operation.setParameter("Auth", arrayBufferToBase64Url(subscription.getKey("auth")));
        operation.setParameter("Orders", this.trackedOrders());

        await operation.invoke();
    }

    private async unregister(endpoint: string): Promise<void> {
        const operation = this.catalogModel.bindContext("/UnsubscribeOrdersPush(...)");

        operation.setParameter("Endpoint", endpoint);

        await operation.invoke();
    }

    private trackedOrders(): OrderRef[] {
        return MyOrdersStorage.list().map((order) => ({ Number: order.Number, AccessCode: order.AccessCode }));
    }

    private setEnabled(enabled: boolean): void {
        OrderPushService.storage.put(STORAGE_KEY, enabled);
    }

}
