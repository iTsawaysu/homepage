import { getGsapEngine } from "./gsap";
import { LEGACY_ANIMATION_TIMINGS } from "./timings";
import { SITE_TITLE } from "../routing/metadata";

type ExitSlideResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: string;
    };

type ExitSlideLegacyState = {
  currentPage?: unknown;
  switchSlide?: (target: string) => unknown;
  destroyCaseStudyScrollMonitor?: () => unknown;
  destroyArticleScrollMonitor?: () => unknown;
};

const GENERIC_DESCRIPTION =
  "I'm Jianda Sun，主要写 Java 后端；平时跟 Spring、数据库、接口和日志打交道，偶尔也会被配置文件教育一下，重启好了就当是自己修的；最近也没少 Vibe Coding，简单说就是我和 AI 一起写代码，它负责自信地生成，我负责半信半疑地改到能跑。";

const queryTargets = (selector: string): Element[] =>
  Array.from(document.querySelectorAll(selector));

const toIfPresent = (
  selector: string,
  vars: Record<string, unknown>,
): void => {
  const targets = queryTargets(selector);

  if (targets.length === 0) {
    return;
  }

  getGsapEngine().to(targets, vars);
};

const runAfterTween = (
  selector: string,
  vars: Record<string, unknown>,
  fallbackDelayMs: number,
  onComplete: () => void,
): void => {
  const targets = queryTargets(selector);

  if (targets.length === 0) {
    window.setTimeout(onComplete, fallbackDelayMs);
    return;
  }

  getGsapEngine().to(targets, {
    ...vars,
    onComplete,
  });
};

const restoreGenericArticleMetadata = (): void => {
  document.title = SITE_TITLE;
  document
    .querySelector('meta[property="og:title"]')
    ?.setAttribute("content", SITE_TITLE);
  document
    .querySelector('meta[property="og:type"]')
    ?.setAttribute("content", "website");
  document
    .querySelector('meta[property="og:url"]')
    ?.setAttribute("content", window.location.href);
  document
    .querySelector('meta[property="og:description"]')
    ?.setAttribute("content", GENERIC_DESCRIPTION);
  document
    .querySelector('meta[name="twitter:title"]')
    ?.setAttribute("content", SITE_TITLE);
  document
    .querySelector('meta[property="twitter:url"]')
    ?.setAttribute("content", window.location.href);
  document
    .querySelector('meta[property="twitter:description"]')
    ?.setAttribute("content", GENERIC_DESCRIPTION);
};

const callSwitchSlide = (
  legacyState: ExitSlideLegacyState,
  target: string,
): void => {
  legacyState.switchSlide?.call(legacyState, target);
};

const clearNominationStyles = (): void => {
  for (const element of queryTargets(".nominations li")) {
    if (element instanceof HTMLElement) {
      element.setAttribute("style", "");
    }
  }
};

const runCommonExitTweens = (currentPage: string): void => {
  if (currentPage === "case-study" && (currentPage as string) === "article") {
    return;
  }

  toIfPresent(`.${currentPage} h1`, {
    opacity: 0,
    y: -50,
    duration: 0.5,
    ease: "expo.inOut",
  });
  toIfPresent(`.${currentPage} p`, {
    opacity: 0,
    y: -50,
    duration: 0.5,
    ease: "expo.inOut",
    delay: 0.1,
  });
  toIfPresent(`.${currentPage} h2`, {
    opacity: 0,
    y: -50,
    duration: 0.5,
    ease: "expo.inOut",
    delay: 0.1,
  });
  toIfPresent(`.${currentPage} hr`, {
    opacity: 0,
    y: -50,
    duration: 0.5,
    ease: "expo.inOut",
    delay: 0.2,
  });
};

export const runExitCurrentSlideLifecycle = (
  legacyState: ExitSlideLegacyState,
  target: string,
): ExitSlideResult => {
  const currentPage =
    typeof legacyState.currentPage === "string"
      ? legacyState.currentPage
      : "hello";

  try {
    runCommonExitTweens(currentPage);

    switch (currentPage) {
      case "hello":
        runAfterTween(
          ".hello li",
          {
            opacity: 0,
            y: -50,
            duration: 0.5,
            ease: "expo.inOut",
            delay: 0.2,
            clearProps: "all",
            stagger: 0.1,
          },
          700,
          () => callSwitchSlide(legacyState, target),
        );
        break;
      case "about":
        toIfPresent(".skills__bar", {
          opacity: 0,
          y: -50,
          duration: 0.5,
          ease: "expo.inOut",
          delay: 0.2,
          clearProps: "all",
          stagger: 0.1,
        });
        runAfterTween(
          ".logos li",
          {
            opacity: 0,
            y: -50,
            duration: 0.5,
            ease: "expo.inOut",
            delay: 0.2,
            clearProps: "all",
            stagger: 0.1,
          },
          700,
          () => callSwitchSlide(legacyState, target),
        );
        break;
      case "achievements":
        runAfterTween(
          ".nominations li",
          {
            opacity: 0,
            y: -50,
            duration: 0.5,
            ease: "expo.inOut",
            delay: 0.2,
            stagger: 0.1,
          },
          700,
          clearNominationStyles,
        );
        toIfPresent(".achievements .link", {
          opacity: 0,
          y: -50,
          duration: 0.5,
          ease: "expo.inOut",
          delay: 0.2,
          clearProps: "all",
        });
        toIfPresent(".ribbons li", {
          opacity: 0,
          y: -50,
          duration: 0.5,
          ease: "expo.inOut",
          delay: 0.2,
          clearProps: "all",
          stagger: 0.1,
        });
        runAfterTween(
          ".listing li",
          {
            opacity: 0,
            y: -50,
            duration: 0.5,
            ease: "expo.inOut",
            delay: 0.2,
            clearProps: "all",
            stagger: 0.1,
          },
          700,
          () => callSwitchSlide(legacyState, target),
        );
        break;
      case "coding":
        runAfterTween(
          ".coding .card",
          {
            opacity: 0,
            y: -50,
            duration: 0.5,
            ease: "expo.inOut",
            delay: 0.2,
            clearProps: "all",
            stagger: 0.1,
          },
          700,
          () => callSwitchSlide(legacyState, target),
        );
        break;
      case "design":
        runAfterTween(
          ".design .card",
          {
            opacity: 0,
            y: -50,
            duration: 0.5,
            ease: "expo.inOut",
            delay: 0.2,
            clearProps: "all",
            stagger: 0.1,
          },
          700,
          () => callSwitchSlide(legacyState, target),
        );
        break;
      case "case-study":
        legacyState.destroyCaseStudyScrollMonitor?.call(legacyState);
        runAfterTween(
          ".case-study",
          {
            opacity: 0,
            y: -50,
            duration: 0.5,
            ease: "expo.inOut",
            delay: 0.2,
          },
          700,
          () => callSwitchSlide(legacyState, target),
        );
        break;
      case "article":
        legacyState.destroyArticleScrollMonitor?.call(legacyState);
        restoreGenericArticleMetadata();
        runAfterTween(
          ".article",
          {
            opacity: 0,
            y: -50,
            duration: 0.5,
            ease: "expo.inOut",
            delay: 0.2,
          },
          700,
          () => callSwitchSlide(legacyState, target),
        );
        break;
      case "contact":
        runAfterTween(
          ".contact-icons li",
          {
            opacity: 0,
            y: -50,
            duration: 0.5,
            ease: "expo.inOut",
            delay: 0.3,
            clearProps: "all",
            stagger: 0.1,
          },
          800,
          () => callSwitchSlide(legacyState, target),
        );
        break;
      case "error":
        window.setTimeout(
          () => callSwitchSlide(legacyState, target),
          Math.round(
            (LEGACY_ANIMATION_TIMINGS.routeElementExitDelaySeconds +
              LEGACY_ANIMATION_TIMINGS.routeTransitionSeconds) *
              1000,
          ),
        );
        break;
      default:
        callSwitchSlide(legacyState, target);
        break;
    }

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error
          ? `exit-current-slide-error:${error.message}`
          : "exit-current-slide-error",
    };
  }
};
