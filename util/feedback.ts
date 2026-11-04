const GENERIC_TRANSPORT_ERROR = /^(Communication error|Network error|Failed to fetch)/i;

const FIELD_LABEL_KEYS = new Map<string, string>([
    ["Size", "measurementSize"],
    ["Label", "measurementLabel"],
    ["Value", "measurementValue"],
    ["Price", "price"]
]);

export type TextResolver = (key: string) => string;

interface BackendErrorDetail {
    message?: unknown;
    target?: unknown;
}

function getFieldLabel(target: unknown, getText: TextResolver): string | undefined {
    if (typeof target !== "string") {
        return undefined;
    }

    const field = target.split("/").pop() ?? "";
    const key = FIELD_LABEL_KEYS.get(field);

    return key ? getText(key) : undefined;
}

function describeDetail(detail: BackendErrorDetail, getText: TextResolver): string | undefined {
    if (typeof detail.message !== "string" || !detail.message.trim()) {
        return undefined;
    }

    const fieldLabel = getFieldLabel(detail.target, getText);

    return fieldLabel ? `${fieldLabel}: ${detail.message}` : detail.message;
}

function describeDetails(details: unknown, getText: TextResolver): string | undefined {
    if (!Array.isArray(details)) {
        return undefined;
    }

    const messages = (details as BackendErrorDetail[])
        .map((detail) => describeDetail(detail, getText))
        .filter((message): message is string => !!message);
    const uniqueMessages = [...new Set(messages)];

    return uniqueMessages.length > 0 ? uniqueMessages.join("\n") : undefined;
}

export function getBackendErrorMessage(error: unknown, getText: TextResolver): string | undefined {
    const visited = new Set<unknown>();
    let current: unknown = error;

    while (current && !visited.has(current)) {
        visited.add(current);

        const candidate = current as {
            error?: { message?: unknown; details?: unknown };
            message?: unknown;
            cause?: unknown;
        };

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
