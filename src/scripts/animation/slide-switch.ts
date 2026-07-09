import { getGsapEngine } from "./gsap";
import { LEGACY_ANIMATION_TIMINGS } from "./timings";
import { updateStaticRouteMetadata } from "../routing/metadata";

type SwitchSlideResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: string;
    };

type SwitchSlideLegacyState = {
  currentPage?: unknown;
  syncTime?: unknown;
  caseStudyItem?: unknown;
  articleItem?: unknown;
  switchSlide?: (target: string) => unknown;
  resetSlide?: (target: string) => unknown;
  enterHello?: () => unknown;
  enterAbout?: () => unknown;
  enterAchievements?: () => unknown;
  enterCoding?: () => unknown;
  enterDesign?: () => unknown;
  enterContact?: () => unknown;
  enterCaseStudy?: () => unknown;
  enterArticle?: () => unknown;
  enterError?: () => unknown;
};

const ENTER_METHOD_BY_ROUTE = {
  hello: "enterHello",
  about: "enterAbout",
  achievements: "enterAchievements",
  coding: "enterCoding",
  design: "enterDesign",
  contact: "enterContact",
  "case-study": "enterCaseStudy",
  article: "enterArticle",
  error: "enterError",
} as const;

type SwitchTarget = keyof typeof ENTER_METHOD_BY_ROUTE;

const isSwitchTarget = (value: string): value is SwitchTarget =>
  value in ENTER_METHOD_BY_ROUTE;

const queryTargets = (selector: string): Element[] =>
  Array.from(document.querySelectorAll(selector));

const setIfPresent = (
  selector: string,
  vars: Record<string, unknown>,
): void => {
  const targets = queryTargets(selector);

  if (targets.length === 0) {
    return;
  }

  getGsapEngine().set(targets, vars);
};

const showSection = (routeName: string): void => {
  for (const element of queryTargets(`.${routeName}`)) {
    if (element instanceof HTMLElement) {
      element.style.display = "block";
    }
  }
};

const hideSection = (routeName: string): void => {
  for (const element of queryTargets(`.${routeName}`)) {
    if (element instanceof HTMLElement) {
      element.style.display = "none";
    }
  }
};

const removeHeaderRouteClasses = (): void => {
  document.querySelector(".header")?.classList.remove("dark", "hide", "shadow-z2");
};

const getSyncTime = (legacyState: SwitchSlideLegacyState): number => {
  const syncTime = Number(legacyState.syncTime);

  return Number.isFinite(syncTime) && syncTime >= 0
    ? syncTime
    : LEGACY_ANIMATION_TIMINGS.routeTransitionSeconds;
};

const normalizeTarget = (target: string): SwitchTarget => {
  if (target === "") {
    return "hello";
  }

  if (!document.querySelector(`.${target}`)) {
    return "error";
  }

  if (target === "404") {
    return "error";
  }

  return isSwitchTarget(target) ? target : "error";
};

const scheduleDetailRetry = (
  legacyState: SwitchSlideLegacyState,
  target: "case-study" | "article",
): boolean => {
  const item =
    target === "case-study" ? legacyState.caseStudyItem : legacyState.articleItem;
  const hashPrefix = target === "case-study" ? "#/case-study/" : "#/article/";

  if (item) {
    return false;
  }

  if (window.location.hash.startsWith(hashPrefix)) {
    window.setTimeout(() => {
      legacyState.switchSlide?.call(legacyState, target);
    }, LEGACY_ANIMATION_TIMINGS.switchSlideRetryDelayMs);
  }

  return true;
};

const getOffset = (element: HTMLElement): { left: number; top: number } => {
  const rect = element.getBoundingClientRect();

  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY,
  };
};

const animateElementClone = (target: SwitchTarget, syncTime: number): void => {
  const heading = document.querySelector<HTMLElement>(`.${target} h1`);

  if (!heading) {
    return;
  }

  const cloneTargets = queryTargets(".element-clone");

  if (cloneTargets.length === 0) {
    return;
  }

  const offset = getOffset(heading);

  getGsapEngine().to(cloneTargets, {
    left: offset.left,
    top: offset.top,
    height: heading.offsetHeight,
    width: 15,
    boxShadow: "0",
    duration: syncTime,
    ease: "expo.inOut",
  });
};

const scrollWindowToTop = (syncTime: number, onComplete: () => void): void => {
  const startY = window.scrollY;

  if (startY === 0) {
    window.setTimeout(onComplete, Math.round(syncTime * 1000));
    return;
  }

  const state = { y: startY };

  getGsapEngine().to(state, {
    y: 0,
    duration: syncTime,
    ease: "expo.inOut",
    onUpdate: () => {
      window.scrollTo(0, state.y);
    },
    onComplete,
  });
};

const callTargetEnter = (
  legacyState: SwitchSlideLegacyState,
  target: SwitchTarget,
): SwitchSlideResult => {
  const methodName = ENTER_METHOD_BY_ROUTE[target];
  const method = legacyState[methodName];

  if (typeof method !== "function") {
    return {
      ok: false,
      reason: `enter-method-missing:${methodName}`,
    };
  }

  method.call(legacyState);

  return {
    ok: true,
  };
};

export const runSwitchSlideLifecycle = (
  legacyState: SwitchSlideLegacyState,
  rawTarget: string,
): SwitchSlideResult => {
  if (rawTarget === "case-study" || rawTarget === "article") {
    if (scheduleDetailRetry(legacyState, rawTarget)) {
      return {
        ok: true,
      };
    }
  }

  const previousPage =
    typeof legacyState.currentPage === "string"
      ? legacyState.currentPage
      : "hello";
  const target = normalizeTarget(rawTarget);
  const syncTime = getSyncTime(legacyState);

  try {
    hideSection(previousPage);
    showSection(target);
    document.querySelector(`.${target} h1 .text`)?.replaceChildren(
      document.createTextNode("\u00a0"),
    );
    updateStaticRouteMetadata();
    animateElementClone(target, syncTime);

    if (target === "case-study") {
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      removeHeaderRouteClasses();
    } else {
      scrollWindowToTop(syncTime, removeHeaderRouteClasses);
    }

    const completeSwitch = () => {
      for (const element of queryTargets(".element-clone")) {
        element.remove();
      }

      legacyState.resetSlide?.call(legacyState, previousPage);

      if (target !== "hello") {
        setIfPresent(`.${target} h1`, {
          borderLeft: "15px solid #2196f3",
        });
      }

      const enterResult = callTargetEnter(legacyState, target);

      if (!enterResult.ok) {
        throw new Error(enterResult.reason);
      }

      legacyState.currentPage = target;
    };

    const iconTargets = queryTargets(".element-clone .icon");

    if (iconTargets.length === 0) {
      window.setTimeout(completeSwitch, Math.round(syncTime * 1000));
    } else {
      getGsapEngine().to(iconTargets, {
        opacity: 0,
        duration: syncTime,
        ease: "expo.inOut",
        onComplete: completeSwitch,
      });
    }

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error
          ? `switch-slide-error:${error.message}`
          : "switch-slide-error",
    };
  }
};
