export const LEGACY_ANIMATION_TIMINGS = {
  routeTransitionSeconds: 0.5,
  titleRevealDurationMs: 750,
  titleRevealDelayMs: 750,
  skillCountDurationMs: 1500,
  detailRouteDispatchDelayMs: 500,
  contentPayloadRetryDelayMs: 1000,
  switchSlideRetryDelayMs: 100,
  menuBoxAnimationSeconds: 0.25,
  menuHoverAnimationSeconds: 0.2,
  routeElementExitDelaySeconds: 0.2,
  contactIconExitDelaySeconds: 0.3,
} as const;

export type LegacyAnimationTimings = typeof LEGACY_ANIMATION_TIMINGS;
