import { LEGACY_ANIMATION_TIMINGS } from "./timings";

export type LegacyTitleRevealBaffleKey =
  | "bHello"
  | "bAbout"
  | "bAchievements"
  | "bError"
  | "bContact"
  | "bCoding"
  | "bDesign";
export type LegacyTitleRevealRoute =
  | "hello"
  | "about"
  | "achievements"
  | "error"
  | "contact"
  | "coding"
  | "design";
export type LegacyTitleBaffleOwner = "ts-owned";
export type LegacyTitleRevealOwner = "ts-owned";

type LegacyBaffleInstance = {
  start: () => unknown;
  reveal: (durationMs: number, delayMs: number) => unknown;
};

export type TitleRevealFailure = {
  ok: false;
  reason: string;
};

export type TitleRevealResult =
  | {
      ok: true;
    }
  | TitleRevealFailure;

export type PreparedLegacyTitleReveal = {
  ok: true;
  routeName: LegacyTitleRevealRoute;
  baffleKey: LegacyTitleRevealBaffleKey;
  reveal: () => TitleRevealResult;
};

type LegacyTitleRevealOptions = {
  legacyState: unknown;
  routeName: LegacyTitleRevealRoute;
  baffleKey: LegacyTitleRevealBaffleKey;
  titleTextSelector: string;
};

export type TitleRevealHelperState = {
  ready: true;
  owner: LegacyTitleRevealOwner;
  baffleOwner: LegacyTitleBaffleOwner;
  durationMs: number;
  delayMs: number;
  reusedBaffleKeys: LegacyTitleRevealBaffleKey[];
  routeNames: LegacyTitleRevealRoute[];
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isTitleRevealFailure = (
  value: unknown,
): value is TitleRevealFailure =>
  isObjectRecord(value) &&
  value.ok === false &&
  typeof value.reason === "string";

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  (typeof value === "object" && value !== null) || typeof value === "function";

const hasBaffleApi = (value: unknown): value is LegacyBaffleInstance =>
  isObjectRecord(value) &&
  typeof value.start === "function" &&
  typeof value.reveal === "function";

const getBaffleInstance = (
  legacyState: unknown,
  baffleKey: LegacyTitleRevealBaffleKey,
): LegacyBaffleInstance | TitleRevealFailure => {
  const baffle = isObjectRecord(legacyState) ? legacyState[baffleKey] : undefined;

  if (!hasBaffleApi(baffle)) {
    return {
      ok: false,
      reason: `baffle-missing:${baffleKey}`,
    };
  }

  return baffle;
};

const getTitleText = (
  selector: string,
): HTMLElement | TitleRevealFailure => {
  const titleText = document.querySelector<HTMLElement>(selector);

  if (!titleText) {
    return {
      ok: false,
      reason: `dom-missing:${selector}`,
    };
  }

  return titleText;
};

const runLegacyTitleReveal = (
  baffle: LegacyBaffleInstance,
  titleText: HTMLElement,
): TitleRevealResult => {
  try {
    const startedBaffle = baffle.start();
    const revealTarget = hasBaffleApi(startedBaffle) ? startedBaffle : baffle;

    revealTarget.reveal(
      LEGACY_ANIMATION_TIMINGS.titleRevealDurationMs,
      LEGACY_ANIMATION_TIMINGS.titleRevealDelayMs,
    );
    titleText.classList.add("glitch");

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      reason: `baffle-error:${getErrorMessage(error)}`,
    };
  }
};

export const prepareLegacyTitleReveal = (
  options: LegacyTitleRevealOptions,
): PreparedLegacyTitleReveal | TitleRevealFailure => {
  const titleText = getTitleText(options.titleTextSelector);

  if (isTitleRevealFailure(titleText)) {
    return titleText;
  }

  const baffle = getBaffleInstance(options.legacyState, options.baffleKey);

  if (isTitleRevealFailure(baffle)) {
    return baffle;
  }

  return {
    ok: true,
    routeName: options.routeName,
    baffleKey: options.baffleKey,
    reveal: () => runLegacyTitleReveal(baffle, titleText),
  };
};

export const getTitleRevealHelperState = (): TitleRevealHelperState => ({
  ready: true,
  owner: "ts-owned",
  baffleOwner: "ts-owned",
  durationMs: LEGACY_ANIMATION_TIMINGS.titleRevealDurationMs,
  delayMs: LEGACY_ANIMATION_TIMINGS.titleRevealDelayMs,
  reusedBaffleKeys: [
    "bHello",
    "bAbout",
    "bAchievements",
    "bError",
    "bContact",
    "bCoding",
    "bDesign",
  ],
  routeNames: [
    "hello",
    "about",
    "achievements",
    "error",
    "contact",
    "coding",
    "design",
  ],
});
