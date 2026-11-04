import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { notificationPermission, requestNotificationPermission } from "../util/notifications";
import {
    arrayBufferToBase64Url,
    browserUserAgent,
    currentPushSubscription,
    ensurePushSubscription,
    hasApplicationServerKey,
    pushSupported
} from "../util/push";

export type PushEnableResult = "enabled" | "notConfigured" | "dismissed" | "denied" | "unsupported";

export default class PushService {

    constructor(private readonly adminModel: ODataModel) { }

    public async publicKey(): Promise<string | null> {
        const operation = this.adminModel.bindContext("/PushPublicKey(...)");

        await operation.invoke();

        // Sem VAPID o servidor responde 204 e o contexto fica sem objeto.
        return (operation.getBoundContext().getObject() as { value?: string | null } | null)?.value ?? null;
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

        return "enabled";
    }

    /**
     * Mantém o servidor em dia com a inscrição atual (ex.: depois de importar backup).
     * Se a chave VAPID mudou, recria a inscrição (a permissão já está concedida, então não precisa de gesto).
     * Nunca pede permissão nem cria inscrição do zero.
     */
    public async sync(): Promise<boolean> {
        if (!pushSupported() || notificationPermission() !== "granted") {
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

    public async disable(): Promise<void> {
        const subscription = await currentPushSubscription();

        if (!subscription) {
            return;
        }

        await this.unregister(subscription.endpoint);
        await subscription.unsubscribe();
    }

    public async sendTest(): Promise<string> {
        const operation = this.adminModel.bindContext("/SendPushTest(...)");

        await operation.invoke();

        return (operation.getBoundContext().getObject() as { data: string }).data;
    }

    private async register(subscription: PushSubscription): Promise<void> {
        const operation = this.adminModel.bindContext("/SubscribePush(...)");

        operation.setParameter("Endpoint", subscription.endpoint);
        operation.setParameter("P256dh", arrayBufferToBase64Url(subscription.getKey("p256dh")));
        operation.setParameter("Auth", arrayBufferToBase64Url(subscription.getKey("auth")));
        operation.setParameter("UserAgent", browserUserAgent());

        await operation.invoke();
    }

    private async unregister(endpoint: string): Promise<void> {
        const operation = this.adminModel.bindContext("/UnsubscribePush(...)");

        operation.setParameter("Endpoint", endpoint);

        await operation.invoke();
    }

}
