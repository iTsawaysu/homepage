import { getGsapEngine } from "./gsap";
import { prepareLegacyTitleReveal } from "./title-reveal";

type EnterErrorLegacyState = {
  bError?: unknown;
};

type EnterErrorAnimationFailure = {
  ok: false;
  reason: string;
};

export type EnterErrorAnimationResult =
  | {
      ok: true;
    }
  | EnterErrorAnimationFailure;

type EnterErrorAnimationOptions = {
  onAsyncFallback: (reason: string) => void;
};

const getRequiredElement = <T extends Element>(
  selector: string,
): T | EnterErrorAnimationFailure => {
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
  value: T | EnterErrorAnimationFailure,
): value is EnterErrorAnimationFailure =>
  "ok" in value && value.ok === false;

export const runEnterErrorAnimation = (
  legacyState: EnterErrorLegacyState,
  options: EnterErrorAnimationOptions,
): EnterErrorAnimationResult => {
  const bar = getRequiredElement<HTMLElement>(".error .bar");
  const heading = getRequiredElement<HTMLElement>(".error h1");
  const icon = getRequiredElement<HTMLElement>(".error h1 .icon");
  const paragraph = getRequiredElement<HTMLElement>(".error p");
  const titleReveal = prepareLegacyTitleReveal({
    legacyState,
    routeName: "error",
    baffleKey: "bError",
    titleTextSelector: ".error h1 .text",
  });

  if (isFailure(bar)) {
    return bar;
  }

  if (isFailure(heading)) {
    return heading;
  }

  if (isFailure(icon)) {
    return icon;
  }

  if (isFailure(paragraph)) {
    return paragraph;
  }

  if (isFailure(titleReveal)) {
    return titleReveal;
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
  gsap.to(heading, {
    borderLeft: "15px solid #383838",
    duration: 1.5,
    ease: "expo.out",
  });
  gsap.to(icon, {
    opacity: 1,
    duration: 0.5,
    ease: "expo.out",
  });
  gsap.to(paragraph, {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.1,
  });

  return {
    ok: true,
  };
};
