import type { LegacyHashRouteTarget } from "./parse-hash";
import { getRouteLifecycle } from "../runtime/route-lifecycle";

/**
 * Delegates parsed route targets to RouteLifecycle.navigate.
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
