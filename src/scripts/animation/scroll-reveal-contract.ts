export const LEGACY_SCROLL_MONITOR_CONTRACT = {
  owner: "ts-owned" as const,
  library: "native IntersectionObserver scroll watcher",
  createOffsetPx: -100,
} as const;

export const ABOUT_SCROLL_REVEAL_CONTRACT = {
  owner: "ts-owned" as const,
  skillsWatcherKey: "skillsWatcher",
  logosWatcherKey: "logosWatcher",
  skillsTriggerSelector: ".about .skills",
  logosTriggerSelector: ".about .logos",
  scrollMonitor: LEGACY_SCROLL_MONITOR_CONTRACT,
} as const;

export type AboutScrollRevealWatcherState = {
  key: "skillsWatcher" | "logosWatcher";
  available: boolean;
  hasEnterViewport: boolean;
  hasRecalculateLocation: boolean;
  offsets: {
    top: number | null;
    bottom: number | null;
  };
  callbackEventNames: string[];
};

export type AboutScrollRevealContractState = {
  ready: boolean;
  owner: "ts-owned";
  scrollMonitorOwner: "ts-owned";
  createOffsetPx: -100;
  watchers: AboutScrollRevealWatcherState[];
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  (typeof value === "object" && value !== null) || typeof value === "function";

const getNumberValue = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const getWatcherState = (
  legacyState: unknown,
  key: AboutScrollRevealWatcherState["key"],
): AboutScrollRevealWatcherState => {
  const watcher = isObjectRecord(legacyState) ? legacyState[key] : null;
  const callbacks = isObjectRecord(watcher) ? watcher.callbacks : null;
  const offsets = isObjectRecord(watcher) ? watcher.offsets : null;

  return {
    key,
    available: isObjectRecord(watcher),
    hasEnterViewport:
      isObjectRecord(watcher) && typeof watcher.enterViewport === "function",
    hasRecalculateLocation:
      isObjectRecord(watcher) &&
      typeof watcher.recalculateLocation === "function",
    offsets: {
      top: isObjectRecord(offsets) ? getNumberValue(offsets.top) : null,
      bottom: isObjectRecord(offsets) ? getNumberValue(offsets.bottom) : null,
    },
    callbackEventNames: isObjectRecord(callbacks)
      ? Object.keys(callbacks).sort()
      : [],
  };
};

export const getAboutScrollRevealContractState = (
  legacyState: unknown,
): AboutScrollRevealContractState => {
  const watchers = [
    getWatcherState(legacyState, "skillsWatcher"),
    getWatcherState(legacyState, "logosWatcher"),
  ];

  return {
    ready: watchers.every(
      (watcher) =>
        watcher.available &&
        watcher.hasEnterViewport &&
        watcher.hasRecalculateLocation,
    ),
    owner: ABOUT_SCROLL_REVEAL_CONTRACT.owner,
    scrollMonitorOwner: LEGACY_SCROLL_MONITOR_CONTRACT.owner,
    createOffsetPx: LEGACY_SCROLL_MONITOR_CONTRACT.createOffsetPx,
    watchers,
  };
};
