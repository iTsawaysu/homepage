import { getGsapEngine } from "./gsap";
import { prepareLegacyTitleReveal } from "./title-reveal";

type EnterHelloLegacyState = {
  bHello?: unknown;
};

type EnterHelloAnimationFailure = {
  ok: false;
  reason: string;
};

export type EnterHelloAnimationResult =
  | {
      ok: true;
    }
  | EnterHelloAnimationFailure;

type EnterHelloAnimationOptions = {
  onAsyncFallback: (reason: string) => void;
};

const getRequiredElement = <T extends Element>(
  selector: string,
): T | EnterHelloAnimationFailure => {
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
): T[] | EnterHelloAnimationFailure => {
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
  value: T | EnterHelloAnimationFailure,
): value is EnterHelloAnimationFailure =>
  "ok" in value && value.ok === false;

export const runEnterHelloAnimation = (
  legacyState: EnterHelloLegacyState,
  options: EnterHelloAnimationOptions,
): EnterHelloAnimationResult => {
  const heading = getRequiredElement<HTMLElement>(".hello h1");
  const titleText = getRequiredElement<HTMLElement>(".hello h1 .text");
  const bar = getRequiredElement<HTMLElement>(".hello .bar");
  const paragraphs = getRequiredElements<HTMLElement>(".hello p");
  const rule = getRequiredElement<HTMLElement>(".hello hr");
  const listItems = getRequiredElements<HTMLElement>(".hello li");
  const titleReveal = prepareLegacyTitleReveal({
    legacyState,
    routeName: "hello",
    baffleKey: "bHello",
    titleTextSelector: ".hello h1 .text",
  });

  if (isFailure(heading)) {
    return heading;
  }

  if (isFailure(titleText)) {
    return titleText;
  }

  if (isFailure(bar)) {
    return bar;
  }

  if (isFailure(paragraphs)) {
    return paragraphs;
  }

  if (isFailure(rule)) {
    return rule;
  }

  if (isFailure(listItems)) {
    return listItems;
  }

  if (isFailure(titleReveal)) {
    return titleReveal;
  }

  titleText.innerHTML = "&nbsp;";

  const gsap = getGsapEngine();

  gsap.to(heading, {
    borderLeft: "15px solid #2196f3",
    duration: 0.5,
    ease: "expo.out",
  });
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
  gsap.to(paragraphs, {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.1,
  });
  gsap.to(rule, {
    width: "100%",
    duration: 0.5,
    ease: "expo.out",
    delay: 0.2,
  });
  gsap.to(listItems, {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "expo.out",
    delay: 0.3,
    stagger: 0.1,
  });

  return {
    ok: true,
  };
};
