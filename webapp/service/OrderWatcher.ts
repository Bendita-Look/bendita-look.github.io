import Storage from "sap/ui/util/Storage";
import { AuthenticationService } from "../auth/AuthenticationService";
import { XsuaaAuthHelper } from "../auth/providers/XsuaaAuthHelper";
import { buildAuthHeaders } from "../util/http";

const POLL_INTERVAL = 30_000;
const FIRST_RUN_LOOKBACK = 5 * 60 * 1000;
const MAX_PER_POLL = 20;
const STORAGE_KEY = "orders.watermark";

export interface WatchedOrder {
    ID: string;
    Number: number;
    CustomerName?: string | null;
    TotalAmount?: number | null;
    createdAt?: string | null;
}

type OrdersListener = (orders: WatchedOrder[]) => void;

/**
 * Vigia novos pedidos enquanto o administrador está logado — não importa em
 * qual tela ele esteja. Faz polling no serviço administrativo e entrega os
 * pedidos novos para quem escuta (o Component cuida do som e do aviso).
 *
 * A marca d'água (createdAt do último pedido visto) fica no localStorage,
 * assim o vigia não repete avisos entre recargas.
 */
export default class OrderWatcher {

    private static instance: OrderWatcher | null = null;

    private timer?: ReturnType<typeof setInterval>;

    private watermark: string;

    private started = false;

    private polling = false;

    private listeners = new Set<OrdersListener>();

    private readonly storage = new Storage(Storage.Type.local, "benditaLook");

    private constructor() {
        this.watermark = this.storedWatermark() ?? new Date(Date.now() - FIRST_RUN_LOOKBACK).toISOString();
    }

    public static getInstance(): OrderWatcher {
        if (!this.instance) {
            this.instance = new OrderWatcher();
        }

        return this.instance;
    }

    public onOrders(listener: OrdersListener): () => void {
        this.listeners.add(listener);

        return () => this.listeners.delete(listener);
    }

    /** (Re)inicia o vigia ao entrar/sair, para não vazar timers nem avisar deslogado. */
    public async sync(): Promise<void> {
        if (await AuthenticationService.isAuthenticated()) {
            this.start();
        } else {
            this.stop();
        }
    }

    private start(): void {
        if (this.started) {
            return;
        }

        this.started = true;
        void this.poll();
        this.timer = setInterval(() => void this.poll(), POLL_INTERVAL);
    }

    private stop(): void {
        this.started = false;
        clearInterval(this.timer);
        this.timer = undefined;
    }

    private async poll(): Promise<void> {
        if (this.polling) {
            return;
        }

        this.polling = true;

        try {
            const orders = await this.fetchNewOrders();

            if (orders.length) {
                const latest = orders[orders.length - 1];

                this.watermark = latest.createdAt ?? new Date().toISOString();
                this.storeWatermark(this.watermark);
                this.listeners.forEach((listener) => listener(orders));
            }
        } catch {
            // Sem rede/sessão: tenta de novo no próximo ciclo.
        } finally {
            this.polling = false;
        }
    }

    private async fetchNewOrders(): Promise<WatchedOrder[]> {
        const query = new URLSearchParams({
            $filter: `createdAt gt ${this.watermark}`,
            $select: "ID,Number,CustomerName,TotalAmount,createdAt",
            $orderby: "createdAt asc",
            $top: String(MAX_PER_POLL)
        });

        const response = await fetch(`${XsuaaAuthHelper.getConfig().adminService}Orders?${query.toString()}`, {
            headers: buildAuthHeaders()
        });

        if (!response.ok) {
            return [];
        }

        const payload = await response.json() as { value?: WatchedOrder[] };

        return payload.value ?? [];
    }

    private storedWatermark(): string | null {
        return (this.storage.get(STORAGE_KEY) as string | null) ?? null;
    }

    private storeWatermark(value: string): void {
        this.storage.put(STORAGE_KEY, value);
    }

}
