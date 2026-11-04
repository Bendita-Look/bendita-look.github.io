sap.ui.define([], function () {
  "use strict";

  /* eslint-disable fiori-custom/sap-no-navigator */

  /**
   * Web Push: registro do service worker (sw.js) e inscrição do aparelho.
   * Só as partes que dependem do navegador ficam aqui; o backend é chamado pelo PushService.
   * O sap.ui.Device não expõe service worker, então o navigator é usado só neste arquivo.
   */

  const SERVICE_WORKER_TIMEOUT_MS = 10_000;
  function pushSupported() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && window.isSecureContext;
  }

  /** Registra o sw.js; sem service worker (ou em contexto inseguro) o app segue sem push. */
  async function registerServiceWorker() {
    try {
      return await navigator.serviceWorker.register("sw.js");
    } catch {
      return null;
    }
  }
  function withTimeout(promise, timeoutMs) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("serviceWorkerTimeout")), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  /** Sem service worker ativo, `ready` nunca resolve; o timeout evita deixar o fluxo pendurado. */
  async function serviceWorkerReady() {
    if (!(await navigator.serviceWorker.getRegistration())) {
      await registerServiceWorker();
    }
    return withTimeout(navigator.serviceWorker.ready, SERVICE_WORKER_TIMEOUT_MS);
  }
  async function currentPushSubscription() {
    if (!pushSupported()) {
      return null;
    }
    const registration = await serviceWorkerReady();
    return registration.pushManager.getSubscription();
  }
  function urlBase64ToUint8Array(key) {
    const padding = "=".repeat((4 - key.length % 4) % 4);
    const base64 = (key + padding).replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(window.atob(base64), char => char.charCodeAt(0));
  }

  // A inscrição só serve para a chave VAPID com que foi criada; outra chave exige uma nova.
  function hasApplicationServerKey(subscription, key) {
    const current = subscription.options.applicationServerKey;
    if (!current) {
      return false;
    }
    const expected = urlBase64ToUint8Array(key);
    const bytes = new Uint8Array(current);
    return bytes.length === expected.length && bytes.every((byte, index) => byte === expected[index]);
  }

  // Reaproveita a inscrição atual se ela já usa a chave; senão cancela a antiga e cria outra (exige permissão concedida).
  async function ensurePushSubscription(key) {
    const current = await currentPushSubscription();
    if (current && hasApplicationServerKey(current, key)) {
      return current;
    }
    await current?.unsubscribe();
    const registration = await serviceWorkerReady();
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key)
    });
  }

  // User agent enviado com a inscrição; cortado ao tamanho da coluna no backend.
  function browserUserAgent() {
    return navigator.userAgent.slice(0, 255);
  }
  function arrayBufferToBase64Url(buffer) {
    if (!buffer) {
      return "";
    }
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  var __exports = {
    __esModule: true
  };
  __exports.pushSupported = pushSupported;
  __exports.registerServiceWorker = registerServiceWorker;
  __exports.serviceWorkerReady = serviceWorkerReady;
  __exports.currentPushSubscription = currentPushSubscription;
  __exports.urlBase64ToUint8Array = urlBase64ToUint8Array;
  __exports.hasApplicationServerKey = hasApplicationServerKey;
  __exports.ensurePushSubscription = ensurePushSubscription;
  __exports.browserUserAgent = browserUserAgent;
  __exports.arrayBufferToBase64Url = arrayBufferToBase64Url;
  return __exports;
});
//# sourceMappingURL=push-dbg.js.map
