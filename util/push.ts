/* eslint-disable fiori-custom/sap-no-navigator */

/**
 * Web Push: registro do service worker (sw.js) e inscrição do aparelho.
 * Só as partes que dependem do navegador ficam aqui; o backend é chamado pelo PushService.
 * O sap.ui.Device não expõe service worker, então o navigator é usado só neste arquivo.
 */

const SERVICE_WORKER_TIMEOUT_MS = 10_000;

export function pushSupported(): boolean {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && window.isSecureContext;
}

/** Registra o sw.js; sem service worker (ou em contexto inseguro) o app segue sem push. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
        return await navigator.serviceWorker.register("sw.js");
    } catch {
        return null;
    }
}

function withTimeout<Value>(promise: Promise<Value>, timeoutMs: number): Promise<Value> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("serviceWorkerTimeout")), timeoutMs);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Sem service worker ativo, `ready` nunca resolve; o timeout evita deixar o fluxo pendurado. */
export async function serviceWorkerReady(): Promise<ServiceWorkerRegistration> {
    if (!await navigator.serviceWorker.getRegistration()) {
        await registerServiceWorker();
    }

    return withTimeout(navigator.serviceWorker.ready, SERVICE_WORKER_TIMEOUT_MS);
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
    if (!pushSupported()) {
        return null;
    }

    const registration = await serviceWorkerReady();

    return registration.pushManager.getSubscription();
}

export function urlBase64ToUint8Array(key: string): Uint8Array<ArrayBuffer> {
    const padding = "=".repeat((4 - (key.length % 4)) % 4);
    const base64 = (key + padding).replace(/-/g, "+").replace(/_/g, "/");

    return Uint8Array.from(window.atob(base64), (char) => char.charCodeAt(0));
}

// A inscrição só serve para a chave VAPID com que foi criada; outra chave exige uma nova.
export function hasApplicationServerKey(subscription: PushSubscription, key: string): boolean {
    const current = subscription.options.applicationServerKey;

    if (!current) {
        return false;
    }

    const expected = urlBase64ToUint8Array(key);
    const bytes = new Uint8Array(current);

    return bytes.length === expected.length && bytes.every((byte, index) => byte === expected[index]);
}

// User agent enviado com a inscrição; cortado ao tamanho da coluna no backend.
export function browserUserAgent(): string {
    return navigator.userAgent.slice(0, 255);
}

export function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
    if (!buffer) {
        return "";
    }

    const binary = String.fromCharCode(...new Uint8Array(buffer));

    return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
