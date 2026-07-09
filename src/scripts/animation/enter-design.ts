import { getGsapEngine } from "./gsap";
import { prepareLegacyTitleReveal } from "./title-reveal";

type EnterDesignLegacyState = {
  bDesign?: unknown;
};

type EnterDesignAnimationFailure = {
  ok: false;
  reason: string;
};

export type EnterDesignAnimationResult =
  | {
      ok: true;
    }
  | EnterDesignAnimationFailure;

type EnterDesignAnimationOptions = {
  onAsyncFallback: (reason: string) => void;
};

const getRequiredElement = <T extends Element>(
  selector: string,
): T | EnterDesignAnimationFailure => {
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
): T[] | EnterDesignAnimationFailure => {
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
  value: T | EnterDesignAnimationFailure,
): value is EnterDesignAnimationFailure =>
  "ok" in value && value.ok === false;

export const runEnterDesignAnimation = (
  legacyState: EnterDesignLegacyState,
  options: EnterDesignAnimationOptions,
): EnterDesignAnimationResult => {
  const bar = getRequiredElement<HTMLElement>(".design .bar");
  const icon = getRequiredElement<HTMLElement>(".design h1 .icon");
  const cards = getRequiredElements<HTMLElement>(".design .card");
  const titleReveal = prepareLegacyTitleReveal({
    legacyState,
    routeName: "design",
    baffleKey: "bDesign",
    titleTextSelector: ".design h1 .text",
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
