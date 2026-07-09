const DEFAULT_CHARACTERS = "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz~!@#$%^&*()-+=[]{}|;:,./<>?";
const DEFAULT_EXCLUDE = [" "];
const DEFAULT_SPEED_MS = 50;

type BaffleElementState = {
  element: HTMLElement;
  value: string;
  bitmap: number[];
};

export type NativeBaffleOptions = {
  characters?: string;
  exclude?: string[];
  speed?: number;
};

export type NativeBaffleInstance = {
  once(): NativeBaffleInstance;
  start(): NativeBaffleInstance;
  stop(): NativeBaffleInstance;
  set(options: NativeBaffleOptions): NativeBaffleInstance;
  text(value: string | ((currentValue: string) => string)): NativeBaffleInstance;
  reveal(durationMs?: number, delayMs?: number): NativeBaffleInstance;
};

const toElements = (target: string | Element | Element[]): HTMLElement[] => {
  if (typeof target === "string") {
    return Array.from(document.querySelectorAll<HTMLElement>(target));
  }

  if (Array.isArray(target)) {
    return target.filter((element): element is HTMLElement => element instanceof HTMLElement);
  }

  return target instanceof HTMLElement ? [target] : [];
};

const createBitmap = (value: string): number[] =>
  Array.from({ length: value.length }, () => 1);

const sample = (characters: string): string =>
  characters[Math.floor(Math.random() * characters.length)] ?? "";

const renderValue = (
  state: BaffleElementState,
  characters: string,
  exclude: readonly string[],
): string =>
  Array.from(state.value)
    .map((character, index) =>
      exclude.includes(character) || state.bitmap[index] === 0
        ? character
        : sample(characters),
    )
    .join("");

const resetElement = (state: BaffleElementState): void => {
  state.bitmap = createBitmap(state.value);
};

const decayElement = (state: BaffleElementState, count: number): void => {
  for (let remaining = count; remaining > 0; remaining -= 1) {
    const indexes = state.bitmap
      .map((value, index) => (value ? index : -1))
      .filter((index) => index >= 0);

    const index = indexes[Math.floor(Math.random() * indexes.length)];

    if (typeof index === "number") {
      state.bitmap[index] = 0;
    }
  }
};

export const createNativeBaffle = (
  target: string | Element | Element[],
  options: NativeBaffleOptions = {},
): NativeBaffleInstance => {
  const settings = {
    characters: options.characters ?? DEFAULT_CHARACTERS,
    exclude: options.exclude ?? DEFAULT_EXCLUDE,
    speed: options.speed ?? DEFAULT_SPEED_MS,
  };
  const elements = toElements(target).map<BaffleElementState>((element) => ({
    element,
    value: element.textContent ?? "",
    bitmap: createBitmap(element.textContent ?? ""),
  }));
  let interval = 0;
  let running = false;

  const write = (state: BaffleElementState): void => {
    state.element.textContent = renderValue(
      state,
      settings.characters,
      settings.exclude,
    );
  };

  const instance: NativeBaffleInstance = {
    once: () => {
      elements.forEach(write);
      running = true;
      return instance;
    },
    start: () => {
      window.clearInterval(interval);
      elements.forEach(resetElement);
      interval = window.setInterval(() => {
        instance.once();
      }, settings.speed);
      running = true;
      return instance;
    },
    stop: () => {
      window.clearInterval(interval);
      running = false;
      return instance;
    },
    set: (nextOptions) => {
      settings.characters = nextOptions.characters ?? settings.characters;
      settings.exclude = nextOptions.exclude ?? settings.exclude;
      settings.speed = nextOptions.speed ?? settings.speed;

      if (running) {
        instance.start();
      }

      return instance;
    },
    text: (value) => {
      elements.forEach((state) => {
        state.value =
          typeof value === "function" ? value(state.value) : String(value);
        resetElement(state);

        if (!running) {
          write(state);
        }
      });

      return instance;
    },
    reveal: (durationMs = 0, delayMs = 0) => {
      const steps = Math.max(1, Math.ceil(durationMs / settings.speed));

      window.setTimeout(() => {
        window.clearInterval(interval);
        running = true;
        interval = window.setInterval(() => {
          const activeElements = elements.filter((state) =>
            state.bitmap.some(Boolean),
          );

          activeElements.forEach((state) => {
            decayElement(state, Math.ceil(state.value.length / steps));
            write(state);
          });

          if (activeElements.length === 0) {
            instance.stop();
            elements.forEach((state) => {
              resetElement(state);
              state.element.textContent = state.value;
            });
          }
        }, settings.speed);
      }, delayMs);

      return instance;
    },
  };

  return instance;
};
