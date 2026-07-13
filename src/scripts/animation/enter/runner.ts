/** Shared result shapes and DOM helpers for route-enter animations. */

export type EnterAnimationFailure = {
  ok: false;
  reason: string;
};

type EnterAnimationSuccess = {
  ok: true;
};

export type EnterAnimationResult =
  | EnterAnimationSuccess
  | EnterAnimationFailure;

export type EnterAnimationOptions = {
  onAsyncFallback: (reason: string) => void;
};

export type LegacyBaffleInstance = {
  text?: (value: () => string) => unknown;
  start: () => unknown;
  reveal: (durationMs: number, delayMs: number) => unknown;
};

export type LegacyScrollWatcher = {
  recalculateLocation?: () => unknown;
  enterViewport?: (callback: () => void) => unknown;
  replaceEnterViewport?: (callback: () => void) => unknown;
};

export const getRequiredElement = <T extends Element>(
  selector: string,
): T | EnterAnimationFailure => {
  const element = document.querySelector<T>(selector);

  if (!element) {
    return {
      ok: false,
      reason: `dom-missing:${selector}`,
    };
  }

  return element;
};

export const getRequiredElements = <T extends Element>(
  selector: string,
): T[] | EnterAnimationFailure => {
  const elements = Array.from(document.querySelectorAll<T>(selector));

  if (elements.length === 0) {
    return {
      ok: false,
      reason: `dom-missing:${selector}`,
    };
  }

  return elements;
};

export const isFailure = <T extends object>(
  value: T | EnterAnimationFailure,
): value is EnterAnimationFailure => "ok" in value && value.ok === false;

export const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  (typeof value === "object" && value !== null) || typeof value === "function";

export const hasBaffleApi = (value: unknown): value is LegacyBaffleInstance =>
  isObjectRecord(value) &&
  typeof value.start === "function" &&
  typeof value.reveal === "function";

export const hasBaffleTextApi = (
  value: unknown,
): value is LegacyBaffleInstance & {
  text: (value: () => string) => unknown;
} => hasBaffleApi(value) && typeof value.text === "function";

export const hasScrollWatcherApi = (
  value: unknown,
  method:
    | "recalculateLocation"
    | "enterViewport"
    | "replaceEnterViewport" = "recalculateLocation",
): value is LegacyScrollWatcher =>
  isObjectRecord(value) && typeof value[method] === "function";

export const registerPersistentEnterCallback = (
  watcher: LegacyScrollWatcher,
  callback: () => void,
): void => {
  const replaceEnterViewport = watcher.replaceEnterViewport;

  if (typeof replaceEnterViewport === "function") {
    replaceEnterViewport.call(watcher, callback);
    return;
  }

  watcher.enterViewport?.call(watcher, callback);
};

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const okResult = (): EnterAnimationSuccess => ({ ok: true });

export const failResult = (reason: string): EnterAnimationFailure => ({
  ok: false,
  reason,
});
