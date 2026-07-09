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

type CaseStudyItem = {
  title: string;
};

type EnterCaseStudyLegacyState = {
  bCaseStudy?: unknown;
  caseStudyItem?: unknown;
  caseStudyWatcher?: unknown;
  createCaseStudyScrollMonitor?: () => unknown;
};

type EnterCaseStudyAnimationFailure = {
  ok: false;
  reason: string;
};

export type EnterCaseStudyAnimationResult =
  | {
      ok: true;
    }
  | EnterCaseStudyAnimationFailure;

type EnterCaseStudyAnimationOptions = {
  onAsyncFallback: (reason: string) => void;
};

const getRequiredElement = <T extends Element>(
  selector: string,
): T | EnterCaseStudyAnimationFailure => {
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
  value: T | EnterCaseStudyAnimationFailure,
): value is EnterCaseStudyAnimationFailure =>
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

const getCaseStudyItem = (
  value: unknown,
): CaseStudyItem | EnterCaseStudyAnimationFailure => {
  if (!isObjectRecord(value) || typeof value.title !== "string") {
    return {
      ok: false,
      reason: "case-study-item-missing:title",
    };
  }

  return {
    title: value.title,
  };
};

const getBaffle = (
  legacyState: EnterCaseStudyLegacyState,
): LegacyBaffleInstance | EnterCaseStudyAnimationFailure => {
  if (!hasBaffleApi(legacyState.bCaseStudy)) {
    return {
      ok: false,
      reason: "baffle-missing:bCaseStudy",
    };
  }

  return legacyState.bCaseStudy;
};

const getCreateScrollMonitor = (
  legacyState: EnterCaseStudyLegacyState,
): (() => unknown) | EnterCaseStudyAnimationFailure => {
  if (typeof legacyState.createCaseStudyScrollMonitor !== "function") {
    return {
      ok: false,
      reason: "scroll-monitor-create-missing:createCaseStudyScrollMonitor",
    };
  }

  return legacyState.createCaseStudyScrollMonitor;
};

const getCaseStudyWatcher = (
  legacyState: EnterCaseStudyLegacyState,
): LegacyScrollWatcher | EnterCaseStudyAnimationFailure => {
  if (!hasScrollWatcherApi(legacyState.caseStudyWatcher)) {
    return {
      ok: false,
      reason: "scroll-watcher-missing:caseStudyWatcher",
    };
  }

  return legacyState.caseStudyWatcher;
};

const revealCaseStudyTitle = (
  baffle: LegacyBaffleInstance,
  titleText: HTMLElement,
  title: string,
  watcher: LegacyScrollWatcher,
): EnterCaseStudyAnimationResult => {
  try {
    const withText = baffle.text(() => `// 项目复盘：${title}`);
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
      reason: `case-study-title-reveal-error:${getErrorMessage(error)}`,
    };
  }
};

export const runEnterCaseStudyAnimation = (
  legacyState: EnterCaseStudyLegacyState,
  options: EnterCaseStudyAnimationOptions,
): EnterCaseStudyAnimationResult => {
  const bar = getRequiredElement<HTMLElement>(".case-study .bar");
  const icon = getRequiredElement<HTMLElement>(".case-study h1 .icon");
  const titleText = getRequiredElement<HTMLElement>(".case-study h1 .text");
  const caseStudyItem = getCaseStudyItem(legacyState.caseStudyItem);
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

  if (isFailure(caseStudyItem)) {
    return caseStudyItem;
  }

  if (isFailure(baffle)) {
    return baffle;
  }

  if (isFailure(createScrollMonitor)) {
    return createScrollMonitor;
  }

  createScrollMonitor.call(legacyState);

  const watcher = getCaseStudyWatcher(legacyState);

  if (isFailure(watcher)) {
    return watcher;
  }

  const gsap = getGsapEngine();

  gsap.to(bar, {
    width: "100%",
    duration: 0.5,
    ease: "expo.out",
    onComplete: () => {
      const revealResult = revealCaseStudyTitle(
        baffle,
        titleText,
        caseStudyItem.title,
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
