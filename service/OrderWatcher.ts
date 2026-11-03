import Storage from "sap/ui/util/Storage";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Sorter from "sap/ui/model/Sorter";
import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { AuthenticationService } from "../auth/AuthenticationService";
import { isAuthenticationError, isAuthorizationError } from "../util/http";

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
type AdminModelResolver = () => Promise<ODataModel | null>;

/**
 * Vigia novos pedidos enquanto o administrador está logado — não importa em
 * qual tela ele esteja. Faz polling no serviço administrativo (OData V4) e entrega
 * os pedidos novos para quem escuta (o Component cuida do som e do aviso).
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

    private constructor(private readonly resolveAdminModel: AdminModelResolver) {
        this.watermark = this.storedWatermark() ?? new Date(Date.now() - FIRST_RUN_LOOKBACK).toISOString();
    }

    public static getInstance(resolveAdminModel: AdminModelResolver): OrderWatcher {
        if (!this.instance) {
            this.instance = new OrderWatcher(resolveAdminModel);
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
        document.addEventListener("visibilitychange", this.onVisibilityChange);
    }

    private stop(): void {
        this.started = false;
        clearInterval(this.timer);
        this.timer = undefined;
        document.removeEventListener("visibilitychange", this.onVisibilityChange);
    }

    /** Ao voltar para a aba, consulta na hora em vez de esperar o próximo ciclo. */
    private readonly onVisibilityChange = (): void => {
        if (document.visibilityState === "visible") {
            void this.poll();
        }
    };

    private async poll(): Promise<void> {
        if (this.polling || document.visibilityState === "hidden") {
            return;
        }

        this.polling = true;
        this.watermark = this.storedWatermark() ?? this.watermark;

        try {
            const orders = await this.fetchNewOrders();

            if (orders.length) {
                const latest = orders[orders.length - 1];

                this.watermark = latest.createdAt ?? new Date().toISOString();
                this.storeWatermark(this.watermark);
                this.listeners.forEach((listener) => listener(orders));
            }
        } catch (error) {
            this.handleFailure(error);
        } finally {
            this.polling = false;
        }
    }

    // 401/403: para o timer. Só a sessão expirada (401) mostra o aviso padrão; outras falhas tentam no próximo ciclo.
    private handleFailure(error: unknown): void {
        if (!isAuthorizationError(error)) {
            return;
        }

        this.stop();

        if (isAuthenticationError(error)) {
            AuthenticationService.notifySessionExpired();
        }
    }

    private async fetchNewOrders(): Promise<WatchedOrder[]> {
        const model = await this.resolveAdminModel();

        if (!model) {
            this.stop();
            return [];
        }

        const binding = model.bindList("/Orders", undefined, [new Sorter("createdAt")], [
            new Filter("createdAt", FilterOperator.GT, this.watermark)
        ], {
            $select: "ID,Number,CustomerName,TotalAmount,createdAt",
            $$groupId: "$direct"
        });

        try {
            const contexts = await binding.requestContexts(0, MAX_PER_POLL);

            return contexts.map((context) => context.getObject() as WatchedOrder);
        } finally {
            binding.destroy();
        }
    }

    private storedWatermark(): string | null {
        return (this.storage.get(STORAGE_KEY) as string | null) ?? null;
    }

    private storeWatermark(value: string): void {
        this.storage.put(STORAGE_KEY, value);
    }

}
