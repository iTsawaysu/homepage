// MotionScale authority: single source for cross-module motion durations.
// Export name LEGACY_ANIMATION_TIMINGS is retained for import stability;
// treat this object as the only writable/true values for route, detail,
// menu, and title-reveal timings. Do not hard-code parallel delay numbers
// in routes, contracts, or switch/slide helpers.
export const LEGACY_ANIMATION_TIMINGS = {
  routeTransitionSeconds: 0.3,
  titleRevealDurationMs: 750,
  titleRevealDelayMs: 450,
  skillCountDurationMs: 1500,
  // True execution value from detail dispatch path (was a misleading 300).
  detailRouteDispatchDelayMs: 500,
  contentPayloadRetryDelayMs: 1000,
  switchSlideRetryDelayMs: 100,
  menuBoxAnimationSeconds: 0.25,
  menuHoverAnimationSeconds: 0.2,
  routeElementExitDelaySeconds: 0.12,
  contactIconExitDelaySeconds: 0.18,
  routeExitDurationSeconds: 0.3,
  routeExitDelayStepSeconds: 0.06,
  routeExitStaggerSeconds: 0.06,
} as const;
