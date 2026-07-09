import { getGsapEngine } from "./gsap";

type SlideResetResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: string;
    };

const queryTargets = (selector: string): Element[] =>
  Array.from(document.querySelectorAll(selector));

const setIfPresent = (
  selector: string,
  vars: Record<string, unknown>,
): void => {
  const targets = queryTargets(selector);

  if (targets.length === 0) {
    return;
  }

  getGsapEngine().set(targets, vars);
};

const removeGlitchClass = (selector: string): void => {
  for (const element of queryTargets(selector)) {
    element.classList.remove("glitch");
  }
};

export const runResetSlideLifecycle = (
  routeName: string,
): SlideResetResult => {
  const rootSelector = `.${routeName}`;

  try {
    setIfPresent(rootSelector, { opacity: 1 });
    setIfPresent(`${rootSelector} .bar`, { opacity: 1, width: 0 });
    setIfPresent(`${rootSelector} hr`, { y: 0, opacity: 1, width: 0 });
    setIfPresent(`${rootSelector} h1`, {
      borderLeft: "0 solid #2196f3",
      y: 0,
      opacity: 1,
    });
    setIfPresent(`${rootSelector} .bar .icon`, { opacity: 0 });
    setIfPresent(`${rootSelector} h2`, { opacity: 0, y: 50 });
    setIfPresent(`${rootSelector} p`, { opacity: 0, y: 50 });
    setIfPresent(`${rootSelector} hr`, { width: 0 });
    setIfPresent(`${rootSelector} li`, { opacity: 0, y: 50 });
    removeGlitchClass(`${rootSelector} .text`);

    switch (routeName) {
      case "about":
        setIfPresent(".skills__bar", { opacity: 0, y: 50, width: 0 });
        setIfPresent(".skills__label", { opacity: 0 });
        break;
      case "achievements":
        for (const element of queryTargets(".achievements .nominations li")) {
          element.classList.remove("init");
        }

        setIfPresent(".achievements .col-l .link", { opacity: 0, y: 50 });
        setIfPresent(".achievements .ui-pattern", { opacity: 0 });
        setIfPresent(".achievements .nominations li", { opacity: 1, y: 0 });
        break;
      case "coding":
        setIfPresent(".coding .card", { opacity: 0, y: 50 });
        break;
      case "design":
        setIfPresent(".design .card", { opacity: 0, y: 50 });
        break;
      case "case-study":
        setIfPresent(".case-study", { opacity: 1, y: 0 });
        setIfPresent(".case-study__section h2", { opacity: 0, y: 50 });
        setIfPresent(".case-study__section h3", { opacity: 0, y: 50 });
        setIfPresent(".case-study__section hr", { width: 0 });
        setIfPresent(".case-study__section .pattern", { width: 0 });
        setIfPresent(".case-study__section p", { opacity: 0, y: 50 });
        setIfPresent(".case-study__section .cta", { opacity: 0, y: 50 });
        break;
      default:
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
          ? `reset-slide-error:${error.message}`
          : "reset-slide-error",
    };
  }
};
