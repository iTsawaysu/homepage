import { getGsapEngine } from "./gsap";
import { LEGACY_ANIMATION_TIMINGS } from "./timings";

type LegacyBaffleInstance = {
  text: (value: () => string) => unknown;
  start: () => unknown;
  reveal: (durationMs: number, delayMs: number) => unknown;
};

type LegacyScrollWatcher = {
  recalculateLocation: () => unknown;
};

type ArticleItem = {
  title: string;
};

type EnterArticleLegacyState = {
  bArticle?: unknown;
  articleItem?: unknown;
  articleWatcher?: unknown;
  createArticleScrollMonitor?: () => unknown;
};

type EnterArticleAnimationFailure = {
  ok: false;
  reason: string;
};

export type EnterArticleAnimationResult =
  | {
      ok: true;
    }
  | EnterArticleAnimationFailure;

type EnterArticleAnimationOptions = {
  onAsyncFallback: (reason: string) => void;
};

const getRequiredElement = <T extends Element>(
  selector: string,
): T | EnterArticleAnimationFailure => {
  const element = document.querySelector<T>(selector);

  if (!element) {
    return {
      ok: false,
      reason: `dom-missing:${selector}`,
    };
  }

  return element;
};

const isFailure = <T extends object>(
  value: T | EnterArticleAnimationFailure,
): value is EnterArticleAnimationFailure =>
  "ok" in value && value.ok === false;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  (typeof value === "object" && value !== null) || typeof value === "function";

const hasBaffleApi = (value: unknown): value is LegacyBaffleInstance =>
  isObjectRecord(value) &&
  typeof value.text === "function" &&
  typeof value.start === "function" &&
  typeof value.reveal === "function";

const hasScrollWatcherApi = (value: unknown): value is LegacyScrollWatcher =>
  isObjectRecord(value) && typeof value.recalculateLocation === "function";

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const getArticleItem = (
  value: unknown,
): ArticleItem | EnterArticleAnimationFailure => {
  if (!isObjectRecord(value) || typeof value.title !== "string") {
    return {
      ok: false,
      reason: "article-item-missing:title",
    };
  }

  return {
    title: value.title,
  };
};

const getBaffle = (
  legacyState: EnterArticleLegacyState,
): LegacyBaffleInstance | EnterArticleAnimationFailure => {
  if (!hasBaffleApi(legacyState.bArticle)) {
    return {
      ok: false,
      reason: "baffle-missing:bArticle",
    };
  }

  return legacyState.bArticle;
};

const getCreateScrollMonitor = (
  legacyState: EnterArticleLegacyState,
): (() => unknown) | EnterArticleAnimationFailure => {
  if (typeof legacyState.createArticleScrollMonitor !== "function") {
    return {
      ok: false,
      reason: "scroll-monitor-create-missing:createArticleScrollMonitor",
    };
  }

  return legacyState.createArticleScrollMonitor;
};

const getArticleWatcher = (
  legacyState: EnterArticleLegacyState,
): LegacyScrollWatcher | EnterArticleAnimationFailure => {
  if (!hasScrollWatcherApi(legacyState.articleWatcher)) {
    return {
      ok: false,
      reason: "scroll-watcher-missing:articleWatcher",
    };
  }

  return legacyState.articleWatcher;
};

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

const revealArticleTitle = (
  baffle: LegacyBaffleInstance,
  titleText: HTMLElement,
  title: string,
  watcher: LegacyScrollWatcher,
): EnterArticleAnimationResult => {
  try {
    const withText = baffle.text(() => `// 文章：${title}`);
    const textTarget = hasBaffleApi(withText) ? withText : baffle;
    const startedBaffle = textTarget.start();
    const revealTarget = hasBaffleApi(startedBaffle)
      ? startedBaffle
      : textTarget;

    revealTarget.reveal(
      LEGACY_ANIMATION_TIMINGS.titleRevealDurationMs,
      LEGACY_ANIMATION_TIMINGS.titleRevealDelayMs,
    );
    titleText.classList.add("glitch");
    watcher.recalculateLocation();

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      reason: `article-title-reveal-error:${getErrorMessage(error)}`,
    };
  }
};

export const runEnterArticleAnimation = (
  legacyState: EnterArticleLegacyState,
  options: EnterArticleAnimationOptions,
): EnterArticleAnimationResult => {
  const bar = getRequiredElement<HTMLElement>(".article .bar");
  const icon = getRequiredElement<HTMLElement>(".article h1 .icon");
  const titleText = getRequiredElement<HTMLElement>(".article h1 .text");
  const articleItem = getArticleItem(legacyState.articleItem);
  const baffle = getBaffle(legacyState);
  const createScrollMonitor = getCreateScrollMonitor(legacyState);

  if (isFailure(bar)) {
    return bar;
  }

  if (isFailure(icon)) {
    return icon;
  }

  if (isFailure(titleText)) {
    return titleText;
  }

  if (isFailure(articleItem)) {
    return articleItem;
  }

  if (isFailure(baffle)) {
    return baffle;
  }

  if (isFailure(createScrollMonitor)) {
    return createScrollMonitor;
  }

  updateArticleMetadata(articleItem.title);
  createScrollMonitor.call(legacyState);

  const watcher = getArticleWatcher(legacyState);

  if (isFailure(watcher)) {
    return watcher;
  }

  const gsap = getGsapEngine();

  gsap.to(bar, {
    width: "100%",
    duration: 0.5,
    ease: "expo.out",
    onComplete: () => {
      const revealResult = revealArticleTitle(
        baffle,
        titleText,
        articleItem.title,
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

  return {
    ok: true,
  };
};
