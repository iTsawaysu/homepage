import path from "node:path";
import { chromium } from "playwright";
import {
  createBrowserEvents,
  createCheckRecorder,
  createHarnessPage,
  createRunId,
  ensureDir,
  hashUrl as buildHashUrl,
  htmlToText,
  taskDir,
  writeJsonFile,
  writeTextFile,
} from "./verify/lib/harness.mjs";

const BASE_URL = "http://127.0.0.1:5174";
const TASK_DIR = taskDir(
  ".trellis/tasks/07-09-content-workflow-best-practice-improvements",
);
const EXPECT_RESET_OWNED = process.argv.includes("--expect-reset-owned");
const EXPECT_SWITCH_OWNED = process.argv.includes("--expect-switch-owned");
const EXPECT_EXIT_OWNED = process.argv.includes("--expect-exit-owned");
const EFFECTIVE_EXPECT_RESET_OWNED = EXPECT_RESET_OWNED || EXPECT_EXIT_OWNED;
const EFFECTIVE_EXPECT_SWITCH_OWNED = EXPECT_SWITCH_OWNED || EXPECT_EXIT_OWNED;
const MODE = EXPECT_EXIT_OWNED
  ? "exit-verification"
  : EXPECT_SWITCH_OWNED
  ? "switch-verification"
  : EXPECT_RESET_OWNED
    ? "reset-verification"
    : "baseline";
const RUN_ID = createRunId();
const OUT_DIR = path.join(
  TASK_DIR,
  "research",
  `${
    EXPECT_EXIT_OWNED
      ? "slide-exit-lifecycle-verification"
      : EXPECT_SWITCH_OWNED
      ? "slide-switch-lifecycle-verification"
      : EXPECT_RESET_OWNED
        ? "slide-reset-lifecycle-verification"
        : "slide-lifecycle-baseline"
  }-${RUN_ID}`,
);

const VIEWPORTS = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  {
    name: "mobile-390x844",
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
  },
];

const STATIC_ROUTE_SEQUENCE = [
  { page: "hello", hash: "#/hello/", activeNav: "hello" },
  { page: "about", hash: "#/about/", activeNav: "about" },
  { page: "achievements", hash: "#/achievements/", activeNav: "achievements" },
  { page: "coding", hash: "#/coding/", activeNav: "coding" },
  { page: "design", hash: "#/design/", activeNav: "design" },
  { page: "contact", hash: "#/contact/", activeNav: "contact" },
  { page: "error", hash: "#/unknown-route", activeNav: null },
  { page: "hello", hash: "#/hello/", activeNav: "hello" },
];

const STATIC_TARGETS = [
  { page: "hello", hash: "#/hello/", activeNav: "hello" },
  { page: "about", hash: "#/about/", activeNav: "about" },
  { page: "achievements", hash: "#/achievements/", activeNav: "achievements" },
  { page: "coding", hash: "#/coding/", activeNav: "coding" },
  { page: "design", hash: "#/design/", activeNav: "design" },
  { page: "contact", hash: "#/contact/", activeNav: "contact" },
  { page: "error", hash: "#/unknown-route", activeNav: null },
];

const CASE_HASH = "#/case-study/cc-switch";
const ARTICLE_HASH =
  "#/article/using-artificial-intelligence-to-generate-alt-text-on-images";

const { checks, recordCheck } = createCheckRecorder();

const hashUrl = (hash) => buildHashUrl(BASE_URL, hash);

const probeScript = String.raw`
(() => {
  if (window.__slideLifecycleProbe) return;

  const hideToolbar = () => {
    if (!document.documentElement) return;
    if (document.getElementById("__slide_lifecycle_hide_toolbar")) return;
    const style = document.createElement("style");
    style.id = "__slide_lifecycle_hide_toolbar";
    style.textContent =
      "astro-dev-toolbar{display:none!important;pointer-events:none!important;visibility:hidden!important;}";
    document.documentElement.appendChild(style);
  };

  hideToolbar();
  document.addEventListener("DOMContentLoaded", hideToolbar);

  const nativeSetTimeout = window.setTimeout.bind(window);
  const probe = {
    version: "slide-lifecycle-baseline-probe-v1",
    installedAt: Date.now(),
    lifecycleSetAt: null,
    methodCalls: [],
    watcherEvents: [],
    timeouts: [],
    wrapErrors: [],
  };

  const methodNames = [
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
    "getCaseStudy",
    "getArticle",
    "createCaseStudyScrollMonitor",
    "destroyCaseStudyScrollMonitor",
    "createArticleScrollMonitor",
    "destroyArticleScrollMonitor",
  ];

  const describeWatcher = (watcher) => {
    if (!watcher) return { exists: false };
    const callbacks = watcher.callbacks || {};
    const callbackCounts = {};

    Object.keys(callbacks).forEach((key) => {
      callbackCounts[key] = Array.isArray(callbacks[key])
        ? callbacks[key].length
        : 0;
    });

    const watchers = watcher.container && watcher.container.watchers;

    return {
      exists: true,
      top: typeof watcher.top === "number" ? watcher.top : null,
      bottom: typeof watcher.bottom === "number" ? watcher.bottom : null,
      isInViewport: Boolean(watcher.isInViewport),
      isFullyInViewport: Boolean(watcher.isFullyInViewport),
      callbackCounts,
      containerWatcherCount: Array.isArray(watchers) ? watchers.length : null,
      inContainer: Array.isArray(watchers) ? watchers.indexOf(watcher) !== -1 : null,
    };
  };

  const snapshot = (instance) => {
    if (!instance) return null;

    return {
      at: Date.now(),
      hash: window.location.hash,
      currentPage: instance.currentPage || null,
      scrollY: window.scrollY,
      caseStudyTitle: instance.caseStudyItem && instance.caseStudyItem.title,
      articleTitle: instance.articleItem && instance.articleItem.title,
      contentPayloadReady: Boolean(instance.contentPayloadReady),
      caseStudyWatcher: describeWatcher(instance.caseStudyWatcher),
      articleWatcher: describeWatcher(instance.articleWatcher),
    };
  };

  const wrapWatcherDestroy = (watcher, watcherType) => {
    if (!watcher || typeof watcher.destroy !== "function" || watcher.__slideProbeWrapped) {
      return;
    }

    const originalDestroy = watcher.destroy;
    watcher.destroy = function wrappedWatcherDestroy(...args) {
      probe.watcherEvents.push({
        type: watcherType + ".destroy",
        phase: "before",
        at: Date.now(),
        hash: window.location.hash,
        watcher: describeWatcher(this),
      });

      const result = originalDestroy.apply(this, args);

      probe.watcherEvents.push({
        type: watcherType + ".destroy",
        phase: "after",
        at: Date.now(),
        hash: window.location.hash,
        watcher: describeWatcher(this),
      });

      return result;
    };
    watcher.__slideProbeWrapped = true;
  };

  const recordMethodCall = (name, phase, instance, args, extra = {}) => {
    probe.methodCalls.push({
      method: name,
      phase,
      at: Date.now(),
      hash: window.location.hash,
      args: Array.from(args).map((value) => String(value)),
      snapshot: snapshot(instance),
      ...extra,
    });
  };

  const wrapMethod = (instance, name) => {
    const current = instance && instance[name];

    if (typeof current !== "function" || current.__slideProbeMethodWrapped) {
      return;
    }

    const wrapped = function wrappedSlideProbeMethod(...args) {
      recordMethodCall(name, "before", this, args);

      try {
        const result = current.apply(this, args);

        if (name === "createCaseStudyScrollMonitor") {
          wrapWatcherDestroy(this.caseStudyWatcher, "caseStudyWatcher");
          probe.watcherEvents.push({
            type: "caseStudyWatcher.create",
            phase: "after",
            at: Date.now(),
            hash: window.location.hash,
            watcher: describeWatcher(this.caseStudyWatcher),
          });
        }

        if (name === "createArticleScrollMonitor") {
          wrapWatcherDestroy(this.articleWatcher, "articleWatcher");
          probe.watcherEvents.push({
            type: "articleWatcher.create",
            phase: "after",
            at: Date.now(),
            hash: window.location.hash,
            watcher: describeWatcher(this.articleWatcher),
          });
        }

        recordMethodCall(name, "after", this, args);
        return result;
      } catch (error) {
        recordMethodCall(name, "throw", this, args, {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    };

    wrapped.__slideProbeMethodWrapped = true;
    instance[name] = wrapped;
  };

  const wrapLifecycle = (value) => {
    try {
      methodNames.forEach((name) => wrapMethod(value, name));
    } catch (error) {
      probe.wrapErrors.push({
        at: Date.now(),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  let lifecycleValue;

  Object.defineProperty(window, "__homepageLegacyLifecycle", {
    configurable: true,
    get() {
      return lifecycleValue;
    },
    set(value) {
      lifecycleValue = value;
      probe.lifecycleSetAt = Date.now();
      wrapLifecycle(value);
    },
  });

  window.setTimeout = function wrappedSlideProbeSetTimeout(callback, delay, ...args) {
    const normalizedDelay = Number(delay) || 0;
    const source =
      typeof callback === "function"
        ? Function.prototype.toString.call(callback)
        : String(callback);

    if (
      normalizedDelay === 100 ||
      normalizedDelay === 500 ||
      normalizedDelay === 1000 ||
      source.includes("switchSlide") ||
      source.includes("getCaseStudy") ||
      source.includes("getArticle")
    ) {
      probe.timeouts.push({
        at: Date.now(),
        delay: normalizedDelay,
        hash: window.location.hash,
        sourceHint: source.replace(/\s+/g, " ").slice(0, 220),
      });
    }

    return nativeSetTimeout(callback, delay, ...args);
  };

  window.__slideLifecycleProbe = {
    getState: () => ({ ...probe, lifecycleSnapshot: snapshot(lifecycleValue) }),
  };
})();
`;

const makeEvents = createBrowserEvents;

const isViteDevModuleAbort = (entry) => {
  if (entry.failure !== "net::ERR_ABORTED" || !entry.url.startsWith(BASE_URL)) {
    return false;
  }

  const url = new URL(entry.url);

  return (
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/.vite/")
  );
};

const isExpectedConsole = (entry) => {
  const text = `${entry.text || ""} ${entry.location?.url || ""}`;

  return (
    text.includes("google-analytics.com") ||
    text.includes("analytics.js") ||
    text.includes("404")
  );
};

const isExpectedRequestFailure = (entry) =>
  entry.url.includes("google-analytics.com") ||
  entry.url.includes("analytics.js") ||
  isViteDevModuleAbort(entry);

const createPage = (context, viewport, events, options = {}) =>
  createHarnessPage(context, viewport, events, {
    ...options,
    baseUrl: BASE_URL,
    initScript: probeScript,
    initScriptPlacement: "before-events",
  });

const getProbe = (page) =>
  page.evaluate(() => window.__slideLifecycleProbe?.getState?.() ?? null);

const getBridge = (page) =>
  page.evaluate(
    () => window.__homepageAnimationBridge?.getState?.() ?? null,
  );

const readStyle = (element) => {
  if (!element) return null;

  const style = window.getComputedStyle(element);

  return {
    display: style.display,
    opacity: Number(style.opacity),
    transform: style.transform,
    width: style.width,
    borderLeftWidth: style.borderLeftWidth,
    text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
    html: element.innerHTML,
    hasGlitch: element.classList.contains("glitch"),
  };
};

const getState = (page) =>
  page.evaluate(() => {
    const readElementStyle = (element) => {
      if (!element) return null;

      const style = window.getComputedStyle(element);

      return {
        display: style.display,
        opacity: Number(style.opacity),
        transform: style.transform,
        width: style.width,
        borderLeftWidth: style.borderLeftWidth,
        text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
        html: element.innerHTML,
        hasGlitch: element.classList.contains("glitch"),
      };
    };

    const routeNames = [
      "hello",
      "about",
      "achievements",
      "coding",
      "design",
      "contact",
      "error",
      "case-study",
      "article",
    ];

    const selectorFor = (name) =>
      name === "coding" || name === "design"
        ? `.case-studies.${name}`
        : `.${name}`;

    const visibleSections = routeNames.filter((name) => {
      const element = document.querySelector(selectorFor(name));

      return Boolean(
        element && window.getComputedStyle(element).display !== "none",
      );
    });

    const sectionSnapshot = (name) => {
      const selector = selectorFor(name);
      const section = document.querySelector(selector);
      const style = section ? window.getComputedStyle(section) : null;

      return {
        name,
        display: style?.display ?? null,
        opacity: style ? Number(style.opacity) : null,
        transform: style?.transform ?? null,
        h1: readElementStyle(document.querySelector(`${selector} h1`)),
        titleText: readElementStyle(
          document.querySelector(`${selector} h1 .text`),
        ),
        bar: readElementStyle(document.querySelector(`${selector} .bar`)),
        barIcon: readElementStyle(
          document.querySelector(`${selector} .bar .icon`),
        ),
        h2: readElementStyle(document.querySelector(`${selector} h2`)),
        paragraph: readElementStyle(document.querySelector(`${selector} p`)),
        hr: readElementStyle(document.querySelector(`${selector} hr`)),
        li: readElementStyle(document.querySelector(`${selector} li`)),
        card: readElementStyle(document.querySelector(`${selector} .card`)),
      };
    };

    const meta = (selector) =>
      document.querySelector(selector)?.getAttribute("content") ?? null;

    const lifecycle = window.__homepageLegacyLifecycle;
    const activeNav = Array.from(
      document.querySelectorAll(".primary-nav .element-box.active"),
    ).map((element) => element.getAttribute("data-name"));

    return {
      url: window.location.href,
      hash: window.location.hash,
      bodyClass: document.body.className,
      htmlClass: document.documentElement.className,
      title: document.title,
      meta: {
        ogTitle: meta('meta[property="og:title"]'),
        ogType: meta('meta[property="og:type"]'),
        ogUrl: meta('meta[property="og:url"]'),
        ogDescription: meta('meta[property="og:description"]'),
        twitterTitle: meta('meta[name="twitter:title"]'),
        twitterUrl: meta('meta[property="twitter:url"]'),
        twitterDescription: meta('meta[property="twitter:description"]'),
      },
      scrollTop: {
        windowY: window.scrollY,
        body: document.body.scrollTop,
        documentElement: document.documentElement.scrollTop,
      },
      activeNav,
      currentPage: lifecycle?.currentPage ?? null,
      visibleSections,
      forbiddenHashLeak: document.documentElement.outerHTML.includes(
        "/homepage/#/",
      ),
      forbiddenAssetLeak: document.documentElement.outerHTML.includes(
        "/homepage/assets/",
      ),
      elementCloneCount: document.querySelectorAll(".element-clone").length,
      detail: {
        caseStudyTitle: lifecycle?.caseStudyItem?.title ?? null,
        articleTitle: lifecycle?.articleItem?.title ?? null,
        caseStudyWatcherExists: Boolean(lifecycle?.caseStudyWatcher),
        articleWatcherExists: Boolean(lifecycle?.articleWatcher),
        caseStudyNextHref:
          document
            .querySelector(
              ".case-study__wrap .navigation a:not(.js-back-to-listing)",
            )
            ?.getAttribute("href") ?? null,
        caseStudyListingHref:
          document
            .querySelector(".case-study__wrap .navigation .js-back-to-listing")
            ?.getAttribute("href") ?? null,
        articleNextHref:
          document
            .querySelector(
              ".article__wrap .navigation a:not(.js-back-to-listing)",
            )
            ?.getAttribute("href") ?? null,
        articleListingHref:
          document
            .querySelector(".article__wrap .navigation .js-back-to-listing")
            ?.getAttribute("href") ?? null,
      },
      special: {
        skillsBar: readElementStyle(document.querySelector(".skills__bar")),
        skillsLabel: readElementStyle(document.querySelector(".skills__label")),
        achievementsLink: readElementStyle(
          document.querySelector(".achievements .col-l .link"),
        ),
        achievementsPattern: readElementStyle(
          document.querySelector(".achievements .ui-pattern"),
        ),
        achievementsNominationInit: document.querySelectorAll(
          ".achievements .nominations li.init",
        ).length,
        caseStudySectionH2: readElementStyle(
          document.querySelector(".case-study__section h2"),
        ),
        caseStudySectionH3: readElementStyle(
          document.querySelector(".case-study__section h3"),
        ),
        caseStudySectionPattern: readElementStyle(
          document.querySelector(".case-study__section .pattern"),
        ),
        caseStudySectionCta: readElementStyle(
          document.querySelector(".case-study__section .cta"),
        ),
      },
      sections: Object.fromEntries(
        routeNames.map((name) => [name, sectionSnapshot(name)]),
      ),
    };
  });

const waitForVisibleSection = async (page, section) => {
  await page.waitForFunction(
    (sectionName) => {
      const selector =
        sectionName === "coding" || sectionName === "design"
          ? `.case-studies.${sectionName}`
          : `.${sectionName}`;
      const element = document.querySelector(selector);

      return Boolean(
        element && window.getComputedStyle(element).display !== "none",
      );
    },
    section,
    { timeout: 20000 },
  );
};

const waitForCurrentPage = async (page, section) => {
  await page.waitForFunction(
    (expected) =>
      window.__homepageLegacyLifecycle?.currentPage === expected,
    section,
    { timeout: 20000 },
  );
};

const waitForStaticReady = async (page, section) => {
  await waitForVisibleSection(page, section);
  await waitForCurrentPage(page, section);
  await page.waitForTimeout(1300);
};

const waitForInitialStaticTransitionSettled = async (page, section) => {
  await waitForStaticReady(page, section);

  if (EFFECTIVE_EXPECT_SWITCH_OWNED) {
    await page.waitForTimeout(900);
    return;
  }

  await page.waitForFunction(
    (expectedSection) => {
      const calls =
        window.__slideLifecycleProbe?.getState?.()?.methodCalls ?? [];

      return calls.some(
        (entry) =>
          entry.method === "switchSlide" &&
          entry.phase === "before" &&
          entry.args?.[0] === expectedSection,
      );
    },
    section,
    { timeout: 20000 },
  );
  await page.waitForTimeout(900);
};

const waitForDetailReady = async (page, kind, title) => {
  await waitForVisibleSection(page, kind);
  await waitForCurrentPage(page, kind);
  await page.waitForFunction(
    ({ detailKind, expectedTitle }) => {
      const lifecycle = window.__homepageLegacyLifecycle;
      const item =
        detailKind === "case-study"
          ? lifecycle?.caseStudyItem
          : lifecycle?.articleItem;

      return item?.title === expectedTitle;
    },
    { detailKind: kind, expectedTitle: title },
    { timeout: 25000 },
  );
  await page.waitForTimeout(1400);
};

const navigateHash = async (page, hash) => {
  await page.evaluate((nextHash) => {
    window.location.hash = nextHash;
  }, hash);
};

const clickLinkBySelector = async (page, selector) => {
  await page.locator(selector).first().evaluate((element) => {
    const href = element.getAttribute("href");
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    const shouldFollow = element.dispatchEvent(event);

    if (shouldFollow && href) {
      window.location.hash = new URL(href, window.location.href).hash;
    }
  });
};

const methodCalls = (probe, method, phase = "before") =>
  (probe?.methodCalls ?? []).filter(
    (entry) => entry.method === method && entry.phase === phase,
  );

const callsSince = (probe, startIndex) =>
  (probe?.methodCalls ?? []).slice(startIndex);

const methodState = (bridge, name) =>
  bridge?.lifecycle?.methods?.find((method) => method.method === name) ?? null;

const methodCallCount = (bridge, name) => methodState(bridge, name)?.callCount ?? 0;

const methodLastCalledAt = (bridge, name) =>
  methodState(bridge, name)?.lastCalledAt ?? null;

const methodDelta = (beforeBridge, afterBridge, name) =>
  methodCallCount(afterBridge, name) - methodCallCount(beforeBridge, name);

const enterMethodNameForTarget = (target) =>
  `enter${target
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")}`;

const summarizeTransition = (
  probe,
  startIndex,
  previous,
  target,
  beforeBridge = null,
  afterBridge = null,
) => {
  const calls = callsSince(probe, startIndex);
  const beforeCalls = calls.filter((entry) => entry.phase === "before");
  const methodNames = beforeCalls.map((entry) => entry.method);
  const exitCall = beforeCalls.find((entry) => entry.method === "exitCurrentSlide");
  const switchCall = beforeCalls.find((entry) => entry.method === "switchSlide");
  const resetCall = beforeCalls.find((entry) => entry.method === "resetSlide");
  const enterMethod = enterMethodNameForTarget(target);
  const enterCall = beforeCalls.find((entry) => entry.method === enterMethod);
  const lifecycle = {
    exitDelta: methodDelta(beforeBridge, afterBridge, "exitCurrentSlide"),
    switchDelta: methodDelta(beforeBridge, afterBridge, "switchSlide"),
    resetDelta: methodDelta(beforeBridge, afterBridge, "resetSlide"),
    enterDelta: methodDelta(beforeBridge, afterBridge, enterMethod),
    exitLastCalledAt: methodLastCalledAt(afterBridge, "exitCurrentSlide"),
    switchLastCalledAt: methodLastCalledAt(afterBridge, "switchSlide"),
    resetLastCalledAt: methodLastCalledAt(afterBridge, "resetSlide"),
    enterLastCalledAt: methodLastCalledAt(afterBridge, enterMethod),
  };
  const ownedOrderOk =
    lifecycle.exitDelta > 0 &&
    lifecycle.switchDelta > 0 &&
    lifecycle.resetDelta > 0 &&
    lifecycle.enterDelta > 0 &&
    lifecycle.exitLastCalledAt <= lifecycle.switchLastCalledAt &&
    lifecycle.switchLastCalledAt <= lifecycle.resetLastCalledAt &&
    lifecycle.resetLastCalledAt <= lifecycle.enterLastCalledAt;

  return {
    previous,
    target,
    methodNames,
    exitArg: exitCall?.args?.[0] ?? null,
    switchArg: switchCall?.args?.[0] ?? null,
    resetArg: resetCall?.args?.[0] ?? null,
    enterMethod,
    hasEnterCall: Boolean(enterCall),
    exitToSwitchMs:
      exitCall && switchCall ? switchCall.at - exitCall.at : null,
    switchToResetMs:
      switchCall && resetCall ? resetCall.at - switchCall.at : null,
    resetToEnterMs:
      resetCall && enterCall ? enterCall.at - resetCall.at : null,
    lifecycle,
    orderOk: EXPECT_EXIT_OWNED
      ? ownedOrderOk
      : EFFECTIVE_EXPECT_SWITCH_OWNED
        ? Boolean(exitCall)
        : EFFECTIVE_EXPECT_RESET_OWNED
        ? Boolean(exitCall && switchCall) && exitCall.at <= switchCall.at
        : Boolean(exitCall && switchCall && resetCall) &&
          exitCall.at <= switchCall.at &&
          switchCall.at <= resetCall.at &&
          (!enterCall || resetCall.at <= enterCall.at),
  };
};

const exitMatchesExpectedOwner = (transition, targetPage) =>
  EXPECT_EXIT_OWNED
    ? transition.lifecycle.exitDelta > 0
    : transition.exitArg === targetPage;

const switchMatchesExpectedOwner = (transition, targetPage) =>
  EFFECTIVE_EXPECT_SWITCH_OWNED
    ? transition.lifecycle.switchDelta > 0
    : transition.switchArg === targetPage;

const resetMatchesExpectedOwner = (transition, previousPage) =>
  EFFECTIVE_EXPECT_SWITCH_OWNED || EFFECTIVE_EXPECT_RESET_OWNED
    ? transition.lifecycle.resetDelta > 0
    : transition.resetArg === previousPage;

const expectedResetOwner = () =>
  EFFECTIVE_EXPECT_RESET_OWNED || EFFECTIVE_EXPECT_SWITCH_OWNED
    ? "ts-owned"
    : "ts-observed";

const expectedSwitchOwner = () =>
  EFFECTIVE_EXPECT_SWITCH_OWNED ? "ts-owned" : "ts-observed";

const expectedExitOwner = () =>
  EXPECT_EXIT_OWNED ? "ts-owned" : "ts-observed";

const verificationTitle = () =>
  EXPECT_EXIT_OWNED
    ? "Slide Exit Lifecycle Verification"
    : EXPECT_SWITCH_OWNED
    ? "Slide Switch Lifecycle Verification"
    : EXPECT_RESET_OWNED
      ? "Slide Reset Lifecycle Verification"
      : "Slide Lifecycle Baseline";

const verificationConsoleLabel = () =>
  EXPECT_EXIT_OWNED
    ? "Slide exit lifecycle verification"
    : EXPECT_SWITCH_OWNED
    ? "Slide switch lifecycle verification"
    : EXPECT_RESET_OWNED
      ? "Slide reset lifecycle verification"
      : "Slide lifecycle baseline";

const fallbackTotal = (bridge) =>
  bridge?.lifecycle?.methods?.reduce(
    (total, method) => total + method.fallbackCount,
    0,
  ) ?? null;

const methodOwner = (bridge, name) =>
  bridge?.lifecycle?.methods?.find((method) => method.method === name)?.owner ??
  null;

const assertEventsClean = (label, events) => {
  const unexpectedConsole = events.console.filter(
    (entry) => !isExpectedConsole(entry),
  );
  const unexpectedFailures = events.requestFailures.filter(
    (entry) => !isExpectedRequestFailure(entry),
  );

  recordCheck(
    `${label} has no unexpected browser errors`,
    unexpectedConsole.length === 0 &&
      unexpectedFailures.length === 0 &&
      events.pageErrors.length === 0 &&
      events.sameOriginHttpErrors.length === 0,
    {
      console: events.console,
      unexpectedConsole,
      pageErrors: events.pageErrors,
      requestFailures: events.requestFailures,
      unexpectedFailures,
      sameOriginHttpErrors: events.sameOriginHttpErrors,
    },
  );
};

const assertOwnership = (label, bridge) => {
  recordCheck(
    `${label} lifecycle ownership baseline`,
    methodOwner(bridge, "exitCurrentSlide") === expectedExitOwner() &&
      methodOwner(bridge, "switchSlide") === expectedSwitchOwner() &&
      methodOwner(bridge, "resetSlide") === expectedResetOwner() &&
      methodOwner(bridge, "getCaseStudy") === "ts-owned" &&
      methodOwner(bridge, "getArticle") === "ts-owned" &&
      fallbackTotal(bridge) === 0,
    {
      exitCurrentSlide: methodOwner(bridge, "exitCurrentSlide"),
      expectedExitOwner: expectedExitOwner(),
      switchSlide: methodOwner(bridge, "switchSlide"),
      resetSlide: methodOwner(bridge, "resetSlide"),
      expectedSwitchOwner: expectedSwitchOwner(),
      expectedResetOwner: expectedResetOwner(),
      getCaseStudy: methodOwner(bridge, "getCaseStudy"),
      getArticle: methodOwner(bridge, "getArticle"),
      fallbackTotal: fallbackTotal(bridge),
    },
  );
};

const assertStateBaseline = (label, state, target) => {
  recordCheck(
    `${label} current page and visible section baseline`,
    state.currentPage === target.page &&
      state.visibleSections.includes(target.page) &&
      state.scrollTop.windowY <= 2 &&
      !state.forbiddenHashLeak &&
      !state.forbiddenAssetLeak,
    {
      currentPage: state.currentPage,
      visibleSections: state.visibleSections,
      scrollTop: state.scrollTop,
      forbiddenHashLeak: state.forbiddenHashLeak,
      forbiddenAssetLeak: state.forbiddenAssetLeak,
    },
  );

  if (target.activeNav) {
    recordCheck(
      `${label} active nav baseline`,
      state.activeNav.includes(target.activeNav),
      { activeNav: state.activeNav, expected: target.activeNav },
    );
  }

  recordCheck(
    `${label} generic metadata baseline`,
    state.title === `${target.page} | iTsawaysu` &&
      state.meta.ogTitle === state.title &&
      state.meta.twitterTitle === state.title &&
      state.meta.ogType === "website",
    {
      title: state.title,
      meta: state.meta,
    },
  );
};

const assertPreviousReset = (label, state, previousPage) => {
  const previous = state.sections[previousPage];

  if (!previous) {
    recordCheck(`${label} previous section reset state captured`, false, {
      previousPage,
    });
    return;
  }

  recordCheck(
    `${label} previous section reset baseline`,
    previous.titleText?.hasGlitch === false &&
      previous.bar?.opacity === 1 &&
      (previous.barIcon === null || previous.barIcon.opacity === 0),
    {
      previousPage,
      titleText: previous.titleText,
      bar: previous.bar,
      barIcon: previous.barIcon,
      h1: previous.h1,
      h2: previous.h2,
      paragraph: previous.paragraph,
      hr: previous.hr,
      li: previous.li,
      card: previous.card,
      special: state.special,
    },
  );
};

const runStaticSequence = async (browser, viewport) => {
  const context = await browser.newContext({
    isMobile: Boolean(viewport.isMobile),
    hasTouch: Boolean(viewport.hasTouch),
  });
  const events = makeEvents();
  const page = await createPage(context, viewport, events);
  const transitions = [];

  await page.goto(hashUrl(STATIC_ROUTE_SEQUENCE[0].hash), {
    waitUntil: "domcontentloaded",
  });
  await waitForInitialStaticTransitionSettled(
    page,
    STATIC_ROUTE_SEQUENCE[0].page,
  );

  for (let index = 1; index < STATIC_ROUTE_SEQUENCE.length; index += 1) {
    const previous = STATIC_ROUTE_SEQUENCE[index - 1];
    const target = STATIC_ROUTE_SEQUENCE[index];
    const beforeProbe = await getProbe(page);
    const beforeBridge = await getBridge(page);
    const startIndex = beforeProbe?.methodCalls?.length ?? 0;

    await navigateHash(page, target.hash);
    await waitForStaticReady(page, target.page);

    const state = await getState(page);
    const probe = await getProbe(page);
    const afterBridge = await getBridge(page);
    const transition = summarizeTransition(
      probe,
      startIndex,
      previous.page,
      target.page,
      beforeBridge,
      afterBridge,
    );

    transitions.push({ previous: previous.page, target: target.page, state, transition });

    assertStateBaseline(
      `${viewport.name} static ${previous.page}->${target.page}`,
      state,
      target,
    );
    assertPreviousReset(
      `${viewport.name} static ${previous.page}->${target.page}`,
      state,
      previous.page,
    );
    recordCheck(
      `${viewport.name} static ${previous.page}->${target.page} lifecycle order baseline`,
      transition.orderOk &&
        exitMatchesExpectedOwner(transition, target.page) &&
        switchMatchesExpectedOwner(transition, target.page) &&
        resetMatchesExpectedOwner(transition, previous.page),
      transition,
    );
  }

  const bridge = await getBridge(page);
  assertOwnership(`${viewport.name} static sequence`, bridge);
  assertEventsClean(`${viewport.name} static sequence`, events);
  await context.close();

  return { viewport: viewport.name, transitions };
};

const runDetailToStatic = async (browser, payload, kind, viewport, target) => {
  const context = await browser.newContext({
    isMobile: Boolean(viewport.isMobile),
    hasTouch: Boolean(viewport.hasTouch),
  });
  const events = makeEvents();
  const page = await createPage(context, viewport, events);
  const hash = kind === "case-study" ? CASE_HASH : ARTICLE_HASH;
  const title =
    kind === "case-study" ? payload.caseStudies[0].title : payload.articles[0].title;

  await page.goto(hashUrl(hash), { waitUntil: "domcontentloaded" });
  await waitForDetailReady(page, kind, title);
  await page.evaluate(() => {
    window.scrollTo(0, Math.min(document.body.scrollHeight, 900));
    window.dispatchEvent(new Event("scroll"));
  });
  await page.waitForTimeout(700);

  const beforeProbe = await getProbe(page);
  const beforeBridge = await getBridge(page);
  const startIndex = beforeProbe?.methodCalls?.length ?? 0;

  await navigateHash(page, target.hash);
  await waitForStaticReady(page, target.page);

  const state = await getState(page);
  const probe = await getProbe(page);
  const bridge = await getBridge(page);
  const transition = summarizeTransition(
    probe,
    startIndex,
    kind,
    target.page,
    beforeBridge,
    bridge,
  );
  const destroyMethod =
    kind === "case-study"
      ? "destroyCaseStudyScrollMonitor"
      : "destroyArticleScrollMonitor";
  const watcherDestroy =
    kind === "case-study"
      ? "caseStudyWatcher.destroy"
      : "articleWatcher.destroy";
  const destroyCalls = callsSince(probe, startIndex).filter(
    (entry) => entry.method === destroyMethod && entry.phase === "before",
  );
  const watcherDestroyEvents = (probe?.watcherEvents ?? []).filter(
    (entry) => entry.type === watcherDestroy && entry.phase === "after",
  );

  assertStateBaseline(
    `${viewport.name} ${kind}->${target.page}`,
    state,
    target,
  );
  assertPreviousReset(`${viewport.name} ${kind}->${target.page}`, state, kind);
  recordCheck(
    `${viewport.name} ${kind}->${target.page} lifecycle order baseline`,
    transition.orderOk &&
      exitMatchesExpectedOwner(transition, target.page) &&
      switchMatchesExpectedOwner(transition, target.page) &&
      resetMatchesExpectedOwner(transition, kind),
    transition,
  );
  recordCheck(
    `${viewport.name} ${kind}->${target.page} detail watcher destroy baseline`,
    destroyCalls.length > 0 && watcherDestroyEvents.length > 0,
    {
      destroyMethod,
      destroyCalls: destroyCalls.length,
      watcherDestroy,
      watcherDestroyEvents: watcherDestroyEvents.length,
    },
  );
  assertOwnership(`${viewport.name} ${kind}->${target.page}`, bridge);
  assertEventsClean(`${viewport.name} ${kind}->${target.page}`, events);

  await context.close();

  return {
    viewport: viewport.name,
    kind,
    target: target.page,
    transition,
    state,
    destroyCalls: destroyCalls.length,
    watcherDestroyEvents: watcherDestroyEvents.length,
  };
};

const runDetailNavigation = async (browser, payload, kind, viewport) => {
  const context = await browser.newContext({
    isMobile: Boolean(viewport.isMobile),
    hasTouch: Boolean(viewport.hasTouch),
  });
  const events = makeEvents();
  const page = await createPage(context, viewport, events);
  const hash = kind === "case-study" ? CASE_HASH : ARTICLE_HASH;
  const firstTitle =
    kind === "case-study" ? payload.caseStudies[0].title : payload.articles[0].title;
  const nextTitle =
    kind === "case-study" ? payload.caseStudies[1].title : payload.articles[1].title;
  const nextSelector =
    kind === "case-study"
      ? ".case-study__wrap .navigation a:not(.js-back-to-listing)"
      : ".article__wrap .navigation a:not(.js-back-to-listing)";
  const listingSelector =
    kind === "case-study"
      ? ".case-study__wrap .navigation .js-back-to-listing"
      : ".article__wrap .navigation .js-back-to-listing";
  const listingTarget =
    kind === "case-study"
      ? { page: "coding", hash: "#/coding/", activeNav: "coding" }
      : {
          page: "achievements",
          hash: "#/achievements/",
          activeNav: "achievements",
        };

  await page.goto(hashUrl(hash), { waitUntil: "domcontentloaded" });
  await waitForDetailReady(page, kind, firstTitle);

  const beforeNextProbe = await getProbe(page);
  const beforeNextBridge = await getBridge(page);
  const nextStartIndex = beforeNextProbe?.methodCalls?.length ?? 0;
  await clickLinkBySelector(page, nextSelector);
  await waitForDetailReady(page, kind, nextTitle);
  const afterNext = await getState(page);
  const afterNextProbe = await getProbe(page);
  const afterNextBridge = await getBridge(page);
  const nextTransition = summarizeTransition(
    afterNextProbe,
    nextStartIndex,
    kind,
    kind,
    beforeNextBridge,
    afterNextBridge,
  );

  recordCheck(
    `${viewport.name} ${kind} next lifecycle order baseline`,
    nextTransition.orderOk &&
      exitMatchesExpectedOwner(nextTransition, kind) &&
      switchMatchesExpectedOwner(nextTransition, kind) &&
      resetMatchesExpectedOwner(nextTransition, kind),
    nextTransition,
  );
  recordCheck(
    `${viewport.name} ${kind} next item baseline`,
    kind === "case-study"
      ? afterNext.detail.caseStudyTitle === nextTitle
      : afterNext.detail.articleTitle === nextTitle,
    {
      expected: nextTitle,
      detail: afterNext.detail,
      hash: afterNext.hash,
    },
  );

  const beforeListingProbe = await getProbe(page);
  const beforeListingBridge = await getBridge(page);
  const listingStartIndex = beforeListingProbe?.methodCalls?.length ?? 0;
  await clickLinkBySelector(page, listingSelector);
  await waitForStaticReady(page, listingTarget.page);
  const afterListing = await getState(page);
  const afterListingProbe = await getProbe(page);
  const afterListingBridge = await getBridge(page);
  const listingTransition = summarizeTransition(
    afterListingProbe,
    listingStartIndex,
    kind,
    listingTarget.page,
    beforeListingBridge,
    afterListingBridge,
  );

  assertStateBaseline(
    `${viewport.name} ${kind} listing`,
    afterListing,
    listingTarget,
  );
  recordCheck(
    `${viewport.name} ${kind} listing lifecycle order baseline`,
    listingTransition.orderOk &&
      exitMatchesExpectedOwner(listingTransition, listingTarget.page) &&
      switchMatchesExpectedOwner(listingTransition, listingTarget.page) &&
      resetMatchesExpectedOwner(listingTransition, kind),
    listingTransition,
  );
  assertEventsClean(`${viewport.name} ${kind} detail navigation`, events);

  await context.close();

  return {
    viewport: viewport.name,
    kind,
    afterNext,
    afterListing,
    nextTransition,
    listingTransition,
  };
};

const runSlowDetailDirect = async (browser, payload, kind) => {
  const context = await browser.newContext();
  const events = makeEvents();
  const page = await createPage(context, VIEWPORTS[0], events, {
    slowApiDelayMs: 2600,
  });
  const hash = kind === "case-study" ? CASE_HASH : ARTICLE_HASH;
  const title =
    kind === "case-study" ? payload.caseStudies[0].title : payload.articles[0].title;

  await page.goto(hashUrl(hash), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1300);
  const duringDelay = await getState(page);
  await waitForDetailReady(page, kind, title);
  const state = await getState(page);
  const probe = await getProbe(page);
  const bridge = await getBridge(page);
  const delaySet = new Set((probe?.timeouts ?? []).map((entry) => entry.delay));

  recordCheck(
    `slow ${kind} direct route keeps 500ms route dispatch and 100ms switch retry baseline`,
    delaySet.has(500) && delaySet.has(100),
    {
      timeouts: probe?.timeouts ?? [],
      duringDelay: {
        hash: duringDelay.hash,
        currentPage: duringDelay.currentPage,
        visibleSections: duringDelay.visibleSections,
        detail: duringDelay.detail,
      },
    },
  );
  recordCheck(
    `slow ${kind} direct route eventually reaches detail baseline`,
    state.currentPage === kind &&
      state.visibleSections.includes(kind) &&
      (kind === "case-study"
        ? state.detail.caseStudyTitle === title
        : state.detail.articleTitle === title),
    {
      expectedTitle: title,
      state: {
        currentPage: state.currentPage,
        visibleSections: state.visibleSections,
        detail: state.detail,
      },
    },
  );
  assertOwnership(`slow ${kind} direct route`, bridge);
  assertEventsClean(`slow ${kind} direct route`, events);

  await context.close();

  return { kind, duringDelay, state, timeouts: probe?.timeouts ?? [] };
};

const validateApi = async (request) => {
  const canonical = await request.get(`${BASE_URL}/api/content`);
  const compat = await request.get(`${BASE_URL}/homepage/api/content`);
  const canonicalJson = await canonical.json();
  const compatJson = await compat.json();

  recordCheck(
    "content API baseline shape",
    canonical.status() === 200 &&
      compat.status() === 200 &&
      canonicalJson.caseStudies.length === 6 &&
      canonicalJson.articles.length === 15 &&
      JSON.stringify(canonicalJson) === JSON.stringify(compatJson),
    {
      canonical: {
        status: canonical.status(),
        caseStudies: canonicalJson.caseStudies.length,
        articles: canonicalJson.articles.length,
      },
      compat: {
        status: compat.status(),
        caseStudies: compatJson.caseStudies.length,
        articles: compatJson.articles.length,
      },
    },
  );

  return canonicalJson;
};

const writeReport = async (result) => {
  await ensureDir(OUT_DIR);
  await writeJsonFile(
    path.join(OUT_DIR, "slide-lifecycle-baseline.json"),
    result,
    { trailingNewline: true },
  );

  const failures = checks.filter((check) => !check.passed);
  const markdown = [
    `# ${verificationTitle()}`,
    "",
    `- Run id: \`${RUN_ID}\``,
    `- Mode: \`${MODE}\``,
    `- Base URL: \`${BASE_URL}\``,
    `- Checks passed: ${checks.length - failures.length}`,
    `- Checks failed: ${failures.length}`,
    "- Covered static sequence on desktop 1440x900 and mobile 390x844.",
    "- Covered case-study and article leaving to every static/error target.",
    "- Covered case-study and article next/listing flows on both viewports.",
    "- Covered slow detail direct opens for 500ms route dispatch and 100ms switch retry.",
    "- Captured body/html classes, currentPage, scrollTop, active nav, metadata, previous reset state, watcher destroy events, and lifecycle call timing.",
    "",
    "## Ownership",
    "",
    `- exitCurrentSlide: \`${result.ownership.exitCurrentSlide}\``,
    `- expected exitCurrentSlide: \`${expectedExitOwner()}\``,
    `- switchSlide: \`${result.ownership.switchSlide}\``,
    `- expected switchSlide: \`${expectedSwitchOwner()}\``,
    `- resetSlide: \`${result.ownership.resetSlide}\``,
    `- expected resetSlide: \`${expectedResetOwner()}\``,
    `- getCaseStudy: \`${result.ownership.getCaseStudy}\``,
    `- getArticle: \`${result.ownership.getArticle}\``,
    `- fallbackTotal: ${result.ownership.fallbackTotal}`,
    "",
    "## Failures",
    "",
    ...(failures.length
      ? failures.map((failure) => `- ${failure.name}: ${JSON.stringify(failure.details)}`)
      : ["- None"]),
    "",
  ].join("\n");

  await writeTextFile(
    path.join(OUT_DIR, "slide-lifecycle-baseline.md"),
    markdown,
  );
};

const main = async () => {
  const browser = await chromium.launch();
  const requestBrowser = await chromium.launch();
  const requestContext = await requestBrowser.newContext();

  try {
    const payload = await validateApi(requestContext.request);
    const samples = {
      staticSequences: [],
      detailToStatic: [],
      detailNavigation: [],
      slowDetailDirect: [],
    };

    for (const viewport of VIEWPORTS) {
      samples.staticSequences.push(await runStaticSequence(browser, viewport));

      for (const kind of ["case-study", "article"]) {
        for (const target of STATIC_TARGETS) {
          samples.detailToStatic.push(
            await runDetailToStatic(browser, payload, kind, viewport, target),
          );
        }

        samples.detailNavigation.push(
          await runDetailNavigation(browser, payload, kind, viewport),
        );
      }
    }

    samples.slowDetailDirect.push(
      await runSlowDetailDirect(browser, payload, "case-study"),
    );
    samples.slowDetailDirect.push(
      await runSlowDetailDirect(browser, payload, "article"),
    );

    const bridgeSample = samples.staticSequences[0]?.transitions?.[0]
      ? await (async () => {
          const context = await browser.newContext();
          const events = makeEvents();
          const page = await createPage(context, VIEWPORTS[0], events);
          await page.goto(hashUrl("#/hello/"), { waitUntil: "domcontentloaded" });
          await waitForStaticReady(page, "hello");
          const bridge = await getBridge(page);
          await context.close();
          return bridge;
        })()
      : null;

    const result = {
      runId: RUN_ID,
      baseUrl: BASE_URL,
      checks,
      failures: checks.filter((check) => !check.passed),
      ownership: {
        exitCurrentSlide: methodOwner(bridgeSample, "exitCurrentSlide"),
        switchSlide: methodOwner(bridgeSample, "switchSlide"),
        resetSlide: methodOwner(bridgeSample, "resetSlide"),
        getCaseStudy: methodOwner(bridgeSample, "getCaseStudy"),
        getArticle: methodOwner(bridgeSample, "getArticle"),
        fallbackTotal: fallbackTotal(bridgeSample),
      },
      samples,
    };

    await writeReport(result);

    if (result.failures.length > 0) {
      console.error(
        `Slide lifecycle baseline failed: ${result.failures.length}`,
      );
      process.exitCode = 1;
      return;
    }

    console.log(`${verificationConsoleLabel()} passed: ${checks.length} checks`);
    console.log(OUT_DIR);
  } finally {
    await requestContext.close();
    await requestBrowser.close();
    await browser.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
