import { getGsapEngine } from "./gsap";
import { prepareLegacyTitleReveal } from "./title-reveal";

type EnterContactLegacyState = {
  bContact?: unknown;
};

type EnterContactAnimationFailure = {
  ok: false;
  reason: string;
};

export type EnterContactAnimationResult =
  | {
      ok: true;
    }
  | EnterContactAnimationFailure;

type EnterContactAnimationOptions = {
  onAsyncFallback: (reason: string) => void;
};

const getRequiredElement = <T extends Element>(
  selector: string,
): T | EnterContactAnimationFailure => {
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
): T[] | EnterContactAnimationFailure => {
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
  value: T | EnterContactAnimationFailure,
): value is EnterContactAnimationFailure =>
  "ok" in value && value.ok === false;

export const runEnterContactAnimation = (
  legacyState: EnterContactLegacyState,
  options: EnterContactAnimationOptions,
): EnterContactAnimationResult => {
  const bar = getRequiredElement<HTMLElement>(".contact .bar");
  const icon = getRequiredElement<HTMLElement>(".contact h1 .icon");
  const paragraphs = getRequiredElements<HTMLElement>(".contact p");
  const contactIcons = getRequiredElements<HTMLElement>(".contact-icons li");
  const titleReveal = prepareLegacyTitleReveal({
    legacyState,
    routeName: "contact",
    baffleKey: "bContact",
    titleTextSelector: ".contact h1 .text",
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

  if (isFailure(contactIcons)) {
    return contactIcons;
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
  gsap.to(paragraphs, {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.1,
  });
  gsap.to(contactIcons, {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.2,
    stagger: 0.1,
  });

  return {
    ok: true,
  };
};
