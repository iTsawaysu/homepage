import {
  DEFAULT_HASH_ROUTE,
  normalizeLegacyHashInput,
  parseLegacyHashRoute,
} from "./parse-hash";
import { dispatchLegacyRouteTarget } from "./dispatch";
import {
  getLegacyRuntimeBridge,
  LEGACY_RUNTIME_BRIDGE_READY_EVENT,
} from "./legacy-runtime-bridge";
import {
  getNativeRuntimeHost,
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
  const bridge = getLegacyRuntimeBridge();
  const nativeHost = getNativeRuntimeHost();

  if (isStarted || (!nativeHost?.isReady() && !bridge?.isReady())) {
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

  window.addEventListener(LEGACY_RUNTIME_BRIDGE_READY_EVENT, () => {
    startRouter();
  });
  window.addEventListener(NATIVE_RUNTIME_READY_EVENT, () => {
    startRouter();
  });
};
