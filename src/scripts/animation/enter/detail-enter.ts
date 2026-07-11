/**
 * Parameterized detail enter (case-study | article) — P4.
 * Same GSAP timings, baffle text prefixes, metadata hook (article only).
 */

import { getGsapEngine } from "../gsap";
import { LEGACY_ANIMATION_TIMINGS } from "../timings";
import {
  type EnterAnimationFailure,
  type EnterAnimationOptions,
  type EnterAnimationResult,
  type LegacyBaffleInstance,
  type LegacyScrollWatcher,
  failResult,
  getErrorMessage,
  getRequiredElement,
  hasBaffleTextApi,
  hasScrollWatcherApi,
  isFailure,
  isObjectRecord,
  okResult,
} from "./runner";

type DetailKind = "case-study" | "article";

type DetailItem = {
  title: string;
};

type DetailBaffle = LegacyBaffleInstance & {
  text: (value: () => string) => unknown;
};

type DetailEnterDescriptor = {
  kind: DetailKind;
  sectionClass: string;
  baffleKey: "bCaseStudy" | "bArticle";
  itemKey: "caseStudyItem" | "articleItem";
  watcherKey: "caseStudyWatcher" | "articleWatcher";
  createScrollMonitorKey:
    | "createCaseStudyScrollMonitor"
    | "createArticleScrollMonitor";
  titlePrefix: string;
  itemMissingReason: string;
  titleRevealErrorPrefix: string;
  updateMetadata?: (title: string) => void;
};

type DetailLegacyState = Record<string, unknown>;

const setMetaContent = (selector: string, content: string): void => {
  document.querySelector(selector)?.setAttribute("content", content);
};

const updateArticleMetadata = (title: string): void => {
  const documentTitle = `${title} | iTsawaysu`;

  document.title = documentTitle;
  setMetaContent('meta[property="og:title"]', documentTitle);
  setMetaContent('meta[property="og:type"]', "article");
  setMetaContent('meta[property="og:url"]', window.location.href);
  setMetaContent('meta[property="og:description"]', "");
  setMetaContent('meta[name="twitter:title"]', documentTitle);
  setMetaContent('meta[property="twitter:url"]', window.location.href);
  setMetaContent('meta[property="twitter:description"]', "");
};

const DETAIL_ENTER_TABLE: Record<DetailKind, DetailEnterDescriptor> = {
  "case-study": {
    kind: "case-study",
    sectionClass: "case-study",
    baffleKey: "bCaseStudy",
    itemKey: "caseStudyItem",
    watcherKey: "caseStudyWatcher",
    createScrollMonitorKey: "createCaseStudyScrollMonitor",
    titlePrefix: "// 项目复盘：",
    itemMissingReason: "case-study-item-missing:title",
    titleRevealErrorPrefix: "case-study-title-reveal-error",
  },
  article: {
    kind: "article",
    sectionClass: "article",
    baffleKey: "bArticle",
    itemKey: "articleItem",
    watcherKey: "articleWatcher",
    createScrollMonitorKey: "createArticleScrollMonitor",
    titlePrefix: "// 文章：",
    itemMissingReason: "article-item-missing:title",
    titleRevealErrorPrefix: "article-title-reveal-error",
    updateMetadata: updateArticleMetadata,
  },
};

const getDetailItem = (
  value: unknown,
  missingReason: string,
): DetailItem | EnterAnimationFailure => {
  if (!isObjectRecord(value) || typeof value.title !== "string") {
    return failResult(missingReason);
  }

  return {
    title: value.title,
  };
};

const getBaffle = (
  legacyState: DetailLegacyState,
  baffleKey: DetailEnterDescriptor["baffleKey"],
): DetailBaffle | EnterAnimationFailure => {
  const baffle = legacyState[baffleKey];

  if (!hasBaffleTextApi(baffle)) {
    return failResult(`baffle-missing:${baffleKey}`);
  }

  return baffle;
};

const getCreateScrollMonitor = (
  legacyState: DetailLegacyState,
  key: DetailEnterDescriptor["createScrollMonitorKey"],
): (() => unknown) | EnterAnimationFailure => {
  const create = legacyState[key];

  if (typeof create !== "function") {
    return failResult(`scroll-monitor-create-missing:${key}`);
  }

  return create as () => unknown;
};

const getWatcher = (
  legacyState: DetailLegacyState,
  key: DetailEnterDescriptor["watcherKey"],
): LegacyScrollWatcher | EnterAnimationFailure => {
  const watcher = legacyState[key];

  if (!hasScrollWatcherApi(watcher, "recalculateLocation")) {
    return failResult(`scroll-watcher-missing:${key}`);
  }

  return watcher;
};

/**
 * Mirrors the pre-P4 baffle chain:
 * text() → prefer return if has API → start() → prefer return if has API → reveal().
 */
const revealDetailTitle = (
  descriptor: DetailEnterDescriptor,
  baffle: DetailBaffle,
  titleText: HTMLElement,
  title: string,
  watcher: LegacyScrollWatcher,
): EnterAnimationResult => {
  try {
    const withText = baffle.text(() => `${descriptor.titlePrefix}${title}`);
    const textTarget = hasBaffleTextApi(withText) ? withText : baffle;
    const startedBaffle = textTarget.start();
    const revealTarget = hasBaffleTextApi(startedBaffle)
      ? startedBaffle
      : textTarget;

    revealTarget.reveal(
      LEGACY_ANIMATION_TIMINGS.titleRevealDurationMs,
      LEGACY_ANIMATION_TIMINGS.titleRevealDelayMs,
    );
    titleText.classList.add("glitch");
    watcher.recalculateLocation?.();

    return okResult();
  } catch (error) {
    return failResult(
      `${descriptor.titleRevealErrorPrefix}:${getErrorMessage(error)}`,
    );
  }
};

const runEnterDetailAnimation = (
  kind: DetailKind,
  legacyState: unknown,
  options: EnterAnimationOptions,
): EnterAnimationResult => {
  const descriptor = DETAIL_ENTER_TABLE[kind];
  const state = (isObjectRecord(legacyState) ? legacyState : {}) as DetailLegacyState;
  const section = descriptor.sectionClass;

  const bar = getRequiredElement<HTMLElement>(`.${section} .bar`);
  const icon = getRequiredElement<HTMLElement>(`.${section} h1 .icon`);
  const titleText = getRequiredElement<HTMLElement>(`.${section} h1 .text`);
  const item = getDetailItem(state[descriptor.itemKey], descriptor.itemMissingReason);
  const baffle = getBaffle(state, descriptor.baffleKey);
  const createScrollMonitor = getCreateScrollMonitor(
    state,
    descriptor.createScrollMonitorKey,
  );

  if (isFailure(bar)) {
    return bar;
  }

  if (isFailure(icon)) {
    return icon;
  }

  if (isFailure(titleText)) {
    return titleText;
  }

  if (isFailure(item)) {
    return item;
  }

  if (isFailure(baffle)) {
    return baffle;
  }

  if (isFailure(createScrollMonitor)) {
    return createScrollMonitor;
  }

  // Article-only metadata; case-study has no updateMetadata.
  descriptor.updateMetadata?.(item.title);
  createScrollMonitor.call(state);

  const watcher = getWatcher(state, descriptor.watcherKey);

  if (isFailure(watcher)) {
    return watcher;
  }

  const gsap = getGsapEngine();

  gsap.to(bar, {
    width: "100%",
    duration: 0.5,
    ease: "expo.out",
    onComplete: () => {
      const revealResult = revealDetailTitle(
        descriptor,
        baffle,
        titleText,
        item.title,
        watcher,
      );

      if (!revealResult.ok) {
        options.onAsyncFallback(revealResult.reason);
      }
    },
  });
  gsap.to(icon, {
    opacity: 1,
    duration: 0.5,
    ease: "expo.out",
  });

  return okResult();
};

// Named wrappers — keep route-lifecycle import surface stable.

export const runEnterCaseStudyAnimation = (
  legacyState: unknown,
  options: EnterAnimationOptions,
): EnterAnimationResult =>
  runEnterDetailAnimation("case-study", legacyState, options);

export const runEnterArticleAnimation = (
  legacyState: unknown,
  options: EnterAnimationOptions,
): EnterAnimationResult =>
  runEnterDetailAnimation("article", legacyState, options);
