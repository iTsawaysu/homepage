type NativeModernizr = {
  mq(query: string): boolean;
  touchevents: boolean;
  objectfit: boolean;
};

type ExistingModernizr = {
  mq?: (query: string) => boolean;
  touchevents?: boolean;
  objectfit?: boolean;
};

const hasTouchEvents = (): boolean =>
  "ontouchstart" in window || navigator.maxTouchPoints > 0;

const hasObjectFit = (): boolean =>
  typeof CSS !== "undefined" && CSS.supports("object-fit", "cover");

const syncDocumentClasses = (modernizr: NativeModernizr): void => {
  const root = document.documentElement;

  root.classList.remove("no-js");
  root.classList.add("js");
  root.classList.toggle("touchevents", modernizr.touchevents);
  root.classList.toggle("no-touchevents", !modernizr.touchevents);
  root.classList.toggle("objectfit", modernizr.objectfit);
  root.classList.toggle("no-objectfit", !modernizr.objectfit);
};

export const installNativeModernizr = (): NativeModernizr => {
  const existing = window.Modernizr as ExistingModernizr | undefined;
  const modernizr: NativeModernizr = {
    mq: existing?.mq ?? ((query: string) => window.matchMedia(query).matches),
    touchevents: existing?.touchevents ?? hasTouchEvents(),
    objectfit: existing?.objectfit ?? hasObjectFit(),
  };

  window.Modernizr = modernizr;
  syncDocumentClasses(modernizr);

  return modernizr;
};
