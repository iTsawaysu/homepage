/**
 * Table-driven enter animations for simple static routes (P4).
 * hello / error / contact / coding / design — same GSAP timings and selectors as before.
 */

import { getGsapEngine } from "../gsap";
import {
  prepareLegacyTitleReveal,
  type LegacyTitleRevealBaffleKey,
  type LegacyTitleRevealRoute,
} from "../title-reveal";
import {
  type EnterAnimationFailure,
  type EnterAnimationOptions,
  type EnterAnimationResult,
  getRequiredElement,
  getRequiredElements,
  isFailure,
  okResult,
} from "./runner";

type ResolvedTargets = Record<string, HTMLElement | HTMLElement[]>;

type ElementSpec = {
  key: string;
  selector: string;
  multiple?: boolean;
};

type TweenSpec = {
  targetKey: string;
  props: {
    width?: string;
    borderLeft?: string;
    opacity?: number;
    y?: number;
    duration: number;
    ease: string;
    delay?: number;
    stagger?: number;
  };
  /** When true, call prepared titleReveal.reveal() in onComplete. */
  onCompleteReveal?: boolean;
};

type SimpleEnterDescriptor = {
  routeName: LegacyTitleRevealRoute;
  baffleKey: LegacyTitleRevealBaffleKey;
  titleTextSelector: string;
  /** hello: clear title text to &nbsp; before tweens. */
  clearTitleTextKey?: string;
  elements: ElementSpec[];
  tweens: TweenSpec[];
};

type SimpleEnterRoute = "hello" | "error" | "contact" | "coding" | "design";

const SIMPLE_ENTER_TABLE: Record<SimpleEnterRoute, SimpleEnterDescriptor> = {
  hello: {
    routeName: "hello",
    baffleKey: "bHello",
    titleTextSelector: ".hello h1 .text",
    clearTitleTextKey: "titleText",
    elements: [
      { key: "heading", selector: ".hello h1" },
      { key: "titleText", selector: ".hello h1 .text" },
      { key: "bar", selector: ".hello .bar" },
      { key: "paragraphs", selector: ".hello p", multiple: true },
      { key: "rule", selector: ".hello hr" },
      { key: "listItems", selector: ".hello li", multiple: true },
    ],
    tweens: [
      {
        targetKey: "heading",
        props: {
          borderLeft: "15px solid #2196f3",
          duration: 0.5,
          ease: "expo.out",
        },
      },
      {
        targetKey: "bar",
        props: {
          width: "100%",
          duration: 0.5,
          ease: "expo.out",
        },
        onCompleteReveal: true,
      },
      {
        targetKey: "paragraphs",
        props: {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "expo.out",
          delay: 0.1,
        },
      },
      {
        targetKey: "rule",
        props: {
          width: "100%",
          duration: 0.5,
          ease: "expo.out",
          delay: 0.2,
        },
      },
      {
        targetKey: "listItems",
        props: {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "expo.out",
          delay: 0.3,
          stagger: 0.1,
        },
      },
    ],
  },
  error: {
    routeName: "error",
    baffleKey: "bError",
    titleTextSelector: ".error h1 .text",
    elements: [
      { key: "bar", selector: ".error .bar" },
      { key: "heading", selector: ".error h1" },
      { key: "icon", selector: ".error h1 .icon" },
      { key: "paragraph", selector: ".error p" },
    ],
    tweens: [
      {
        targetKey: "bar",
        props: {
          width: "100%",
          duration: 0.5,
          ease: "expo.out",
        },
        onCompleteReveal: true,
      },
      {
        targetKey: "heading",
        props: {
          borderLeft: "15px solid #383838",
          duration: 1.5,
          ease: "expo.out",
        },
      },
      {
        targetKey: "icon",
        props: {
          opacity: 1,
          duration: 0.5,
          ease: "expo.out",
        },
      },
      {
        targetKey: "paragraph",
        props: {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "expo.out",
          delay: 0.1,
        },
      },
    ],
  },
  contact: {
    routeName: "contact",
    baffleKey: "bContact",
    titleTextSelector: ".contact h1 .text",
    elements: [
      { key: "bar", selector: ".contact .bar" },
      { key: "icon", selector: ".contact h1 .icon" },
      { key: "paragraphs", selector: ".contact p", multiple: true },
      { key: "contactIcons", selector: ".contact-icons li", multiple: true },
    ],
    tweens: [
      {
        targetKey: "bar",
        props: {
          width: "100%",
          duration: 0.5,
          ease: "expo.out",
        },
        onCompleteReveal: true,
      },
      {
        targetKey: "icon",
        props: {
          opacity: 1,
          duration: 0.5,
          ease: "expo.out",
        },
      },
      {
        targetKey: "paragraphs",
        props: {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "expo.out",
          delay: 0.1,
        },
      },
      {
        targetKey: "contactIcons",
        props: {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "expo.out",
          delay: 0.2,
          stagger: 0.1,
        },
      },
    ],
  },
  coding: {
    routeName: "coding",
    baffleKey: "bCoding",
    titleTextSelector: ".coding h1 .text",
    elements: [
      { key: "bar", selector: ".coding .bar" },
      { key: "icon", selector: ".coding h1 .icon" },
      { key: "cards", selector: ".coding .card", multiple: true },
    ],
    tweens: [
      {
        targetKey: "bar",
        props: {
          width: "100%",
          duration: 0.5,
          ease: "expo.out",
        },
        onCompleteReveal: true,
      },
      {
        targetKey: "icon",
        props: {
          opacity: 1,
          duration: 0.5,
          ease: "expo.out",
        },
      },
      {
        targetKey: "cards",
        props: {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "expo.out",
          delay: 0.1,
          stagger: 0.1,
        },
      },
    ],
  },
  design: {
    routeName: "design",
    baffleKey: "bDesign",
    titleTextSelector: ".design h1 .text",
    elements: [
      { key: "bar", selector: ".design .bar" },
      { key: "icon", selector: ".design h1 .icon" },
      { key: "cards", selector: ".design .card", multiple: true },
    ],
    tweens: [
      {
        targetKey: "bar",
        props: {
          width: "100%",
          duration: 0.5,
          ease: "expo.out",
        },
        onCompleteReveal: true,
      },
      {
        targetKey: "icon",
        props: {
          opacity: 1,
          duration: 0.5,
          ease: "expo.out",
        },
      },
      {
        targetKey: "cards",
        props: {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "expo.out",
          delay: 0.1,
          stagger: 0.1,
        },
      },
    ],
  },
};

const resolveElements = (
  elements: readonly ElementSpec[],
): ResolvedTargets | EnterAnimationFailure => {
  const targets: ResolvedTargets = {};

  for (const spec of elements) {
    if (spec.multiple) {
      const value = getRequiredElements<HTMLElement>(spec.selector);
      if (isFailure(value)) {
        return value;
      }
      targets[spec.key] = value;
    } else {
      const value = getRequiredElement<HTMLElement>(spec.selector);
      if (isFailure(value)) {
        return value;
      }
      targets[spec.key] = value;
    }
  }

  return targets;
};

const runEnterSimpleAnimation = (
  route: SimpleEnterRoute,
  legacyState: unknown,
  options: EnterAnimationOptions,
): EnterAnimationResult => {
  const descriptor = SIMPLE_ENTER_TABLE[route];
  const targets = resolveElements(descriptor.elements);

  if (isFailure(targets)) {
    return targets;
  }

  const titleReveal = prepareLegacyTitleReveal({
    legacyState,
    routeName: descriptor.routeName,
    baffleKey: descriptor.baffleKey,
    titleTextSelector: descriptor.titleTextSelector,
  });

  if (isFailure(titleReveal)) {
    return titleReveal;
  }

  if (descriptor.clearTitleTextKey) {
    const titleText = targets[descriptor.clearTitleTextKey];
    if (titleText && !Array.isArray(titleText)) {
      titleText.innerHTML = "&nbsp;";
    }
  }

  const gsap = getGsapEngine();

  for (const tween of descriptor.tweens) {
    const target = targets[tween.targetKey];
    const vars: Record<string, unknown> = { ...tween.props };

    if (tween.onCompleteReveal) {
      vars.onComplete = () => {
        const revealResult = titleReveal.reveal();

        if (!revealResult.ok) {
          options.onAsyncFallback(revealResult.reason);
        }
      };
    }

    gsap.to(target, vars);
  }

  return okResult();
};

// Named wrappers — keep route-lifecycle import surface stable.

export const runEnterHelloAnimation = (
  legacyState: unknown,
  options: EnterAnimationOptions,
): EnterAnimationResult => runEnterSimpleAnimation("hello", legacyState, options);

export const runEnterErrorAnimation = (
  legacyState: unknown,
  options: EnterAnimationOptions,
): EnterAnimationResult => runEnterSimpleAnimation("error", legacyState, options);

export const runEnterContactAnimation = (
  legacyState: unknown,
  options: EnterAnimationOptions,
): EnterAnimationResult =>
  runEnterSimpleAnimation("contact", legacyState, options);

export const runEnterCodingAnimation = (
  legacyState: unknown,
  options: EnterAnimationOptions,
): EnterAnimationResult =>
  runEnterSimpleAnimation("coding", legacyState, options);

export const runEnterDesignAnimation = (
  legacyState: unknown,
  options: EnterAnimationOptions,
): EnterAnimationResult =>
  runEnterSimpleAnimation("design", legacyState, options);
