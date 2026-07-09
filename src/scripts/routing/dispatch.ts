import type { LegacyHashRouteTarget, StaticRouteName } from "./parse-hash";
import { getLegacyRuntimeBridge } from "./legacy-runtime-bridge";
import { updateStaticRouteMetadata } from "./metadata";
import { getNativeRuntimeHost } from "../runtime/native-runtime";

const ENTER_METHOD_BY_STATIC_ROUTE = {
  hello: "enterHello",
  about: "enterAbout",
  achievements: "enterAchievements",
  coding: "enterCoding",
  design: "enterDesign",
  contact: "enterContact",
} as const;

let hasDispatchedInitialNativeRoute = false;

const getDetailRoutePattern = (
  target: Extract<LegacyHashRouteTarget, { kind: "article" | "case-study" }>,
) => `${target.retry.hashPrefix}:param`;

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
    ?.replaceChildren(document.createTextNode("\u00a0"));

  if (routeName !== "hello") {
    for (const heading of queryTargets(`.${routeName} h1`)) {
      heading.style.borderLeft = "15px solid #2196f3";
    }
  }
};

const dispatchInitialStaticRoute = (
  target: Extract<LegacyHashRouteTarget, { kind: "static" }>,
): boolean => {
  const host = getNativeRuntimeHost();

  if (!host?.isReady() || hasDispatchedInitialNativeRoute) {
    return false;
  }

  const { lifecycle } = host;
  const enterMethod = lifecycle[ENTER_METHOD_BY_STATIC_ROUTE[target.page]];

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

const dispatchNativeRouteTarget = (target: LegacyHashRouteTarget): boolean => {
  const host = getNativeRuntimeHost();

  if (!host?.isReady()) {
    return false;
  }

  const { lifecycle } = host;

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

const dispatchCapturedLegacyRouteTarget = (
  target: LegacyHashRouteTarget,
): boolean => {
  const bridge = getLegacyRuntimeBridge();

  if (!bridge?.isReady()) {
    return false;
  }

  switch (target.kind) {
    case "static":
      return bridge.dispatchPattern(target.hash);
    case "case-study":
    case "article":
      return bridge.dispatchPattern(getDetailRoutePattern(target), {
        param: target.slug,
      });
    case "error":
      return bridge.dispatchError();
  }
};

export const dispatchLegacyRouteTarget = (
  target: LegacyHashRouteTarget,
): boolean =>
  dispatchNativeRouteTarget(target) || dispatchCapturedLegacyRouteTarget(target);
