export const LEGACY_LIFECYCLE_METHODS = [
  "exitCurrentSlide",
  "switchSlide",
  "resetSlide",
  "enterHello",
  "enterAbout",
  "enterAchievements",
  "enterCoding",
  "enterDesign",
  "enterCaseStudy",
  "enterArticle",
  "enterContact",
  "enterError",
  "setActiveNav",
  "getCaseStudy",
  "getArticle",
] as const;

export type LegacyLifecycleMethodName =
  (typeof LEGACY_LIFECYCLE_METHODS)[number];

export type LifecycleOwner = "legacy" | "ts-observed" | "ts-owned";

export type LifecycleMethodState = {
  method: LegacyLifecycleMethodName;
  owner: LifecycleOwner;
  available: boolean;
  wrapped: boolean;
  callCount: number;
  lastCalledAt: number | null;
  fallbackCount: number;
  lastFallbackAt: number | null;
  lastFallbackReason: string | null;
};

export type LifecycleRegistryState = {
  captured: boolean;
  capturedAt: number | null;
  methodCount: number;
  availableMethodCount: number;
  wrappedMethodCount: number;
  tsOwnedMethodCount: number;
  methods: LifecycleMethodState[];
};

const createInitialMethodState = (
  method: LegacyLifecycleMethodName,
): LifecycleMethodState => ({
  method,
  owner: "legacy",
  available: false,
  wrapped: false,
  callCount: 0,
  lastCalledAt: null,
  fallbackCount: 0,
  lastFallbackAt: null,
  lastFallbackReason: null,
});

const methodStates = new Map<LegacyLifecycleMethodName, LifecycleMethodState>(
  LEGACY_LIFECYCLE_METHODS.map((method) => [
    method,
    createInitialMethodState(method),
  ]),
);

let captured = false;
let capturedAt: number | null = null;

const getMethodState = (
  method: LegacyLifecycleMethodName,
): LifecycleMethodState => {
  const state = methodStates.get(method);

  if (!state) {
    throw new Error(`Unknown legacy lifecycle method: ${method}`);
  }

  return state;
};

export const markLifecycleInstanceCaptured = (
  availableMethods: ReadonlySet<LegacyLifecycleMethodName>,
): void => {
  captured = true;
  capturedAt = capturedAt ?? Date.now();

  for (const method of LEGACY_LIFECYCLE_METHODS) {
    const state = getMethodState(method);
    state.available = availableMethods.has(method);
  }
};

export const markLifecycleMethodWrapped = (
  method: LegacyLifecycleMethodName,
): void => {
  const state = getMethodState(method);
  state.available = true;
  state.wrapped = true;
  state.owner = "ts-observed";
};

export const setLifecycleOwner = (
  method: LegacyLifecycleMethodName,
  owner: LifecycleOwner,
): void => {
  const state = getMethodState(method);
  state.owner = owner;
};

export const recordLifecycleMethodCall = (
  method: LegacyLifecycleMethodName,
): void => {
  const state = getMethodState(method);
  state.callCount += 1;
  state.lastCalledAt = Date.now();
};

export const recordLifecycleMethodFallback = (
  method: LegacyLifecycleMethodName,
  reason: string,
): void => {
  const state = getMethodState(method);
  state.fallbackCount += 1;
  state.lastFallbackAt = Date.now();
  state.lastFallbackReason = reason;
};

export const getLifecycleMethodState = (
  method: LegacyLifecycleMethodName,
): LifecycleMethodState => ({ ...getMethodState(method) });

export const getLifecycleRegistryState = (): LifecycleRegistryState => {
  const methods = LEGACY_LIFECYCLE_METHODS.map((method) => ({
    ...getMethodState(method),
  }));

  return {
    captured,
    capturedAt,
    methodCount: methods.length,
    availableMethodCount: methods.filter((method) => method.available).length,
    wrappedMethodCount: methods.filter((method) => method.wrapped).length,
    tsOwnedMethodCount: methods.filter((method) => method.owner === "ts-owned")
      .length,
    methods,
  };
};
