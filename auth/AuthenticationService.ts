import { IAuthenticationProvider } from "./IAuthenticationProvider";
import { UserSession } from "./models/UserSession";
import { SessionStorage } from "./storage/SessionStorage";

export class AuthenticationService {

    private static provider: IAuthenticationProvider;

    private static sessionExpiredHandler: (() => void) | null = null;

    private static authErrorHandler: ((message: string) => void) | null = null;

    private static authErrorPending = false;

    private static authChangedHandler: (() => void) | null = null;

    public static initialize(provider: IAuthenticationProvider): void {

        this.provider = provider;

    }

    public static async login(): Promise<void> {

        const session = await this.provider.login();

        SessionStorage.save(session);

        this.notifyAuthChanged();

    }

    public static async loginWithPassword(username: string, password: string): Promise<void> {

        const session = await this.provider.loginWithPassword(username, password);

        SessionStorage.save(session);

        this.notifyAuthChanged();

    }

    public static async logout(): Promise<void> {

        SessionStorage.clear();

        await this.provider.logout();

        this.notifyAuthChanged();

    }

    public static getSession(): UserSession | null {

        return SessionStorage.load();

    }

    public static async isAuthenticated(): Promise<boolean> {

        return this.provider.isAuthenticated();

    }

    public static onSessionExpired(handler: () => void): void {

        this.sessionExpiredHandler = handler;

    }

    public static notifySessionExpired(): void {

        SessionStorage.clear();

        this.notifyAuthChanged();

        this.sessionExpiredHandler?.();

    }

    /** Registra o handler chamado quando o login/logout muda (o app reinicia os avisos de pedidos). */
    public static onAuthChanged(handler: () => void): void {

        this.authChangedHandler = handler;

    }

    private static notifyAuthChanged(): void {

        this.authChangedHandler?.();

    }

    public static onAuthError(handler: (message: string) => void): void {

        this.authErrorHandler = handler;

    }

    public static notifyAuthError(message: string): void {

        this.authErrorPending = true;

        this.authErrorHandler?.(message);

    }

    public static isAuthErrorPending(): boolean {

        return this.authErrorPending;

    }

    public static clearAuthError(): void {

        this.authErrorPending = false;

    }

}