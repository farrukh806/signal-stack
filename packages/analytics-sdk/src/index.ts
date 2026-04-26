export interface AnalyticsConfig {
  apiKey: string;
  endpoint?: string;
  sessionTimeout?: number;
  retryCount?: number;
}

export interface EventProperties {
  [key: string]: unknown;
}

export interface TrackOptions {
  properties?: EventProperties;
  timestamp?: Date;
}

export interface EventPayload {
  apiKey: string;
  name: string;
  properties?: EventProperties;
  sessionId: string;
  userId: string;
  url: string;
  referrer: string;
  timestamp: string;
}

export interface PageViewPayload {
  apiKey: string;
  name: "page_view";
  properties: {
    url: string;
    referrer: string;
    title?: string;
  };
  sessionId: string;
  userId: string;
  url: string;
  referrer: string;
  timestamp: string;
}

export interface AnalyticsInstance {
  init: (apiKey: string, options?: Partial<AnalyticsConfig>) => void;
  track: (name: string, properties?: EventProperties) => void;
  trackPageView: (properties?: { title?: string }) => void;
  identifyUser: (userId: string) => void;
  getSessionId: () => string;
  getUserId: () => string;
  onRouteChange?: () => void;
}

const STORAGE_KEYS = {
  SESSION_ID: "analytics_session_id",
  USER_ID: "analytics_user_id",
  LAST_ACTIVITY: "analytics_last_activity",
} as const;

const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_RETRY_COUNT = 2;
const DEFAULT_ENDPOINT = "/events";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function getTimestamp(): string {
  return new Date().toISOString();
}

function getMetadata(): { url: string; referrer: string } {
  if (typeof window === "undefined") {
    return { url: "", referrer: "" };
  }
  return {
    url: window.location.href,
    referrer: document.referrer || "",
  };
}

class AnalyticsSDK implements AnalyticsInstance {
  private apiKey: string = "";
  private sessionId: string = "";
  private userId: string = "";
  private endpoint: string = DEFAULT_ENDPOINT;
  private sessionTimeoutMs: number = DEFAULT_SESSION_TIMEOUT_MS;
  private retryCount: number = DEFAULT_RETRY_COUNT;
  private initialized: boolean = false;
  private routeChangeHandler: (() => void) | null = null;

  init(apiKey: string, options?: Partial<AnalyticsConfig>): void {
    if (!apiKey || typeof apiKey !== "string") {
      console.warn("[Analytics] Invalid API key provided");
      return;
    }

    this.apiKey = apiKey;
    this.endpoint = options?.endpoint || this.endpoint;
    this.sessionTimeoutMs = options?.sessionTimeout || this.sessionTimeoutMs;
    this.retryCount = options?.retryCount || this.retryCount;

    this.userId = this.getOrCreateUserId();
    this.sessionId = this.getOrCreateSession();

    if (typeof window !== "undefined") {
      this.setupVisibilityHandler();
      this.setupBeforeUnloadHandler();
    }

    this.initialized = true;
  }

  track(name: string, properties?: EventProperties): void {
    if (!this.initialized) {
      console.warn("[Analytics] SDK not initialized. Call init() first.");
      return;
    }

    if (!name || typeof name !== "string") {
      console.warn("[Analytics] Invalid event name");
      return;
    }

    this.refreshSession();

    const { url, referrer } = getMetadata();

    const payload: EventPayload = {
      apiKey: this.apiKey,
      name,
      properties: properties || {},
      sessionId: this.sessionId,
      userId: this.userId,
      url,
      referrer,
      timestamp: getTimestamp(),
    };

    this.sendWithRetry(payload);
  }

  trackPageView(properties?: { title?: string }): void {
    if (!this.initialized) {
      console.warn("[Analytics] SDK not initialized. Call init() first.");
      return;
    }

    this.refreshSession();

    const { url, referrer } = getMetadata();

    const payload: PageViewPayload = {
      apiKey: this.apiKey,
      name: "page_view",
      properties: {
        url,
        referrer,
        title: properties?.title || document.title,
      },
      sessionId: this.sessionId,
      userId: this.userId,
      url,
      referrer,
      timestamp: getTimestamp(),
    };

    this.sendWithRetry(payload);
  }

  identifyUser(userId: string): void {
    if (!userId || typeof userId !== "string") {
      return;
    }
    this.userId = userId;
    this.persistUserId();
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getUserId(): string {
    return this.userId;
  }

  onRouteChange(): void {
    this.trackPageView();
  }

  private getOrCreateUserId(): string {
    if (typeof localStorage === "undefined") {
      return generateId();
    }

    let userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    if (!userId) {
      userId = generateId();
      localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
    }
    return userId;
  }

  private persistUserId(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.USER_ID, this.userId);
    }
  }

  private getOrCreateSession(): string {
    if (typeof localStorage === "undefined") {
      return generateId();
    }

    const lastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
    const now = Date.now();

    if (lastActivity) {
      const lastActivityTime = parseInt(lastActivity, 10);
      if (now - lastActivityTime > this.sessionTimeoutMs) {
        this.sessionId = generateId();
        localStorage.setItem(STORAGE_KEYS.SESSION_ID, this.sessionId);
      } else {
        const storedSessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
        this.sessionId = storedSessionId || generateId();
      }
    } else {
      this.sessionId = generateId();
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, this.sessionId);
    }

    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, now.toString());
    return this.sessionId;
  }

  private refreshSession(): void {
    if (typeof localStorage === "undefined") return;

    const lastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
    const now = Date.now();

    if (lastActivity) {
      const lastActivityTime = parseInt(lastActivity, 10);
      if (now - lastActivityTime > this.sessionTimeoutMs) {
        this.sessionId = generateId();
        localStorage.setItem(STORAGE_KEYS.SESSION_ID, this.sessionId);
      }
    }

    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, now.toString());
  }

  private setupVisibilityHandler(): void {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        this.refreshSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  private setupBeforeUnloadHandler(): void {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = () => {
      this.persistActivity();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
  }

  private persistActivity(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
    }
  }

  private async sendWithRetry(payload: EventPayload, attempt: number = 0): Promise<void> {
    try {
      await this.send(payload);
    } catch (error) {
      if (attempt < this.retryCount) {
        const delay = Math.pow(2, attempt) * 100;
        setTimeout(() => {
          this.sendWithRetry(payload, attempt + 1);
        }, delay);
      }
    }
  }

  private async send(payload: EventPayload): Promise<void> {
    const url = this.endpoint.startsWith("http")
      ? this.endpoint
      : `${window.location.origin}${this.endpoint}`;

    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (error) {
      console.debug("[Analytics] Failed to send event:", error);
    }
  }
}

const analytics = new AnalyticsSDK();

export function createAnalytics(): AnalyticsInstance {
  return analytics;
}

export function init(apiKey: string, options?: Partial<AnalyticsConfig>): void {
  analytics.init(apiKey, options);
}

export function track(name: string, properties?: EventProperties): void {
  analytics.track(name, properties);
}

export function trackPageView(properties?: { title?: string }): void {
  analytics.trackPageView(properties);
}

export function identifyUser(userId: string): void {
  analytics.identifyUser(userId);
}

export function getSessionId(): string {
  return analytics.getSessionId();
}

export function getUserId(): string {
  return analytics.getUserId();
}

export function onRouteChange(): void {
  analytics.onRouteChange();
}

export { analytics };
export default analytics;