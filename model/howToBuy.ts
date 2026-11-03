export interface HowToBuyStep {
    id: string;
    icon: string;
    title: string;
    text: string;
}

/** Etapas numeradas do tutorial "como comprar", compartilhadas entre o diálogo e a página de ajuda. */
const STEPS: Array<{ id: string; icon: string }> = [
    { id: "choose", icon: "sap-icon://search" },
    { id: "size", icon: "sap-icon://measure" },
    { id: "cart", icon: "sap-icon://cart" },
    { id: "checkout", icon: "sap-icon://form" },
    { id: "whatsapp", icon: "sap-icon://discussion" },
    { id: "track", icon: "sap-icon://shipping-status" }
];

export function buildHowToBuySteps(getText: (key: string) => string): HowToBuyStep[] {
    return STEPS.map((step) => ({
        id: step.id,
        icon: step.icon,
        title: getText(`howToBuy.${step.id}.title`),
        text: getText(`howToBuy.${step.id}.text`)
    }));
}
