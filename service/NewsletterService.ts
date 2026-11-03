import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

export interface NewsletterSubscribeInput {
    Name?: string;
    Email: string;
}

export interface NewsletterSubscribeResult {
    Subscribed: boolean;
    AlreadySubscribed: boolean;
    Message: string;
}

export interface NewsletterUnsubscribeResult {
    Unsubscribed: boolean;
    Message: string;
}

export interface NewsletterSendInput {
    Subject: string;
    Body: string;
}

export interface NewsletterSendResult {
    Sent: boolean;
    Recipients: number;
    Failures: number;
    Message: string;
}

/**
 * Serviço de newsletter: usa o modelo público (Catalog) para o cadastro no rodapé
 * e o modelo administrativo (BenditaLook) para envio e contagem de inscritos.
 */
export default class NewsletterService {

    constructor(private readonly model: ODataModel) { }

    public async subscribe(input: NewsletterSubscribeInput): Promise<NewsletterSubscribeResult> {
        const operation = this.model.bindContext("/Subscribe(...)");

        operation.setParameter("Input", input);

        await operation.invoke();

        return operation.getBoundContext().getObject() as NewsletterSubscribeResult;
    }

    public async unsubscribe(token: string): Promise<NewsletterUnsubscribeResult> {
        const operation = this.model.bindContext("/Unsubscribe(...)");

        operation.setParameter("Token", token);

        await operation.invoke();

        return operation.getBoundContext().getObject() as NewsletterUnsubscribeResult;
    }

    public async send(input: NewsletterSendInput): Promise<NewsletterSendResult> {
        const operation = this.model.bindContext("/SendNewsletter(...)");

        operation.setParameter("Campaign", input);

        await operation.invoke();

        return operation.getBoundContext().getObject() as NewsletterSendResult;
    }

    public async activeCount(): Promise<number> {
        const contexts = await this.model
            .bindList("/Subscribers", undefined, undefined, undefined, { $filter: "Active eq true" })
            .requestContexts();

        return contexts.length;
    }

}
