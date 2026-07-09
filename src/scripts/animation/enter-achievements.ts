import { getGsapEngine } from "./gsap";
import { prepareLegacyTitleReveal } from "./title-reveal";

type LegacyScrollWatcher = {
  enterViewport: (callback: () => void) => unknown;
};

type EnterAchievementsLegacyState = {
  bAchievements?: unknown;
  nominationsWatcher?: unknown;
  ribbonsWatcher?: unknown;
  listingsWatcher?: unknown;
};

type EnterAchievementsAnimationFailure = {
  ok: false;
  reason: string;
};

export type EnterAchievementsAnimationResult =
  | {
      ok: true;
    }
  | EnterAchievementsAnimationFailure;

type EnterAchievementsAnimationOptions = {
  onAsyncFallback: (reason: string) => void;
};

declare global {
  interface Window {
    Modernizr?: {
      mq?: (query: string) => boolean;
    };
  }
}

const MOBILE_QUERY = "(max-width: 767px)" as const;

const getRequiredElement = <T extends Element>(
  selector: string,
): T | EnterAchievementsAnimationFailure => {
  const element = document.querySelector<T>(selector);

  if (!element) {
    return {
      ok: false,
      reason: `dom-missing:${selector}`,
    };
  }

  return element;
};

const getRequiredElements = <T extends Element>(
  selector: string,
): T[] | EnterAchievementsAnimationFailure => {
  const elements = Array.from(document.querySelectorAll<T>(selector));

  if (elements.length === 0) {
    return {
      ok: false,
      reason: `dom-missing:${selector}`,
    };
  }

  return elements;
};

const isFailure = <T extends object>(
  value: T | EnterAchievementsAnimationFailure,
): value is EnterAchievementsAnimationFailure =>
  "ok" in value && value.ok === false;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  (typeof value === "object" && value !== null) || typeof value === "function";

const hasScrollWatcherApi = (value: unknown): value is LegacyScrollWatcher =>
  isObjectRecord(value) && typeof value.enterViewport === "function";

const getLegacyWatcher = (
  legacyState: EnterAchievementsLegacyState,
  key: "nominationsWatcher" | "ribbonsWatcher" | "listingsWatcher",
): LegacyScrollWatcher | EnterAchievementsAnimationFailure => {
  const watcher = legacyState[key];

  if (!hasScrollWatcherApi(watcher)) {
    return {
      ok: false,
      reason: `scroll-watcher-missing:${key}`,
    };
  }

  return watcher;
};

const isMobileBranch = (): boolean =>
  window.Modernizr?.mq?.(MOBILE_QUERY) ??
  window.matchMedia(MOBILE_QUERY).matches;

const addNominationInitClass = (pattern: HTMLElement): void => {
  pattern.parentElement?.parentElement?.classList.add("init");
};

export const runEnterAchievementsAnimation = (
  legacyState: EnterAchievementsLegacyState,
  options: EnterAchievementsAnimationOptions,
): EnterAchievementsAnimationResult => {
  const bar = getRequiredElement<HTMLElement>(".achievements .bar");
  const icon = getRequiredElement<HTMLElement>(".achievements h1 .icon");
  const paragraphs = getRequiredElements<HTMLElement>(
    ".achievements .col-l p",
  );
  const links = getRequiredElements<HTMLElement>(".achievements .col-l .link");
  const headings = getRequiredElements<HTMLElement>(".achievements h2");
  const rules = getRequiredElements<HTMLElement>(".achievements hr");
  const nominationPatterns = getRequiredElements<HTMLElement>(
    ".nominations .ui-pattern",
  );
  const ribbonsText = getRequiredElement<HTMLElement>(".ribbons p");
  const ribbonItems = getRequiredElements<HTMLElement>(
    ".achievements .ribbons li",
  );
  const listingHeadings = getRequiredElements<HTMLElement>(".listing h2");
  const listingItems = getRequiredElements<HTMLElement>(".listing li");
  const titleReveal = prepareLegacyTitleReveal({
    legacyState,
    routeName: "achievements",
    baffleKey: "bAchievements",
    titleTextSelector: ".achievements h1 .text",
  });

  if (isFailure(bar)) {
    return bar;
  }

  if (isFailure(icon)) {
    return icon;
  }

  if (isFailure(paragraphs)) {
    return paragraphs;
  }

  if (isFailure(links)) {
    return links;
  }

  if (isFailure(headings)) {
    return headings;
  }

  if (isFailure(rules)) {
    return rules;
  }

  if (isFailure(nominationPatterns)) {
    return nominationPatterns;
  }

  if (isFailure(ribbonsText)) {
    return ribbonsText;
  }

  if (isFailure(ribbonItems)) {
    return ribbonItems;
  }

  if (isFailure(listingHeadings)) {
    return listingHeadings;
  }

  if (isFailure(listingItems)) {
    return listingItems;
  }

  if (isFailure(titleReveal)) {
    return titleReveal;
  }

  const mobileBranch = isMobileBranch();
  const nominationsWatcher = getLegacyWatcher(legacyState, "nominationsWatcher");
  const ribbonsWatcher = getLegacyWatcher(legacyState, "ribbonsWatcher");
  let listingsWatcher: LegacyScrollWatcher | null = null;

  if (isFailure(nominationsWatcher)) {
    return nominationsWatcher;
  }

  if (isFailure(ribbonsWatcher)) {
    return ribbonsWatcher;
  }

  if (mobileBranch) {
    const mobileListingsWatcher = getLegacyWatcher(
      legacyState,
      "listingsWatcher",
    );

    if (isFailure(mobileListingsWatcher)) {
      return mobileListingsWatcher;
    }

    listingsWatcher = mobileListingsWatcher;
  }

  const gsap = getGsapEngine();

  gsap.to(bar, {
    width: "100%",
    duration: 0.5,
    ease: "expo.out",
    onComplete: () => {
      const revealResult = titleReveal.reveal();

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
  gsap.to(paragraphs, {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.1,
  });
  gsap.to(links, {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.2,
  });

  nominationsWatcher.enterViewport(() => {
    gsap.to(headings, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "expo.out",
    });
    nominationPatterns.forEach((pattern, index) => {
      gsap.to(pattern, {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: "expo.out",
        delay: 0.1 * index,
        onStart: () => addNominationInitClass(pattern),
      });
    });
    gsap.to(rules, {
      width: "100%",
      duration: 0.5,
      ease: "expo.out",
    });
  });

  ribbonsWatcher.enterViewport(() => {
    gsap.to(ribbonsText, {
      opacity: 1,
      y: 0,
      duration: 0.75,
      ease: "expo.out",
      delay: 0.25,
    });
    gsap.to(ribbonItems, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "expo.out",
      delay: 0.5,
      stagger: 0.1,
    });
  });

  const revealListing = () => {
    gsap.to(listingHeadings, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "expo.out",
      stagger: 0.1,
    });
    gsap.to(listingItems, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "expo.out",
      delay: 0.2,
      stagger: 0.1,
    });
  };

  if (mobileBranch) {
    listingsWatcher?.enterViewport(revealListing);
  } else {
    revealListing();
  }

  return {
    ok: true,
  };
};
