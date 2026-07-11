import { getGsapEngine } from "./gsap";

type NumericTextTweenOptions = {
  from: number;
  to: number;
  durationMs: number;
  decimals: number;
};

export const tweenNumericText = (
  element: Element,
  options: NumericTextTweenOptions,
) => {
  const state = { value: options.from };
  const gsap = getGsapEngine();

  return gsap.to(state, {
    value: options.to,
    duration: options.durationMs / 1000,
    onUpdate: () => {
      element.textContent = state.value.toFixed(options.decimals);
    },
    onComplete: () => {
      element.textContent = options.to.toFixed(options.decimals);
    },
  });
};

