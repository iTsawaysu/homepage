type GaFunction = (...args: unknown[]) => void;

declare global {
  interface Window {
    ga?: GaFunction;
  }
}

const callGa = (...args: unknown[]): void => {
  if (typeof window.ga !== "function") {
    return;
  }

  try {
    window.ga(...args);
  } catch {}
};

export type NativeAnalytics = {
  init(): void;
  pageView(): void;
  clickEvent(category: string, label: unknown): void;
};

export const createNativeAnalytics = (): NativeAnalytics => ({
  init: () => {
    callGa("create", "UA-63786641-1", "auto");
  },
  pageView: () => {
    callGa("send", "pageview", document.location.hash);
  },
  clickEvent: (category, label) => {
    callGa("send", "event", category, "click", label);
  },
});
