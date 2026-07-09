type LegacyPathJsCallback = (
  this: { params: Record<string, string> },
) => unknown;

type LegacyPathJsRoute = {
  enter(callback: LegacyPathJsCallback | LegacyPathJsCallback[]): LegacyPathJsRoute;
  to(callback: LegacyPathJsCallback): LegacyPathJsRoute;
};

type LegacyPathJs = {
  map(pattern: string): LegacyPathJsRoute;
  rescue(callback: LegacyPathJsCallback): void;
  listen(): void;
  __homepageRouteBridge?: LegacyRuntimeBridge;
};

type CapturedLegacyRoute = {
  pattern: string;
  enterCallbacks: LegacyPathJsCallback[];
  action: LegacyPathJsCallback | null;
};

export type CapturedLegacyRouteState = {
  pattern: string;
  enterCallbackCount: number;
  hasAction: boolean;
  actionLifecycleHints: string[];
};

export type LegacyRuntimeBridge = {
  isReady(): boolean;
  dispatchPattern(pattern: string, params?: Record<string, string>): boolean;
  dispatchError(): boolean;
  getCapturedRoutes(): readonly CapturedLegacyRouteState[];
};

export const LEGACY_RUNTIME_BRIDGE_READY_EVENT =
  "homepage:legacy-runtime-bridge-ready";

declare global {
  interface Window {
    pathjs?: LegacyPathJs;
  }
}

const runCallbacks = (
  route: CapturedLegacyRoute,
  params: Record<string, string>,
): boolean => {
  const context = { params };

  for (const callback of route.enterCallbacks) {
    if (callback.call(context) === false) {
      return true;
    }
  }

  route.action?.call(context);
  return true;
};

const LIFECYCLE_METHOD_HINTS = [
  "exitCurrentSlide",
  "switchSlide",
  "resetSlide",
  "enterHello",
  "enterAbout",
  "enterAchievements",
  "enterCoding",
  "enterDesign",
  "enterCaseStudy",
  "enterArticle",
  "enterContact",
  "enterError",
  "setActiveNav",
  "getCaseStudy",
  "getArticle",
] as const;

const getActionLifecycleHints = (
  callback: LegacyPathJsCallback | null,
): string[] => {
  if (!callback) {
    return [];
  }

  const source = callback.toString();

  return LIFECYCLE_METHOD_HINTS.filter((method) =>
    source.includes(`.${method}`),
  );
};

const getCapturedRouteState = (
  route: CapturedLegacyRoute,
): CapturedLegacyRouteState => ({
  pattern: route.pattern,
  enterCallbackCount: route.enterCallbacks.length,
  hasAction: Boolean(route.action),
  actionLifecycleHints: getActionLifecycleHints(route.action),
});

const getOrCreateRoute = (
  routes: Map<string, CapturedLegacyRoute>,
  pattern: string,
): CapturedLegacyRoute => {
  const existingRoute = routes.get(pattern);

  if (existingRoute) {
    return existingRoute;
  }

  const route = {
    pattern,
    enterCallbacks: [],
    action: null,
  };

  routes.set(pattern, route);
  return route;
};

export const installLegacyRuntimeBridge = (): boolean => {
  const pathjs = window.pathjs;

  if (!pathjs) {
    return false;
  }

  if (pathjs.__homepageRouteBridge) {
    return true;
  }

  const routes = new Map<string, CapturedLegacyRoute>();
  const patchedRoutes = new WeakSet<LegacyPathJsRoute>();
  let rescueCallback: LegacyPathJsCallback | null = null;
  let ready = false;

  const originalMap = pathjs.map.bind(pathjs);
  const originalRescue = pathjs.rescue.bind(pathjs);

  const bridge: LegacyRuntimeBridge = {
    isReady: () => ready,
    dispatchPattern: (pattern, params = {}) => {
      const route = routes.get(pattern);

      if (!ready || !route?.action) {
        return false;
      }

      return runCallbacks(route, params);
    },
    dispatchError: () => {
      if (!ready || !rescueCallback) {
        return false;
      }

      rescueCallback.call({ params: {} });
      return true;
    },
    getCapturedRoutes: () =>
      Array.from(routes.values()).map(getCapturedRouteState),
  };

  pathjs.__homepageRouteBridge = bridge;

  pathjs.map = function map(pattern: string) {
    const legacyRoute = originalMap(pattern);
    const capturedRoute = getOrCreateRoute(routes, pattern);

    if (patchedRoutes.has(legacyRoute)) {
      return legacyRoute;
    }

    const originalEnter = legacyRoute.enter;
    const originalTo = legacyRoute.to;

    legacyRoute.enter = function enter(callback) {
      if (Array.isArray(callback)) {
        capturedRoute.enterCallbacks.push(...callback);
      } else {
        capturedRoute.enterCallbacks.push(callback);
      }

      return originalEnter.call(this, callback);
    };

    legacyRoute.to = function to(callback) {
      capturedRoute.action = callback;
      return originalTo.call(this, callback);
    };

    patchedRoutes.add(legacyRoute);
    return legacyRoute;
  };

  pathjs.rescue = function rescue(callback: LegacyPathJsCallback) {
    rescueCallback = callback;
    return originalRescue(callback);
  };

  pathjs.listen = function listen() {
    ready = true;
    window.dispatchEvent(new Event(LEGACY_RUNTIME_BRIDGE_READY_EVENT));
  };

  return true;
};

export const getLegacyRuntimeBridge = (): LegacyRuntimeBridge | null =>
  window.pathjs?.__homepageRouteBridge ?? null;
