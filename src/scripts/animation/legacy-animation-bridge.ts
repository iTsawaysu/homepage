import {
  getLegacyRuntimeBridge,
  LEGACY_RUNTIME_BRIDGE_READY_EVENT,
} from "../routing/legacy-runtime-bridge";
import {
  getNativeRuntimeHost,
  NATIVE_RUNTIME_READY_EVENT,
} from "../runtime/native-runtime";
import { getGsapEngine, getGsapVersion } from "./gsap";
import {
  LEGACY_LIFECYCLE_CAPTURED_EVENT,
  installLegacyLifecycleFacade,
} from "./legacy-lifecycle-facade";
import type {
  LegacyLifecycleMethodName,
  LifecycleRegistryState,
} from "./lifecycle-registry";
import {
  LEGACY_ANIMATION_TIMINGS,
  type LegacyAnimationTimings,
} from "./timings";
import {
  getTitleRevealHelperState,
  type TitleRevealHelperState,
} from "./title-reveal";
import {
  getAboutBridgeState,
  type AboutBridgeState,
} from "./about-contract";
import type { SkillsContractState } from "./skills-contract";
import type { AboutScrollRevealContractState } from "./scroll-reveal-contract";
import {
  getDetailLifecycleContractState,
  type DetailLifecycleContractState,
} from "./detail-contract";

const BRIDGE_VERSION = "phase-17-native-runtime" as const;

export const LEGACY_ANIMATION_AREAS = [
  "loader",
  "logo-menu-entry",
  "menu-box",
  "menu-hover",
  "route-enter-exit",
  "achievements-route-enter",
  "about-route-enter",
  "hello-route-enter",
  "error-route-enter",
  "contact-route-enter",
  "coding-route-enter",
  "design-route-enter",
  "detail-visible-animation",
  "case-study-route-enter",
  "article-route-enter",
  "title-reveal-helper",
  "title-baffle",
  "skill-count",
  "skills-count",
  "skills-label-baffle",
  "about-scroll-reveal",
  "scroll-monitor",
  "scrollMonitor",
  "countTo",
  "lazyload",
  "detail-scroll-reveal",
] as const;

export type LegacyAnimationArea = (typeof LEGACY_ANIMATION_AREAS)[number];

export type LegacyAnimationOwner =
  | "legacy"
  | "legacy-reused"
  | "ts-observed"
  | "ts-owned"
  | "mixed";

export type LegacyAnimationOwnership = {
  area: LegacyAnimationArea;
  owner: LegacyAnimationOwner;
  takeoverStatus: "blocked" | "deferred" | "ready";
  reason: string;
};

export type LegacyAnimationBridgeState = {
  version: typeof BRIDGE_VERSION;
  gsapVersion: string;
  ready: boolean;
  routeBridgeReady: boolean;
  lifecycleCaptured: boolean;
  lifecycle: LifecycleRegistryState;
  animationOwnership: readonly LegacyAnimationOwnership[];
  titleRevealHelper: TitleRevealHelperState;
  aboutBridge: AboutBridgeState;
  skillsContract: SkillsContractState;
  scrollRevealContract: AboutScrollRevealContractState;
  detailContract: DetailLifecycleContractState;
  tsOwnedVisibleAnimationCount: number;
};

export type LegacyAnimationBridge = {
  version: typeof BRIDGE_VERSION;
  gsapVersion: string;
  isReady(): boolean;
  isRouteBridgeReady(): boolean;
  owns(area: LegacyAnimationArea): boolean;
  getOwnership(): readonly LegacyAnimationOwnership[];
  getLifecycleState(): LifecycleRegistryState;
  isLifecycleCaptured(): boolean;
  isLifecycleMethodAvailable(method: LegacyLifecycleMethodName): boolean;
  getTimings(): LegacyAnimationTimings;
  getAboutBridgeState(): AboutBridgeState;
  getDetailContractState(): DetailLifecycleContractState;
  getState(): LegacyAnimationBridgeState;
};

declare global {
  interface Window {
    __homepageAnimationBridge?: LegacyAnimationBridge;
  }
}

const OWNERSHIP: readonly LegacyAnimationOwnership[] = [
  {
    area: "loader",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason: "native runtime starts the loader fade and removes the loader node.",
  },
  {
    area: "logo-menu-entry",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason: "native runtime starts the logo and menu entry tweens.",
  },
  {
    area: "menu-box",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason: "native runtime owns menu click, overlay close, and box tweens.",
  },
  {
    area: "menu-hover",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason: "native runtime owns desktop menu and nav text hover tweens.",
  },
  {
    area: "route-enter-exit",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "exitCurrentSlide, switchSlide, resetSlide, route enter lifecycles, menu, header, loader, scroll watchers, and lazyload are TypeScript-owned.",
  },
  {
    area: "achievements-route-enter",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "enterAchievements, exitCurrentSlide, switchSlide, resetSlide, listings reveal watchers, and lazy ribbon loading are TypeScript-owned.",
  },
  {
    area: "about-route-enter",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "enterAbout, exitCurrentSlide, switchSlide, resetSlide, skills count, title baffle, and about scroll reveal are TypeScript-owned.",
  },
  {
    area: "hello-route-enter",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "enterHello, exitCurrentSlide, switchSlide, resetSlide, title baffle, nav hover, and menu behavior are TypeScript-owned.",
  },
  {
    area: "error-route-enter",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "enterError, exitCurrentSlide, switchSlide, resetSlide, and title baffle are TypeScript-owned.",
  },
  {
    area: "contact-route-enter",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "enterContact, exitCurrentSlide, switchSlide, resetSlide, title baffle, and contact icon animation are TypeScript-owned.",
  },
  {
    area: "coding-route-enter",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "enterCoding, exitCurrentSlide, switchSlide, resetSlide, card population, and project note reveal are TypeScript-owned.",
  },
  {
    area: "design-route-enter",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "enterDesign, exitCurrentSlide, switchSlide, resetSlide, and card population are TypeScript-owned.",
  },
  {
    area: "detail-visible-animation",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "enterCaseStudy, enterArticle, exitCurrentSlide, switchSlide, resetSlide, detail scroll reveal, and lazyload are TypeScript-owned.",
  },
  {
    area: "case-study-route-enter",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "enterCaseStudy, getCaseStudy, exitCurrentSlide, switchSlide, resetSlide, selection, payload-ready retry, detail rendering, active nav, and detail scroll reveal are TypeScript-owned.",
  },
  {
    area: "article-route-enter",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "enterArticle, getArticle, exitCurrentSlide, switchSlide, resetSlide, selection, payload-ready retry, detail rendering, metadata restore, next/listing navigation, and detail scroll reveal are TypeScript-owned.",
  },
  {
    area: "title-reveal-helper",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "TypeScript centralizes title reveal calls and uses native baffle-compatible instances.",
  },
  {
    area: "title-baffle",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "native runtime creates baffle-compatible title instances with the legacy characters and speed.",
  },
  {
    area: "skill-count",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "TypeScript enterAbout uses a GSAP numeric tween with the legacy 1500ms duration and one-decimal formatter.",
  },
  {
    area: "skills-count",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "skills percentage labels are now driven by TypeScript through GSAP numeric tweening instead of the legacy jQuery countTo plugin.",
  },
  {
    area: "skills-label-baffle",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "bSkillsLabel instances are native baffle-compatible instances created by the native runtime host.",
  },
  {
    area: "about-scroll-reveal",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "TypeScript enterAbout registers equivalent skills/logos callbacks on the existing legacy skillsWatcher and logosWatcher instances.",
  },
  {
    area: "scroll-monitor",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason: "native IntersectionObserver watchers replace scrollMonitor.create(..., -100).",
  },
  {
    area: "scrollMonitor",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "scrollMonitor-compatible watcher instances are native IntersectionObserver wrappers.",
  },
  {
    area: "countTo",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "the legacy countTo plugin is no longer required for the about skills percentage labels.",
  },
  {
    area: "lazyload",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason: "native lazyload observes .lazy elements and preserves data-original image/background behavior.",
  },
  {
    area: "detail-scroll-reveal",
    owner: "ts-owned",
    takeoverStatus: "ready",
    reason:
      "detail reveal watcher creation, reveal callbacks, recalculate, and destroy are native runtime behavior.",
  },
];

export const installLegacyAnimationBridge = (): boolean => {
  if (window.__homepageAnimationBridge) {
    return true;
  }

  const gsap = getGsapEngine();
  const lifecycleFacade = installLegacyLifecycleFacade();
  let routeBridgeReady = Boolean(
    getLegacyRuntimeBridge()?.isReady() || getNativeRuntimeHost()?.isReady(),
  );
  let lifecycleCaptured = lifecycleFacade.isCaptured();

  const syncRouteBridgeState = () => {
    routeBridgeReady = Boolean(
      getLegacyRuntimeBridge()?.isReady() || getNativeRuntimeHost()?.isReady(),
    );
  };

  const syncLifecycleState = () => {
    lifecycleCaptured = lifecycleFacade.isCaptured();
  };

  window.addEventListener(
    LEGACY_RUNTIME_BRIDGE_READY_EVENT,
    syncRouteBridgeState,
  );
  window.addEventListener(NATIVE_RUNTIME_READY_EVENT, syncRouteBridgeState);
  window.addEventListener(
    LEGACY_LIFECYCLE_CAPTURED_EVENT,
    syncLifecycleState,
  );

  const getState = (): LegacyAnimationBridgeState => {
    const lifecycle = lifecycleFacade.getState();
    const aboutBridge = getAboutBridgeState(
      window.__homepageLegacyLifecycle,
    );
    const detailContract = getDetailLifecycleContractState();

    return {
      version: BRIDGE_VERSION,
      gsapVersion: getGsapVersion(),
      ready: Boolean(gsap),
      routeBridgeReady,
      lifecycleCaptured,
      lifecycle,
      animationOwnership: OWNERSHIP,
      titleRevealHelper: getTitleRevealHelperState(),
      aboutBridge,
      skillsContract: aboutBridge.skills,
      scrollRevealContract: aboutBridge.scrollReveal,
      detailContract,
      tsOwnedVisibleAnimationCount: OWNERSHIP.filter(
        (entry) => entry.owner === "ts-owned",
      ).length,
    };
  };

  window.__homepageAnimationBridge = {
    version: BRIDGE_VERSION,
    gsapVersion: getGsapVersion(),
    isReady: () => Boolean(gsap),
    isRouteBridgeReady: () => routeBridgeReady,
    owns: (area) =>
      OWNERSHIP.some(
        (entry) =>
          entry.area === area && entry.owner === "ts-owned",
      ),
    getOwnership: () => OWNERSHIP,
    getLifecycleState: () => lifecycleFacade.getState(),
    isLifecycleCaptured: () => lifecycleCaptured,
    isLifecycleMethodAvailable: (method) => lifecycleFacade.hasMethod(method),
    getTimings: () => LEGACY_ANIMATION_TIMINGS,
    getAboutBridgeState: () =>
      getAboutBridgeState(window.__homepageLegacyLifecycle),
    getDetailContractState: getDetailLifecycleContractState,
    getState,
  };

  return true;
};

export const getLegacyAnimationBridge = (): LegacyAnimationBridge | null =>
  window.__homepageAnimationBridge ?? null;
