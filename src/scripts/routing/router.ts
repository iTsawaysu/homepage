import {
  DEFAULT_HASH_ROUTE,
  normalizeLegacyHashInput,
  parseLegacyHashRoute,
} from "./parse-hash";
import { dispatchLegacyRouteTarget } from "./dispatch";
import {
  getRouteLifecycle,
} from "../runtime/route-lifecycle";
import {
  NATIVE_RUNTIME_READY_EVENT,
} from "../runtime/native-runtime";

let isStarted = false;
let lastDispatchedHash: string | null = null;

const isDefaultHash = (hash: string): boolean => {
  const trimmedHash = hash.trim();

  return trimmedHash === "" || trimmedHash === "#";
};

const dispatchHash = (hash: string): void => {
  const normalizedHash = normalizeLegacyHashInput(hash);

  if (normalizedHash === lastDispatchedHash) {
    return;
  }

  const target = parseLegacyHashRoute(normalizedHash);

  if (dispatchLegacyRouteTarget(target)) {
    lastDispatchedHash = normalizedHash;
  }
};

const dispatchCurrentHash = (): void => {
  dispatchHash(window.location.hash);
};

const routeCurrentHash = (): void => {
  if (isDefaultHash(window.location.hash)) {
    window.location.hash = DEFAULT_HASH_ROUTE;
    window.setTimeout(dispatchCurrentHash, 0);
    return;
  }

  dispatchCurrentHash();
};

const startRouter = (): boolean => {
  // P3: ready-gate only on RouteLifecycle.
  if (isStarted || !getRouteLifecycle()?.isReady()) {
    return false;
  }

  isStarted = true;
  window.addEventListener("hashchange", dispatchCurrentHash);
  routeCurrentHash();

  return true;
};

export const initHashRouter = (): void => {
  if (startRouter()) {
    return;
  }

  // RouteLifecycle is installed inside initNativeRuntimeHost before READY fires.
  window.addEventListener(NATIVE_RUNTIME_READY_EVENT, () => {
    startRouter();
  });
};
