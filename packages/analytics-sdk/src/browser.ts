import { init, track, trackPageView, identifyUser, getSessionId, getUserId, onRouteChange } from "./index";

export interface AnalyticsBrowserConfig {
  apiKey: string;
  endpoint?: string;
  sessionTimeout?: number;
  retryCount?: number;
  autoPageView?: boolean;
  onRouteChange?: () => void;
}

function setupAutoTracking(config: AnalyticsBrowserConfig): void {
  if (typeof window === "undefined" || !config.autoPageView) return;

  if ("onpopstate" in window) {
    window.addEventListener("popstate", () => {
      onRouteChange();
    });
  }

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  const handleRouteChange = () => {
    if (config.onRouteChange) {
      config.onRouteChange();
    }
    onRouteChange();
  };

  window.history.pushState = function (...args: unknown[]) {
    originalPushState.apply(window.history, args as Parameters<typeof originalPushState>);
    handleRouteChange();
  };

  window.history.replaceState = function (...args: unknown[]) {
    originalReplaceState.apply(window.history, args as Parameters<typeof originalReplaceState>);
    handleRouteChange();
  };
}

export function initBrowser(apiKey: string, config?: AnalyticsBrowserConfig): void {
  init(apiKey, config);

  setupAutoTracking({
    apiKey,
    autoPageView: config?.autoPageView ?? true,
    onRouteChange: config?.onRouteChange,
  });

  trackPageView();
}

export { track, trackPageView, identifyUser, getSessionId, getUserId, onRouteChange };

export default {
  init: initBrowser,
  track,
  trackPageView,
  identifyUser,
  getSessionId,
  getUserId,
  onRouteChange,
};