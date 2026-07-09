import { getGsapEngine } from "./gsap";
import { prepareLegacyTitleReveal } from "./title-reveal";

type EnterCodingLegacyState = {
  bCoding?: unknown;
};

type EnterCodingAnimationFailure = {
  ok: false;
  reason: string;
};

export type EnterCodingAnimationResult =
  | {
      ok: true;
    }
  | EnterCodingAnimationFailure;

type EnterCodingAnimationOptions = {
  onAsyncFallback: (reason: string) => void;
};

const getRequiredElement = <T extends Element>(
  selector: string,
): T | EnterCodingAnimationFailure => {
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
): T[] | EnterCodingAnimationFailure => {
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
  value: T | EnterCodingAnimationFailure,
): value is EnterCodingAnimationFailure =>
  "ok" in value && value.ok === false;

export const runEnterCodingAnimation = (
  legacyState: EnterCodingLegacyState,
  options: EnterCodingAnimationOptions,
): EnterCodingAnimationResult => {
  const bar = getRequiredElement<HTMLElement>(".coding .bar");
  const icon = getRequiredElement<HTMLElement>(".coding h1 .icon");
  const cards = getRequiredElements<HTMLElement>(".coding .card");
  const titleReveal = prepareLegacyTitleReveal({
    legacyState,
    routeName: "coding",
    baffleKey: "bCoding",
    titleTextSelector: ".coding h1 .text",
  });

  if (isFailure(bar)) {
    return bar;
  }

  if (isFailure(icon)) {
    return icon;
  }

  if (isFailure(cards)) {
    return cards;
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
  gsap.to(icon, {
    opacity: 1,
    duration: 0.5,
    ease: "expo.out",
  });
  gsap.to(cards, {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.1,
    stagger: 0.1,
  });

  return {
    ok: true,
  };
};
