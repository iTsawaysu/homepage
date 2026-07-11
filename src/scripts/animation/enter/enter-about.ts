/**
 * Specialized about enter — algorithm unchanged; shared helpers only (P4).
 */

import {
  ABOUT_BRANCH_CONTRACT,
  ABOUT_CONTRACT_SELECTORS,
  ABOUT_ROUTE_ENTER_TIMINGS,
} from "../about-contract";
import { tweenNumericText } from "../effects";
import { getGsapEngine } from "../gsap";
import { LEGACY_SKILLS_COUNT_CONTRACT } from "../skills-contract";
import { prepareLegacyTitleReveal } from "../title-reveal";
import {
  type EnterAnimationFailure,
  type EnterAnimationOptions,
  type EnterAnimationResult,
  type LegacyBaffleInstance,
  type LegacyScrollWatcher,
  failResult,
  getErrorMessage,
  getRequiredElement,
  getRequiredElements,
  hasBaffleApi,
  hasScrollWatcherApi,
  isFailure,
  isObjectRecord,
  okResult,
} from "./runner";

export type EnterAboutLegacyState = {
  bAbout?: unknown;
  bSkillsLabel?: unknown;
  skillsWatcher?: unknown;
  logosWatcher?: unknown;
};

type EnterAboutAnimationResult = EnterAnimationResult;

type SkillTarget = {
  bar: HTMLElement;
  label: HTMLElement;
  percentNumber: HTMLElement;
  percent: number;
  labelBaffle: LegacyBaffleInstance;
};

const getLegacyWatcher = (
  legacyState: EnterAboutLegacyState,
  key: "skillsWatcher" | "logosWatcher",
): LegacyScrollWatcher | EnterAnimationFailure => {
  const watcher = legacyState[key];

  if (!hasScrollWatcherApi(watcher, "enterViewport")) {
    return failResult(`scroll-watcher-missing:${key}`);
  }

  return watcher;
};

const getLegacyBaffleArray = (
  legacyState: EnterAboutLegacyState,
  expectedLength: number,
): LegacyBaffleInstance[] | EnterAnimationFailure => {
  const rawBaffles = legacyState.bSkillsLabel;

  if (!isObjectRecord(rawBaffles)) {
    return failResult("baffle-missing:bSkillsLabel");
  }

  const length =
    typeof rawBaffles.length === "number" && Number.isInteger(rawBaffles.length)
      ? rawBaffles.length
      : expectedLength;
  const baffles = Array.from({ length }, (_, index) => rawBaffles[index]);

  if (baffles.length < expectedLength) {
    return failResult("baffle-count-mismatch:bSkillsLabel");
  }

  for (let index = 0; index < expectedLength; index += 1) {
    if (!hasBaffleApi(baffles[index])) {
      return failResult(`baffle-missing:bSkillsLabel:${index}`);
    }
  }

  return baffles.slice(0, expectedLength) as LegacyBaffleInstance[];
};

const getSkillTargets = (
  bars: HTMLElement[],
  legacyState: EnterAboutLegacyState,
): SkillTarget[] | EnterAnimationFailure => {
  const labelBaffles = getLegacyBaffleArray(legacyState, bars.length);

  if (isFailure(labelBaffles)) {
    return labelBaffles;
  }

  const skillTargets: SkillTarget[] = [];

  for (const [index, bar] of bars.entries()) {
    const label = bar.querySelector<HTMLElement>(
      ABOUT_CONTRACT_SELECTORS.skillsLabel,
    );
    const percentNumber = bar.querySelector<HTMLElement>(
      ABOUT_CONTRACT_SELECTORS.skillPercentNumber,
    );
    const percentRaw = bar.getAttribute("data-percent");
    const percent = Number.parseFloat(percentRaw ?? "");

    if (!label) {
      return failResult(
        `dom-missing:${ABOUT_CONTRACT_SELECTORS.skillsLabel}:${index}`,
      );
    }

    if (!percentNumber) {
      return failResult(
        `dom-missing:${ABOUT_CONTRACT_SELECTORS.skillPercentNumber}:${index}`,
      );
    }

    if (!Number.isFinite(percent)) {
      return failResult(`invalid-skill-percent:${index}`);
    }

    skillTargets.push({
      bar,
      label,
      percentNumber,
      percent,
      labelBaffle: labelBaffles[index],
    });
  }

  return skillTargets;
};

const isMobileBranch = (): boolean =>
  window.Modernizr?.mq?.(ABOUT_BRANCH_CONTRACT.mobileQuery) ??
  window.matchMedia(ABOUT_BRANCH_CONTRACT.mobileQuery).matches;

const revealLegacyBaffle = (
  baffle: LegacyBaffleInstance,
): EnterAnimationResult => {
  try {
    const startedBaffle = baffle.start();
    const revealTarget = hasBaffleApi(startedBaffle) ? startedBaffle : baffle;

    revealTarget.reveal(
      ABOUT_ROUTE_ENTER_TIMINGS.titleBaffle.revealDurationMs,
      ABOUT_ROUTE_ENTER_TIMINGS.titleBaffle.revealDelayMs,
    );

    return okResult();
  } catch (error) {
    return failResult(`baffle-error:${getErrorMessage(error)}`);
  }
};

const runNativeSkillCount = (
  percentNumber: HTMLElement,
  percent: number,
): EnterAnimationResult => {
  try {
    tweenNumericText(percentNumber, {
      from: 0,
      to: percent,
      durationMs: LEGACY_SKILLS_COUNT_CONTRACT.speedMs,
      decimals: LEGACY_SKILLS_COUNT_CONTRACT.decimals,
    });

    return okResult();
  } catch (error) {
    return failResult(`countTo-error:${getErrorMessage(error)}`);
  }
};

const animateSkills = (
  skillTargets: SkillTarget[],
  timings:
    | typeof ABOUT_ROUTE_ENTER_TIMINGS.mobile
    | typeof ABOUT_ROUTE_ENTER_TIMINGS.nonMobile,
  options: EnterAnimationOptions,
): void => {
  const gsap = getGsapEngine();
  const barDelayStep =
    "skillBarWidth" in timings ? timings.skillBarWidth.delayStepSeconds : 0;
  const labelDelayStep =
    "skillLabel" in timings ? timings.skillLabel.delayStepSeconds : 0;

  skillTargets.forEach((skill, index) => {
    window.setTimeout(() => {
      const countResult = runNativeSkillCount(skill.percentNumber, skill.percent);

      if (!countResult.ok) {
        options.onAsyncFallback(countResult.reason);
      }
    }, timings.skillCountDelayStepMs * index);

    gsap.to(skill.bar, {
      width: `${skill.percent}%`,
      duration: timings.skillBarWidth.durationSeconds,
      ease: "expo.inOut",
      delay: barDelayStep * index,
    });
    gsap.to(skill.label, {
      opacity: 1,
      duration: timings.skillLabel.durationSeconds,
      ease: "expo.inOut",
      delay: labelDelayStep * index,
      onStart: () => {
        const revealResult = revealLegacyBaffle(skill.labelBaffle);

        if (!revealResult.ok) {
          options.onAsyncFallback(revealResult.reason);
        }
      },
    });
  });
};

export const runEnterAboutAnimation = (
  legacyState: EnterAboutLegacyState,
  options: EnterAnimationOptions,
): EnterAboutAnimationResult => {
  const bar = getRequiredElement<HTMLElement>(ABOUT_CONTRACT_SELECTORS.bar);
  const icon = getRequiredElement<HTMLElement>(
    ABOUT_CONTRACT_SELECTORS.titleIcon,
  );
  const paragraphs = getRequiredElements<HTMLElement>(
    ABOUT_CONTRACT_SELECTORS.paragraphs,
  );
  const heading = getRequiredElement<HTMLElement>(
    ABOUT_CONTRACT_SELECTORS.heading,
  );
  const skillBars = getRequiredElements<HTMLElement>(
    ABOUT_CONTRACT_SELECTORS.skillsBar,
  );
  const rule = getRequiredElement<HTMLElement>(ABOUT_CONTRACT_SELECTORS.rule);
  const logosText = getRequiredElement<HTMLElement>(
    ABOUT_CONTRACT_SELECTORS.logosText,
  );
  const logosItems = getRequiredElements<HTMLElement>(
    ABOUT_CONTRACT_SELECTORS.logosItem,
  );
  const titleReveal = prepareLegacyTitleReveal({
    legacyState,
    routeName: "about",
    baffleKey: "bAbout",
    titleTextSelector: ABOUT_CONTRACT_SELECTORS.titleText,
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

  if (isFailure(heading)) {
    return heading;
  }

  if (isFailure(skillBars)) {
    return skillBars;
  }

  if (isFailure(rule)) {
    return rule;
  }

  if (isFailure(logosText)) {
    return logosText;
  }

  if (isFailure(logosItems)) {
    return logosItems;
  }

  if (isFailure(titleReveal)) {
    return titleReveal;
  }

  const skillTargets = getSkillTargets(skillBars, legacyState);

  if (isFailure(skillTargets)) {
    return skillTargets;
  }

  const mobileBranch = isMobileBranch();
  const gsap = getGsapEngine();

  gsap.to(bar, {
    width: ABOUT_ROUTE_ENTER_TIMINGS.bar.targetWidth,
    duration: ABOUT_ROUTE_ENTER_TIMINGS.bar.durationSeconds,
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
    duration: ABOUT_ROUTE_ENTER_TIMINGS.titleIcon.durationSeconds,
    ease: "expo.out",
  });
  gsap.to(paragraphs, {
    opacity: ABOUT_ROUTE_ENTER_TIMINGS.paragraph.targetOpacity,
    y: ABOUT_ROUTE_ENTER_TIMINGS.paragraph.targetY,
    duration: ABOUT_ROUTE_ENTER_TIMINGS.paragraph.durationSeconds,
    ease: "expo.out",
    delay: ABOUT_ROUTE_ENTER_TIMINGS.paragraph.delaySeconds,
  });

  if (mobileBranch) {
    const skillsWatcher = getLegacyWatcher(legacyState, "skillsWatcher");
    const logosWatcher = getLegacyWatcher(legacyState, "logosWatcher");

    if (isFailure(skillsWatcher)) {
      return skillsWatcher;
    }

    if (isFailure(logosWatcher)) {
      return logosWatcher;
    }

    skillsWatcher.enterViewport?.(() => {
      gsap.to(heading, {
        opacity: 1,
        y: 0,
        duration: ABOUT_ROUTE_ENTER_TIMINGS.mobile.h2.durationSeconds,
        ease: "expo.out",
      });
      gsap.to(skillTargets.map((skill) => skill.bar), {
        opacity: 1,
        y: 0,
        duration:
          ABOUT_ROUTE_ENTER_TIMINGS.mobile.skillsBarReveal.durationSeconds,
        ease: "expo.out",
        stagger: ABOUT_ROUTE_ENTER_TIMINGS.mobile.skillsBarReveal.staggerSeconds,
      });
      animateSkills(skillTargets, ABOUT_ROUTE_ENTER_TIMINGS.mobile, options);
    });

    logosWatcher.enterViewport?.(() => {
      gsap.to(rule, {
        width: "100%",
        duration: ABOUT_ROUTE_ENTER_TIMINGS.mobile.rule.durationSeconds,
        ease: "expo.out",
      });
      gsap.to(logosText, {
        opacity: 1,
        y: 0,
        duration: ABOUT_ROUTE_ENTER_TIMINGS.mobile.logosText.durationSeconds,
        ease: "expo.out",
        delay: ABOUT_ROUTE_ENTER_TIMINGS.mobile.logosText.delaySeconds,
      });
      gsap.to(logosItems, {
        opacity: 1,
        y: 0,
        duration: ABOUT_ROUTE_ENTER_TIMINGS.mobile.logosItem.durationSeconds,
        ease: "expo.out",
        delay: ABOUT_ROUTE_ENTER_TIMINGS.mobile.logosItem.delaySeconds,
        stagger: ABOUT_ROUTE_ENTER_TIMINGS.mobile.logosItem.staggerSeconds,
      });
    });
  } else {
    gsap.to(heading, {
      opacity: 1,
      y: 0,
      duration: ABOUT_ROUTE_ENTER_TIMINGS.nonMobile.h2.durationSeconds,
      ease: "expo.out",
      delay: ABOUT_ROUTE_ENTER_TIMINGS.nonMobile.h2.delaySeconds,
    });
    gsap.to(skillTargets.map((skill) => skill.bar), {
      opacity: 1,
      y: 0,
      duration:
        ABOUT_ROUTE_ENTER_TIMINGS.nonMobile.skillsBarReveal.durationSeconds,
      ease: "expo.out",
      delay: ABOUT_ROUTE_ENTER_TIMINGS.nonMobile.skillsBarReveal.delaySeconds,
      stagger: ABOUT_ROUTE_ENTER_TIMINGS.nonMobile.skillsBarReveal.staggerSeconds,
    });
    window.setTimeout(() => {
      animateSkills(skillTargets, ABOUT_ROUTE_ENTER_TIMINGS.nonMobile, options);
    }, ABOUT_ROUTE_ENTER_TIMINGS.nonMobile.skillsLoopDelayMs);
    gsap.to(rule, {
      width: "100%",
      duration: ABOUT_ROUTE_ENTER_TIMINGS.nonMobile.rule.durationSeconds,
      ease: "expo.out",
      delay: ABOUT_ROUTE_ENTER_TIMINGS.nonMobile.rule.delaySeconds,
    });
    gsap.to(logosText, {
      opacity: 1,
      y: 0,
      duration: ABOUT_ROUTE_ENTER_TIMINGS.nonMobile.logosText.durationSeconds,
      ease: "expo.out",
      delay: ABOUT_ROUTE_ENTER_TIMINGS.nonMobile.logosText.delaySeconds,
    });
    gsap.to(logosItems, {
      opacity: 1,
      y: 0,
      duration: ABOUT_ROUTE_ENTER_TIMINGS.nonMobile.logosItem.durationSeconds,
      ease: "expo.out",
      delay: ABOUT_ROUTE_ENTER_TIMINGS.nonMobile.logosItem.delaySeconds,
      stagger: ABOUT_ROUTE_ENTER_TIMINGS.nonMobile.logosItem.staggerSeconds,
    });
  }

  return okResult();
};
