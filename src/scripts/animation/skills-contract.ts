import { LEGACY_ANIMATION_TIMINGS } from "./timings";

export const LEGACY_SKILLS_COUNT_CONTRACT = {
  owner: "ts-owned" as const,
  countToOwner: "ts-owned" as const,
  from: 0,
  // Duration authority: MotionScale (LEGACY_ANIMATION_TIMINGS).
  speedMs: LEGACY_ANIMATION_TIMINGS.skillCountDurationMs,
  decimals: 1,
  formatter: "GSAP numeric tween + value.toFixed(decimals)",
} as const;
