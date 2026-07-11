import type { LegacyHashRouteTarget, StaticRouteName } from "../routing/parse-hash";
import { updateStaticRouteMetadata } from "../routing/metadata";
import { applyActiveNavState } from "../routing/nav-state";
import {
  runEnterAchievementsAnimation,
  type EnterAchievementsLegacyState,
} from "../animation/enter/enter-achievements";
import {
  runEnterAboutAnimation,
  type EnterAboutLegacyState,
} from "../animation/enter/enter-about";
import { runEnterArticleAnimation } from "../animation/enter/detail-enter";
import { runEnterCaseStudyAnimation } from "../animation/enter/detail-enter";
import {
  runEnterCodingAnimation,
  runEnterContactAnimation,
  runEnterDesignAnimation,
  runEnterErrorAnimation,
  runEnterHelloAnimation,
} from "../animation/enter/simple-table";
import {
  runGetArticleSelection,
  runGetCaseStudySelection,
} from "../animation/detail-selection";
import { runExitCurrentSlideLifecycle } from "../animation/slide-exit";
import { runResetSlideLifecycle } from "../animation/slide-reset";
import { runSwitchSlideLifecycle } from "../animation/slide-switch";

/**
 * Deep RouteLifecycle (P3): narrow production interface + navigate orchestration.
 * Internal state bag still hosts baffles/watchers/items for enter/slide/detail
 * implementations; those methods are wired directly (no capture/monkey-patch).
 */

type RouteLifecycleState = {
  currentPage: string;
  contentPayloadReady: boolean;
  caseStudyTitle: string | null;
  articleTitle: string | null;
};

export type RouteLifecycle = {
  navigate(target: LegacyHashRouteTarget): boolean;
  getState(): RouteLifecycleState;
  isReady(): boolean;
};

type LifecycleMethod = (...args: unknown[]) => unknown;

/**
 * Structural bag expected by slide/enter/detail runners.
 * Matches NativeLifecycleInstance method + state surface without importing it
 * (avoids a circular runtime dependency).
 */
export type RouteLifecycleBag = {
  currentPage: string;
  contentPayloadReady: boolean;
  caseStudyItem?: { title?: unknown } | null;
  articleItem?: { title?: unknown } | null;
  exitCurrentSlide: LifecycleMethod;
  switchSlide: LifecycleMethod;
  resetSlide: LifecycleMethod;
  enterHello: LifecycleMethod;
  enterAbout: LifecycleMethod;
  enterAchievements: LifecycleMethod;
  enterCoding: LifecycleMethod;
  enterDesign: LifecycleMethod;
  enterCaseStudy: LifecycleMethod;
  enterArticle: LifecycleMethod;
  enterContact: LifecycleMethod;
  enterError: LifecycleMethod;
  setActiveNav: LifecycleMethod;
  getCaseStudy: LifecycleMethod;
  getArticle: LifecycleMethod;
  [key: string]: unknown;
};

declare global {
  interface Window {
    __homepageRouteLifecycle?: RouteLifecycle;
  }
}

const ENTER_METHOD_BY_STATIC_ROUTE = {
  hello: "enterHello",
  about: "enterAbout",
  achievements: "enterAchievements",
  coding: "enterCoding",
  design: "enterDesign",
  contact: "enterContact",
} as const;

/** Silent async fallback — production has no legacy method body to re-enter. */
const silentAsyncFallback = (_reason: string): void => {
  // Intentionally empty: P3 removed noop→legacy fallback path.
};

const queryTargets = (selector: string): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(selector));

const hideRouteSections = (): void => {
  for (const section of queryTargets("main > section")) {
    section.style.display = "none";
  }
};

const showRouteSection = (routeName: StaticRouteName): void => {
  for (const section of queryTargets(`.${routeName}`)) {
    section.style.display = "block";
  }
};

const prepareRouteTitleReveal = (routeName: StaticRouteName): void => {
  document
    .querySelector(`.${routeName} h1 .text`)
    ?.replaceChildren(document.createTextNode(" "));

  if (routeName !== "hello") {
    for (const heading of queryTargets(`.${routeName} h1`)) {
      heading.style.borderLeft = "15px solid #2196f3";
    }
  }
};

/**
 * Bind slide/enter/detail implementations onto the mutable lifecycle bag.
 * Replaces the P1/P2 capture + wrapMethod monkey-patch path.
 *
 * Enter runners take narrow structural types (baffle keys, watchers, etc.).
 * The production bag is a superset; cast through unknown for the call boundary.
 */
const wireLifecycleMethods = (lifecycle: RouteLifecycleBag): void => {
  // Production bag is a superset of every enter/slide structural type.
  const state = lifecycle as RouteLifecycleBag & Record<string, unknown>;

  lifecycle.setActiveNav = function setActiveNav(routeName: unknown) {
    applyActiveNavState(String(routeName));
    return undefined;
  };

  lifecycle.exitCurrentSlide = function exitCurrentSlide(target: unknown) {
    runExitCurrentSlideLifecycle(state, String(target));
    return undefined;
  };

  lifecycle.switchSlide = function switchSlide(target: unknown) {
    runSwitchSlideLifecycle(state, String(target));
    return undefined;
  };

  lifecycle.resetSlide = function resetSlide(target: unknown) {
    runResetSlideLifecycle(String(target));
    return undefined;
  };

  lifecycle.enterHello = function enterHello() {
    runEnterHelloAnimation(state, {
      onAsyncFallback: silentAsyncFallback,
    });
    return undefined;
  };

  lifecycle.enterAbout = function enterAbout() {
    runEnterAboutAnimation(state as EnterAboutLegacyState, {
      onAsyncFallback: silentAsyncFallback,
    });
    return undefined;
  };

  lifecycle.enterAchievements = function enterAchievements() {
    runEnterAchievementsAnimation(state as EnterAchievementsLegacyState, {
      onAsyncFallback: silentAsyncFallback,
    });
    return undefined;
  };

  lifecycle.enterCoding = function enterCoding() {
    runEnterCodingAnimation(state, {
      onAsyncFallback: silentAsyncFallback,
    });
    return undefined;
  };

  lifecycle.enterDesign = function enterDesign() {
    runEnterDesignAnimation(state, {
      onAsyncFallback: silentAsyncFallback,
    });
    return undefined;
  };

  lifecycle.enterContact = function enterContact() {
    runEnterContactAnimation(state, {
      onAsyncFallback: silentAsyncFallback,
    });
    return undefined;
  };

  lifecycle.enterError = function enterError() {
    runEnterErrorAnimation(state, {
      onAsyncFallback: silentAsyncFallback,
    });
    return undefined;
  };

  lifecycle.enterCaseStudy = function enterCaseStudy() {
    runEnterCaseStudyAnimation(state, {
      onAsyncFallback: silentAsyncFallback,
    });
    return undefined;
  };

  lifecycle.enterArticle = function enterArticle() {
    runEnterArticleAnimation(state, {
      onAsyncFallback: silentAsyncFallback,
    });
    return undefined;
  };

  lifecycle.getCaseStudy = function getCaseStudy(slug: unknown) {
    runGetCaseStudySelection(state, String(slug));
    return undefined;
  };

  lifecycle.getArticle = function getArticle(slug: unknown) {
    runGetArticleSelection(state, String(slug));
    return undefined;
  };
};

const readState = (lifecycle: RouteLifecycleBag): RouteLifecycleState => ({
  currentPage:
    typeof lifecycle.currentPage === "string" ? lifecycle.currentPage : "",
  contentPayloadReady: Boolean(lifecycle.contentPayloadReady),
  caseStudyTitle:
    typeof lifecycle.caseStudyItem?.title === "string"
      ? lifecycle.caseStudyItem.title
      : null,
  articleTitle:
    typeof lifecycle.articleItem?.title === "string"
      ? lifecycle.articleItem.title
      : null,
});

const createRouteLifecycle = (
  lifecycle: RouteLifecycleBag,
): RouteLifecycle => {
  // Private navigate flag — mirrors former dispatch hasDispatchedInitialNativeRoute.
  let hasDispatchedInitialNativeRoute = false;

  const dispatchInitialStaticRoute = (
    target: Extract<LegacyHashRouteTarget, { kind: "static" }>,
  ): boolean => {
    if (hasDispatchedInitialNativeRoute) {
      return false;
    }

    const enterMethodName = ENTER_METHOD_BY_STATIC_ROUTE[target.page];
    const enterMethod = lifecycle[enterMethodName];

    if (typeof enterMethod !== "function") {
      return false;
    }

    hasDispatchedInitialNativeRoute = true;
    hideRouteSections();
    showRouteSection(target.page);
    lifecycle.resetSlide(target.page);
    prepareRouteTitleReveal(target.page);
    updateStaticRouteMetadata();
    lifecycle.setActiveNav(target.activeNav);
    enterMethod.call(lifecycle);
    lifecycle.currentPage = target.page;

    return true;
  };

  const navigate = (target: LegacyHashRouteTarget): boolean => {
    switch (target.kind) {
      case "static":
        if (dispatchInitialStaticRoute(target)) {
          return true;
        }

        hasDispatchedInitialNativeRoute = true;
        lifecycle.exitCurrentSlide(target.targetPage);
        lifecycle.setActiveNav(target.activeNav);
        return true;
      case "case-study":
        hasDispatchedInitialNativeRoute = true;
        lifecycle.caseStudyItem = undefined;
        lifecycle.exitCurrentSlide(target.targetPage);
        window.setTimeout(() => {
          lifecycle.getCaseStudy(target.slug);
        }, target.retry.routeDispatchDelayMs);
        return true;
      case "article":
        hasDispatchedInitialNativeRoute = true;
        lifecycle.articleItem = undefined;
        lifecycle.exitCurrentSlide(target.targetPage);
        window.setTimeout(() => {
          lifecycle.getArticle(target.slug);
        }, target.retry.routeDispatchDelayMs);
        return true;
      case "error":
        hasDispatchedInitialNativeRoute = true;
        lifecycle.exitCurrentSlide(target.targetPage);
        return true;
    }
  };

  return {
    navigate,
    getState: () => readState(lifecycle),
    isReady: () => true,
  };
};

let routeLifecycleInstance: RouteLifecycle | null = null;

export const installRouteLifecycle = (
  lifecycle: RouteLifecycleBag,
): RouteLifecycle => {
  wireLifecycleMethods(lifecycle);
  routeLifecycleInstance = createRouteLifecycle(lifecycle);
  window.__homepageRouteLifecycle = routeLifecycleInstance;
  return routeLifecycleInstance;
};

export const getRouteLifecycle = (): RouteLifecycle | null =>
  routeLifecycleInstance ?? window.__homepageRouteLifecycle ?? null;
