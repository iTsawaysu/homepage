import type { LegacyHashRouteTarget } from "./parse-hash";
import { getRouteLifecycle } from "../runtime/route-lifecycle";

/**
 * Thin navigate delegate (P3). Orchestration lives in RouteLifecycle.navigate.
 */
export const dispatchLegacyRouteTarget = (
  target: LegacyHashRouteTarget,
): boolean => {
  const routeLifecycle = getRouteLifecycle();

  if (!routeLifecycle?.isReady()) {
    return false;
  }

  return routeLifecycle.navigate(target);
};
