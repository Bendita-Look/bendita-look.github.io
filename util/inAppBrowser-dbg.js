sap.ui.define(["./pwa"], function (___pwa) {
  "use strict";

  /* eslint-disable fiori-custom/sap-no-navigator */
  const isIos = ___pwa["isIos"];
  // A ordem importa: a primeira que casar define o nome exibido.
  const KNOWN_IN_APP_BROWSERS = [{
    name: "Instagram",
    pattern: /Instagram/i
  }, {
    name: "Facebook",
    pattern: /FBAN|FBAV|FB_IAB|FBIOS|FB4A/
  }, {
    name: "Threads",
    pattern: /Barcelona/
  }, {
    name: "TikTok",
    pattern: /musical_ly|BytedanceWebview|TikTok/i
  }, {
    name: "LinkedIn",
    pattern: /LinkedInApp/
  }, {
    name: "Snapchat",
    pattern: /Snapchat/
  }, {
    name: "Pinterest",
    pattern: /Pinterest/
  }, {
    name: "X",
    pattern: /Twitter/
  }, {
    name: "LINE",
    pattern: /\bLine\//
  }, {
    name: "WeChat",
    pattern: /MicroMessenger/
  }, {
    name: "Google",
    pattern: /\bGSA\//
  }];
  const ANDROID_WEBVIEW = /; wv\)/;

  // Parâmetro que leva a rota (hash) pelo link intent, já que a URL intent:// não carrega fragmento.
  const ROUTE_PARAM = "blRoute";
  function detectPlatform(userAgent) {
    if (/Android/i.test(userAgent)) {
      return "android";
    }
    return isIos() ? "ios" : "other";
  }

  // appName null indica WebView genérico; null retornado indica navegador comum.
  function detectInAppBrowser(userAgent = navigator.userAgent) {
    const known = KNOWN_IN_APP_BROWSERS.find(({
      pattern
    }) => pattern.test(userAgent));
    if (!known && !ANDROID_WEBVIEW.test(userAgent)) {
      return null;
    }
    return {
      appName: known?.name ?? null,
      platform: detectPlatform(userAgent)
    };
  }
  function androidIntentUrl(location) {
    const target = new URL(location.href);
    target.hash = "";
    if (location.hash.length > 1) {
      target.searchParams.set(ROUTE_PARAM, location.hash.slice(1));
    }
    return `intent://${target.host}${target.pathname}${target.search}#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(target.href)};end`;
  }

  // null quando a plataforma não tem atalho para sair do app.
  function externalBrowserUrl(platform, location = window.location) {
    if (platform === "android") {
      return androidIntentUrl(location);
    }
    return platform === "ios" ? `x-safari-${location.href}` : null;
  }
  function currentUrl(location = window.location) {
    return location.href;
  }

  /**
   * Devolve a rota do hash que o link intent do Android levou na busca (blRoute),
   * pois o Chrome abre a URL sem o fragmento.
   */
  function restoreForwardedRoute() {
    const params = new URLSearchParams(window.location.search);
    const route = params.get(ROUTE_PARAM);
    if (route === null) {
      return;
    }
    params.delete(ROUTE_PARAM);
    const search = params.toString();
    const query = search ? `?${search}` : "";
    window.history.replaceState(null, "", `${window.location.pathname}${query}#${route}`);
  }
  var __exports = {
    __esModule: true
  };
  __exports.detectInAppBrowser = detectInAppBrowser;
  __exports.externalBrowserUrl = externalBrowserUrl;
  __exports.currentUrl = currentUrl;
  __exports.restoreForwardedRoute = restoreForwardedRoute;
  return __exports;
});
//# sourceMappingURL=inAppBrowser-dbg.js.map
