sap.ui.define([], function () {
  "use strict";

  const GENERIC_TRANSPORT_ERROR = /^(Communication error|Network error|Failed to fetch)/i;
  const FIELD_LABEL_KEYS = new Map([["Size", "measurementSize"], ["Label", "measurementLabel"], ["Value", "measurementValue"], ["Price", "price"]]);
  function getFieldLabel(target, getText) {
    if (typeof target !== "string") {
      return undefined;
    }
    const field = target.split("/").pop() ?? "";
    const key = FIELD_LABEL_KEYS.get(field);
    return key ? getText(key) : undefined;
  }
  function describeDetail(detail, getText) {
    if (typeof detail.message !== "string" || !detail.message.trim()) {
      return undefined;
    }
    const fieldLabel = getFieldLabel(detail.target, getText);
    return fieldLabel ? `${fieldLabel}: ${detail.message}` : detail.message;
  }
  function describeDetails(details, getText) {
    if (!Array.isArray(details)) {
      return undefined;
    }
    const messages = details.map(detail => describeDetail(detail, getText)).filter(message => !!message);
    const uniqueMessages = [...new Set(messages)];
    return uniqueMessages.length > 0 ? uniqueMessages.join("\n") : undefined;
  }
  function getBackendErrorMessage(error, getText) {
    const visited = new Set();
    let current = error;
    while (current && !visited.has(current)) {
      visited.add(current);
      const candidate = current;
      const detailsMessage = describeDetails(candidate.error?.details, getText);
      if (detailsMessage) {
        return detailsMessage;
      }
      const backendMessage = candidate.error?.message;
      if (typeof backendMessage === "string" && backendMessage.trim()) {
        return backendMessage;
      }
      if (typeof candidate.message === "string" && candidate.message.trim() && !GENERIC_TRANSPORT_ERROR.test(candidate.message)) {
        return candidate.message;
      }
      current = candidate.cause;
    }
    return undefined;
  }
  var __exports = {
    __esModule: true
  };
  __exports.getBackendErrorMessage = getBackendErrorMessage;
  return __exports;
});
//# sourceMappingURL=feedback-dbg.js.map
