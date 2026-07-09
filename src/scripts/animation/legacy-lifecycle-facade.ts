import {
  LEGACY_LIFECYCLE_METHODS,
  getLifecycleRegistryState,
  markLifecycleInstanceCaptured,
  markLifecycleMethodWrapped,
  recordLifecycleMethodCall,
  recordLifecycleMethodFallback,
  setLifecycleOwner,
  type LegacyLifecycleMethodName,
  type LifecycleRegistryState,
} from "./lifecycle-registry";
import { runEnterAchievementsAnimation } from "./enter-achievements";
import { runEnterAboutAnimation } from "./enter-about";
import { runEnterArticleAnimation } from "./enter-article";
import { runEnterCaseStudyAnimation } from "./enter-case-study";
import { runEnterCodingAnimation } from "./enter-coding";
import { runEnterContactAnimation } from "./enter-contact";
import { runEnterDesignAnimation } from "./enter-design";
import { runEnterErrorAnimation } from "./enter-error";
import { runEnterHelloAnimation } from "./enter-hello";
import {
  runGetArticleSelection,
  runGetCaseStudySelection,
} from "./detail-selection";
import { runExitCurrentSlideLifecycle } from "./slide-exit";
import { runResetSlideLifecycle } from "./slide-reset";
import { runSwitchSlideLifecycle } from "./slide-switch";
import { applyActiveNavState } from "../routing/nav-state";

export const LEGACY_LIFECYCLE_CAPTURED_EVENT =
  "homepage:legacy-lifecycle-captured";

export type LegacyLifecycleFunction = (...args: unknown[]) => unknown;

export type LegacyLifecycleInstance = Partial<
  Record<LegacyLifecycleMethodName, LegacyLifecycleFunction>
> & {
  bCoding?: unknown;
  bContact?: unknown;
  bDesign?: unknown;
  bError?: unknown;
  bCaseStudy?: unknown;
  bArticle?: unknown;
  bHello?: unknown;
  bAbout?: unknown;
  bAchievements?: unknown;
  caseStudyItem?: unknown;
  caseStudyWatcher?: unknown;
  createCaseStudyScrollMonitor?: () => unknown;
  articleItem?: unknown;
  articleWatcher?: unknown;
  createArticleScrollMonitor?: () => unknown;
  bSkillsLabel?: unknown;
  skillsWatcher?: unknown;
  logosWatcher?: unknown;
  nominationsWatcher?: unknown;
  ribbonsWatcher?: unknown;
  listingsWatcher?: unknown;
};

export type LegacyLifecycleFacade = {
  installCaptureHook(): void;
  capture(instance: unknown): boolean;
  isCaptured(): boolean;
  hasMethod(method: LegacyLifecycleMethodName): boolean;
  getMethod(method: LegacyLifecycleMethodName): LegacyLifecycleFunction | null;
  call(method: LegacyLifecycleMethodName, ...args: unknown[]): unknown;
  getState(): LifecycleRegistryState;
};

declare global {
  interface Window {
    __homepageCaptureLegacyLifecycle?: (
      instance: unknown,
    ) => boolean;
    __homepageLegacyLifecycle?: unknown;
  }
}

const wrappedMethods = new WeakSet<LegacyLifecycleFunction>();
const originalMethods = new WeakMap<
  LegacyLifecycleInstance,
  Map<LegacyLifecycleMethodName, LegacyLifecycleFunction>
>();

let capturedInstance: LegacyLifecycleInstance | null = null;

const TS_OWNED_METHODS = new Set<LegacyLifecycleMethodName>([
  "setActiveNav",
  "enterAchievements",
  "enterAbout",
  "enterHello",
  "enterCoding",
  "enterContact",
  "enterDesign",
  "enterError",
  "enterCaseStudy",
  "enterArticle",
  "getCaseStudy",
  "getArticle",
  "resetSlide",
  "switchSlide",
  "exitCurrentSlide",
]);

const isObjectRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  (typeof value === "object" && value !== null) || typeof value === "function";

const getAvailableMethods = (
  instance: LegacyLifecycleInstance,
): Set<LegacyLifecycleMethodName> =>
  new Set(
    LEGACY_LIFECYCLE_METHODS.filter(
      (method) => typeof instance[method] === "function",
    ),
  );

const rememberOriginalMethod = (
  instance: LegacyLifecycleInstance,
  method: LegacyLifecycleMethodName,
  original: LegacyLifecycleFunction,
): void => {
  const existing = originalMethods.get(instance);

  if (existing) {
    existing.set(method, existing.get(method) ?? original);
    return;
  }

  originalMethods.set(instance, new Map([[method, original]]));
};

const wrapMethod = (
  instance: LegacyLifecycleInstance,
  method: LegacyLifecycleMethodName,
): void => {
  const current = instance[method];

  if (typeof current !== "function") {
    return;
  }

  if (wrappedMethods.has(current)) {
    markLifecycleMethodWrapped(method);
    if (TS_OWNED_METHODS.has(method)) {
      setLifecycleOwner(method, "ts-owned");
    }
    return;
  }

  rememberOriginalMethod(instance, method, current);

  if (method === "setActiveNav") {
    const wrappedSetActiveNav: LegacyLifecycleFunction =
      function wrappedSetActiveNavLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        const routeName = String(args[0]);

        try {
          const result = applyActiveNavState(routeName);

          if (result.ok) {
            return undefined;
          }

          recordLifecycleMethodFallback(method, result.reason);
        } catch (error) {
          recordLifecycleMethodFallback(
            method,
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }

        return current.apply(this, args);
      };

    wrappedMethods.add(wrappedSetActiveNav);
    instance[method] = wrappedSetActiveNav;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  if (method === "enterError") {
    const wrappedEnterError: LegacyLifecycleFunction =
      function wrappedEnterErrorLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        let didFallback = false;
        const fallbackToLegacy = (reason: string) => {
          if (didFallback) {
            return undefined;
          }

          didFallback = true;
          recordLifecycleMethodFallback(method, reason);
          return current.apply(this, args);
        };

        try {
          const result = runEnterErrorAnimation(this, {
            onAsyncFallback: fallbackToLegacy,
          });

          if (result.ok) {
            return undefined;
          }

          return fallbackToLegacy(result.reason);
        } catch (error) {
          return fallbackToLegacy(
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }
      };

    wrappedMethods.add(wrappedEnterError);
    instance[method] = wrappedEnterError;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  if (method === "enterHello") {
    const wrappedEnterHello: LegacyLifecycleFunction =
      function wrappedEnterHelloLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        let didFallback = false;
        const fallbackToLegacy = (reason: string) => {
          if (didFallback) {
            return undefined;
          }

          didFallback = true;
          recordLifecycleMethodFallback(method, reason);
          return current.apply(this, args);
        };

        try {
          const result = runEnterHelloAnimation(this, {
            onAsyncFallback: fallbackToLegacy,
          });

          if (result.ok) {
            return undefined;
          }

          return fallbackToLegacy(result.reason);
        } catch (error) {
          return fallbackToLegacy(
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }
      };

    wrappedMethods.add(wrappedEnterHello);
    instance[method] = wrappedEnterHello;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  if (method === "enterAbout") {
    const wrappedEnterAbout: LegacyLifecycleFunction =
      function wrappedEnterAboutLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        let didFallback = false;
        const fallbackToLegacy = (reason: string) => {
          if (didFallback) {
            return undefined;
          }

          didFallback = true;
          recordLifecycleMethodFallback(method, reason);
          return current.apply(this, args);
        };

        try {
          const result = runEnterAboutAnimation(this, {
            onAsyncFallback: fallbackToLegacy,
          });

          if (result.ok) {
            return undefined;
          }

          return fallbackToLegacy(result.reason);
        } catch (error) {
          return fallbackToLegacy(
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }
      };

    wrappedMethods.add(wrappedEnterAbout);
    instance[method] = wrappedEnterAbout;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  if (method === "enterAchievements") {
    const wrappedEnterAchievements: LegacyLifecycleFunction =
      function wrappedEnterAchievementsLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        let didFallback = false;
        const fallbackToLegacy = (reason: string) => {
          if (didFallback) {
            return undefined;
          }

          didFallback = true;
          recordLifecycleMethodFallback(method, reason);
          return current.apply(this, args);
        };

        try {
          const result = runEnterAchievementsAnimation(this, {
            onAsyncFallback: fallbackToLegacy,
          });

          if (result.ok) {
            return undefined;
          }

          return fallbackToLegacy(result.reason);
        } catch (error) {
          return fallbackToLegacy(
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }
      };

    wrappedMethods.add(wrappedEnterAchievements);
    instance[method] = wrappedEnterAchievements;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  if (method === "enterContact") {
    const wrappedEnterContact: LegacyLifecycleFunction =
      function wrappedEnterContactLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        let didFallback = false;
        const fallbackToLegacy = (reason: string) => {
          if (didFallback) {
            return undefined;
          }

          didFallback = true;
          recordLifecycleMethodFallback(method, reason);
          return current.apply(this, args);
        };

        try {
          const result = runEnterContactAnimation(this, {
            onAsyncFallback: fallbackToLegacy,
          });

          if (result.ok) {
            return undefined;
          }

          return fallbackToLegacy(result.reason);
        } catch (error) {
          return fallbackToLegacy(
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }
      };

    wrappedMethods.add(wrappedEnterContact);
    instance[method] = wrappedEnterContact;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  if (method === "enterCoding") {
    const wrappedEnterCoding: LegacyLifecycleFunction =
      function wrappedEnterCodingLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        let didFallback = false;
        const fallbackToLegacy = (reason: string) => {
          if (didFallback) {
            return undefined;
          }

          didFallback = true;
          recordLifecycleMethodFallback(method, reason);
          return current.apply(this, args);
        };

        try {
          const result = runEnterCodingAnimation(this, {
            onAsyncFallback: fallbackToLegacy,
          });

          if (result.ok) {
            return undefined;
          }

          return fallbackToLegacy(result.reason);
        } catch (error) {
          return fallbackToLegacy(
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }
      };

    wrappedMethods.add(wrappedEnterCoding);
    instance[method] = wrappedEnterCoding;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  if (method === "enterDesign") {
    const wrappedEnterDesign: LegacyLifecycleFunction =
      function wrappedEnterDesignLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        let didFallback = false;
        const fallbackToLegacy = (reason: string) => {
          if (didFallback) {
            return undefined;
          }

          didFallback = true;
          recordLifecycleMethodFallback(method, reason);
          return current.apply(this, args);
        };

        try {
          const result = runEnterDesignAnimation(this, {
            onAsyncFallback: fallbackToLegacy,
          });

          if (result.ok) {
            return undefined;
          }

          return fallbackToLegacy(result.reason);
        } catch (error) {
          return fallbackToLegacy(
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }
      };

    wrappedMethods.add(wrappedEnterDesign);
    instance[method] = wrappedEnterDesign;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  if (method === "enterCaseStudy") {
    const wrappedEnterCaseStudy: LegacyLifecycleFunction =
      function wrappedEnterCaseStudyLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        let didFallback = false;
        const fallbackToLegacy = (reason: string) => {
          if (didFallback) {
            return undefined;
          }

          didFallback = true;
          recordLifecycleMethodFallback(method, reason);
          return current.apply(this, args);
        };

        try {
          const result = runEnterCaseStudyAnimation(this, {
            onAsyncFallback: fallbackToLegacy,
          });

          if (result.ok) {
            return undefined;
          }

          return fallbackToLegacy(result.reason);
        } catch (error) {
          return fallbackToLegacy(
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }
      };

    wrappedMethods.add(wrappedEnterCaseStudy);
    instance[method] = wrappedEnterCaseStudy;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  if (method === "enterArticle") {
    const wrappedEnterArticle: LegacyLifecycleFunction =
      function wrappedEnterArticleLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        let didFallback = false;
        const fallbackToLegacy = (reason: string) => {
          if (didFallback) {
            return undefined;
          }

          didFallback = true;
          recordLifecycleMethodFallback(method, reason);
          return current.apply(this, args);
        };

        try {
          const result = runEnterArticleAnimation(this, {
            onAsyncFallback: fallbackToLegacy,
          });

          if (result.ok) {
            return undefined;
          }

          return fallbackToLegacy(result.reason);
        } catch (error) {
          return fallbackToLegacy(
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }
      };

    wrappedMethods.add(wrappedEnterArticle);
    instance[method] = wrappedEnterArticle;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  if (method === "getCaseStudy") {
    const wrappedGetCaseStudy: LegacyLifecycleFunction =
      function wrappedGetCaseStudyLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        try {
          const result = runGetCaseStudySelection(this, String(args[0]));

          if (result.ok) {
            return undefined;
          }

          recordLifecycleMethodFallback(method, result.reason);
        } catch (error) {
          recordLifecycleMethodFallback(
            method,
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }

        return current.apply(this, args);
      };

    wrappedMethods.add(wrappedGetCaseStudy);
    instance[method] = wrappedGetCaseStudy;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  if (method === "getArticle") {
    const wrappedGetArticle: LegacyLifecycleFunction =
      function wrappedGetArticleLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        try {
          const result = runGetArticleSelection(this, String(args[0]));

          if (result.ok) {
            return undefined;
          }

          recordLifecycleMethodFallback(method, result.reason);
        } catch (error) {
          recordLifecycleMethodFallback(
            method,
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }

        return current.apply(this, args);
      };

    wrappedMethods.add(wrappedGetArticle);
    instance[method] = wrappedGetArticle;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  if (method === "resetSlide") {
    const wrappedResetSlide: LegacyLifecycleFunction =
      function wrappedResetSlideLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        try {
          const result = runResetSlideLifecycle(String(args[0]));

          if (result.ok) {
            return undefined;
          }

          recordLifecycleMethodFallback(method, result.reason);
        } catch (error) {
          recordLifecycleMethodFallback(
            method,
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }

        return current.apply(this, args);
      };

    wrappedMethods.add(wrappedResetSlide);
    instance[method] = wrappedResetSlide;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  if (method === "switchSlide") {
    const wrappedSwitchSlide: LegacyLifecycleFunction =
      function wrappedSwitchSlideLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        try {
          const result = runSwitchSlideLifecycle(this, String(args[0]));

          if (result.ok) {
            return undefined;
          }

          recordLifecycleMethodFallback(method, result.reason);
        } catch (error) {
          recordLifecycleMethodFallback(
            method,
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }

        return current.apply(this, args);
      };

    wrappedMethods.add(wrappedSwitchSlide);
    instance[method] = wrappedSwitchSlide;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  if (method === "exitCurrentSlide") {
    const wrappedExitCurrentSlide: LegacyLifecycleFunction =
      function wrappedExitCurrentSlideLifecycleMethod(
        this: LegacyLifecycleInstance,
        ...args: unknown[]
      ) {
        recordLifecycleMethodCall(method);

        try {
          const result = runExitCurrentSlideLifecycle(this, String(args[0]));

          if (result.ok) {
            return undefined;
          }

          recordLifecycleMethodFallback(method, result.reason);
        } catch (error) {
          recordLifecycleMethodFallback(
            method,
            error instanceof Error ? `ts-error:${error.message}` : "ts-error",
          );
        }

        return current.apply(this, args);
      };

    wrappedMethods.add(wrappedExitCurrentSlide);
    instance[method] = wrappedExitCurrentSlide;
    markLifecycleMethodWrapped(method);
    setLifecycleOwner(method, "ts-owned");
    return;
  }

  const observedMethod = method as LegacyLifecycleMethodName;
  const wrapped: LegacyLifecycleFunction = function wrappedLifecycleMethod(
    this: LegacyLifecycleInstance,
    ...args: unknown[]
  ) {
    recordLifecycleMethodCall(observedMethod);
    return current.apply(this, args);
  };

  wrappedMethods.add(wrapped);
  instance[observedMethod] = wrapped;
  markLifecycleMethodWrapped(observedMethod);
};

const captureLegacyLifecycle = (instance: unknown): boolean => {
  if (!isObjectRecord(instance)) {
    return false;
  }

  const lifecycleInstance = instance as LegacyLifecycleInstance;
  const availableMethods = getAvailableMethods(lifecycleInstance);

  if (availableMethods.size === 0) {
    return false;
  }

  capturedInstance = lifecycleInstance;
  markLifecycleInstanceCaptured(availableMethods);

  for (const method of availableMethods) {
    wrapMethod(lifecycleInstance, method);
  }

  window.dispatchEvent(new Event(LEGACY_LIFECYCLE_CAPTURED_EVENT));

  return true;
};

export const legacyLifecycleFacade: LegacyLifecycleFacade = {
  installCaptureHook: () => {
    window.__homepageCaptureLegacyLifecycle =
      captureLegacyLifecycle;

    if (window.__homepageLegacyLifecycle) {
      captureLegacyLifecycle(window.__homepageLegacyLifecycle);
    }
  },
  capture: captureLegacyLifecycle,
  isCaptured: () => capturedInstance !== null,
  hasMethod: (method) =>
    Boolean(capturedInstance && typeof capturedInstance[method] === "function"),
  getMethod: (method) => {
    if (!capturedInstance) {
      return null;
    }

    return capturedInstance[method] ?? null;
  },
  call: (method, ...args) => {
    if (!capturedInstance) {
      return undefined;
    }

    const lifecycleMethod = capturedInstance[method];

    if (typeof lifecycleMethod !== "function") {
      return undefined;
    }

    return lifecycleMethod.apply(capturedInstance, args);
  },
  getState: getLifecycleRegistryState,
};

export const installLegacyLifecycleFacade = (): LegacyLifecycleFacade => {
  legacyLifecycleFacade.installCaptureHook();

  return legacyLifecycleFacade;
};

export const getLegacyLifecycleFacade = (): LegacyLifecycleFacade =>
  legacyLifecycleFacade;
