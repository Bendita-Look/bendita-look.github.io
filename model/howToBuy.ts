export interface HowToBuyStep {
    id: string;
    icon: string;
    number: number;
    title: string;
    text: string;
    actionText?: string;
    actionRoute?: string;
    actionParams?: Record<string, string>;
}

interface StepAction {
    route: string;
    params?: Record<string, string>;
}

interface StepDefinition {
    id: string;
    icon: string;
    action?: StepAction;
}

/** Etapas numeradas do tutorial "como comprar", compartilhadas entre o diálogo e a página de ajuda. */
const STEPS: StepDefinition[] = [
    { id: "choose", icon: "sap-icon://search", action: { route: "catalog" } },
    { id: "size", icon: "sap-icon://measure" },
    { id: "cart", icon: "sap-icon://cart", action: { route: "cart" } },
    { id: "checkout", icon: "sap-icon://form" },
    { id: "whatsapp", icon: "sap-icon://discussion" },
    { id: "track", icon: "sap-icon://shipping-status", action: { route: "myOrders" } },
    { id: "exchange", icon: "sap-icon://journey-change", action: { route: "policy", params: { type: "RETURN" } } }
];

function buildStepAction(
    step: StepDefinition,
    getText: (key: string) => string
): Pick<HowToBuyStep, "actionText" | "actionRoute" | "actionParams"> {
    if (!step.action) {
        return {};
    }

    return {
        actionText: getText(`howToBuy.${step.id}.action`),
        actionRoute: step.action.route,
        actionParams: step.action.params
    };
}

export function buildHowToBuySteps(getText: (key: string) => string): HowToBuyStep[] {
    return STEPS.map((step, index) => ({
        id: step.id,
        icon: step.icon,
        number: index + 1,
        title: getText(`howToBuy.${step.id}.title`),
        text: getText(`howToBuy.${step.id}.text`),
        ...buildStepAction(step, getText)
    }));
}
