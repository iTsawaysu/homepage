import path from "node:path";
import { fileURLToPath } from "node:url";
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
  waitForRouteDetailTitle,
  writeJsonFile,
  writeTextFile,
} from "./verify/lib/harness.mjs";

const BASE_URL = "http://127.0.0.1:5174";
const TASK_DIR = taskDir(
  ".trellis/tasks/07-09-content-workflow-best-practice-improvements",
);
const RUN_ID = createRunId();
const OUT_DIR = path.join(
  TASK_DIR,
  "research",
  `detail-retry-watchers-verification-${RUN_ID}`,
);

const DESKTOP = { name: "desktop-1440x900", width: 1440, height: 900 };
const MOBILE = {
  name: "mobile-390x844",
  width: 390,
  height: 844,
  isMobile: true,
  hasTouch: true,
};

const ARTICLE_SLUG =
  "using-artificial-intelligence-to-generate-alt-text-on-images";
const ARTICLE_HASH = `#/article/${ARTICLE_SLUG}`;
const CASE_HASH = "#/case-study/cc-switch";
const CASE_ALIAS_HASH = "#/case-study/elements";

const probeScript = String.raw`
(() => {
  if (window.__detailRetryWatcherProbe) {
    return;
  }

  const hideAstroDevToolbar = () => {
    const id = "__detail_retry_watchers_hide_toolbar";

    if (!document.documentElement) {
      return;
    }

    if (document.getElementById(id)) {
      return;
    }

    const style = document.createElement("style");
    style.id = id;
    style.textContent =
      "astro-dev-toolbar{display:none!important;pointer-events:none!important;visibility:hidden!important;}";
    document.documentElement.appendChild(style);
  };

  hideAstroDevToolbar();
  document.addEventListener("DOMContentLoaded", hideAstroDevToolbar);

  const nativeSetTimeout = window.setTimeout.bind(window);
  const probe = {
    version: "detail-retry-watchers-probe-v1",
    installedAt: Date.now(),
    lifecycleSetAt: null,
    methodCalls: [],
    watcherEvents: [],
    setTimeouts: [],
    wrapErrors: [],
  };

  const methodNames = [
    "getCaseStudy",
    "setCaseStudy",
    "getArticle",
    "setArticle",
    "switchSlide",
    "exitCurrentSlide",
    "enterCaseStudy",
    "enterArticle",
    "createCaseStudyScrollMonitor",
    "destroyCaseStudyScrollMonitor",
    "createArticleScrollMonitor",
    "destroyArticleScrollMonitor",
  ];

  const describeWatcher = (watcher) => {
    if (!watcher) {
      return { exists: false };
    }

    const callbacks = watcher.callbacks || {};
    const callbackCounts = {};

    Object.keys(callbacks).forEach((key) => {
      callbackCounts[key] = Array.isArray(callbacks[key])
        ? callbacks[key].length
        : 0;
    });

    const containerWatchers = watcher.container && watcher.container.watchers;

    return {
      exists: true,
      top: typeof watcher.top === "number" ? watcher.top : null,
      bottom: typeof watcher.bottom === "number" ? watcher.bottom : null,
      isInViewport: Boolean(watcher.isInViewport),
      isFullyInViewport: Boolean(watcher.isFullyInViewport),
      callbackCounts,
      containerWatcherCount: Array.isArray(containerWatchers)
        ? containerWatchers.length
        : null,
      inContainer: Array.isArray(containerWatchers)
        ? containerWatchers.indexOf(watcher) !== -1
        : null,
    };
  };

  const snapshot = (instance) => {
    if (!instance) {
      return null;
    }

    return {
      at: Date.now(),
      hash: window.location.hash,
      currentPage: instance.currentPage || null,
      contentPayloadReady: Boolean(instance.contentPayloadReady),
      caseStudiesLength: Array.isArray(instance.caseStudies)
        ? instance.caseStudies.length
        : null,
      articlesLength: Array.isArray(instance.articles)
        ? instance.articles.length
        : null,
      hasCaseStudyItem: Boolean(instance.caseStudyItem),
      hasArticleItem: Boolean(instance.articleItem),
      caseStudyTitle: instance.caseStudyItem && instance.caseStudyItem.title,
      articleTitle: instance.articleItem && instance.articleItem.title,
      nextCaseStudyTitle:
        instance.nextCaseStudyItem && instance.nextCaseStudyItem.title,
      nextArticleTitle: instance.nextArticleItem && instance.nextArticleItem.title,
      caseStudyWatcher: describeWatcher(instance.caseStudyWatcher),
      articleWatcher: describeWatcher(instance.articleWatcher),
    };
  };

  const wrapWatcherDestroy = (watcher, watcherType) => {
    if (!watcher || typeof watcher.destroy !== "function" || watcher.__probeWrapped) {
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
    watcher.__probeWrapped = true;
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

    if (typeof current !== "function" || current.__probeMethodWrapped) {
      return;
    }

    const wrapped = function wrappedProbeMethod(...args) {
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

    wrapped.__probeMethodWrapped = true;
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

  window.setTimeout = function wrappedProbeSetTimeout(callback, delay, ...args) {
    const source =
      typeof callback === "function"
        ? Function.prototype.toString.call(callback)
        : String(callback);
    const normalizedDelay = Number(delay) || 0;

    if (
      normalizedDelay === 100 ||
      normalizedDelay === 500 ||
      normalizedDelay === 1000 ||
      source.includes("setCaseStudy") ||
      source.includes("setArticle") ||
      source.includes("switchSlide") ||
      source.includes("getCaseStudy") ||
      source.includes("getArticle")
    ) {
      probe.setTimeouts.push({
        at: Date.now(),
        delay: normalizedDelay,
        hash: window.location.hash,
        sourceHint: source.replace(/\s+/g, " ").slice(0, 220),
      });
    }

    return nativeSetTimeout(callback, delay, ...args);
  };

  const getState = () => ({
    ...probe,
    lifecycleSnapshot: snapshot(lifecycleValue),
  });

  window.__detailRetryWatcherProbe = { getState };
})();
`;

const { checks, recordCheck } = createCheckRecorder();

const hashUrl = (hash) => buildHashUrl(BASE_URL, hash);

const makeBrowserEvents = createBrowserEvents;

const isExpectedConsole = (entry) => {
  const text = `${entry.text || ""} ${entry.location?.url || ""}`;

  return (
    text.includes("__detail-retry-watchers-missing__.png") ||
    text.includes("/definitely-missing-for-baseline") ||
    text.includes("google-analytics.com") ||
    text.includes("analytics.js") ||
    text.includes("404")
  );
};

const isExpectedRequestFailure = (entry) =>
  entry.url.includes("google-analytics.com") ||
  entry.url.includes("analytics.js");

const createPage = (context, viewport, events, options = {}) =>
  createHarnessPage(context, viewport, events, {
    ...options,
    baseUrl: BASE_URL,
    includeResponseStatusText: true,
    initScript: { content: probeScript },
  });

const getBridgeState = async (page) =>
  page.evaluate(() => window.__homepageAnimationBridge?.getState());

const getProbeState = async (page) =>
  page.evaluate(() => window.__detailRetryWatcherProbe?.getState());

const getPageState = async (page) =>
  page.evaluate(() => {
    const sectionNames = [
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

    const visibleSections = sectionNames.filter((name) => {
      const selector =
        name === "coding" || name === "design"
          ? `.case-studies.${name}`
          : `.${name}`;
      const element = document.querySelector(selector);

      return Boolean(
        element && window.getComputedStyle(element).display !== "none",
      );
    });

    const activeNav = Array.from(
      document.querySelectorAll(".primary-nav .element-box.active"),
    ).map((element) => element.getAttribute("data-name"));

    const detail = {
      caseStudyHeading: document
        .querySelector(".case-study h1 .text")
        ?.textContent?.replace(/\s+/g, " ")
        .trim(),
      articleHeading: document
        .querySelector(".article h1 .text")
        ?.textContent?.replace(/\s+/g, " ")
        .trim(),
      caseStudyText: document
        .querySelector(".case-study__wrap")
        ?.textContent?.replace(/\s+/g, " ")
        .trim(),
      articleText: document
        .querySelector(".article__wrap")
        ?.textContent?.replace(/\s+/g, " ")
        .trim(),
      caseStudyNextHref:
        document
          .querySelector(".case-study__wrap .navigation a:not(.js-back-to-listing)")
          ?.getAttribute("href") ?? null,
      caseStudyListingHref:
        document
          .querySelector(".case-study__wrap .navigation .js-back-to-listing")
          ?.getAttribute("href") ?? null,
      articleNextHref:
        document
          .querySelector(".article__wrap .navigation a:not(.js-back-to-listing)")
          ?.getAttribute("href") ?? null,
      articleListingHref:
        document
          .querySelector(".article__wrap .navigation .js-back-to-listing")
          ?.getAttribute("href") ?? null,
      caseStudySections: document.querySelectorAll(".case-study__section").length,
      articleSections: document.querySelectorAll(".article__section").length,
      caseStudyRevealed: Array.from(
        document.querySelectorAll(
          ".case-study__section h2, .case-study__section h3, .case-study__section p, .case-study__section li, .case-study__section .cta",
        ),
      ).filter((element) => {
        const style = window.getComputedStyle(element);

        return Number(style.opacity) > 0.01;
      }).length,
      articleRevealed: Array.from(
        document.querySelectorAll(
          ".article__section h2, .article__section h3, .article__section p, .article__section li, .article__section img, .article__section code, .article__section .cta",
        ),
      ).filter((element) => {
        const style = window.getComputedStyle(element);

        return Number(style.opacity) > 0.01;
      }).length,
      lazyWithDataOriginal: document.querySelectorAll(".lazy[data-original]").length,
      lazyImagesMissingSrc: Array.from(
        document.querySelectorAll("img.lazy[data-original]"),
      ).filter((element) => !element.getAttribute("src")).length,
    };

    return {
      url: window.location.href,
      hash: window.location.hash,
      title: document.title,
      visibleSections,
      activeNav,
      scrollY: window.scrollY,
      headerClasses: document.querySelector(".header")?.className ?? "",
      menuActive: document.querySelector(".header .menu")?.classList.contains("active") ?? false,
      primaryNavActive:
        document.querySelector(".primary-nav")?.classList.contains("active") ??
        false,
      headerWrapActive:
        document.querySelector(".header-wrap")?.classList.contains("active") ??
        false,
      projectNoteVisible:
        document
          .querySelector(".project-note--coding")
          ?.classList.contains("is-project-note-visible") ?? false,
      projectNoteAriaHidden:
        document
          .querySelector(".project-note--coding")
          ?.getAttribute("aria-hidden") ?? null,
      achievementsInactive: document.body.classList.contains(
        "is-achievements-route-inactive",
      ),
      nominationsInit: document.querySelectorAll(".achievements .nominations li.init")
        .length,
      wechatOpen: document.querySelectorAll(".contact .wechat-item.is-open").length,
      wechatCopyLabel:
        document.querySelector(".contact .js-wechat-copy")?.textContent ?? null,
      wechatCopyStatus:
        document.querySelector(".contact .js-wechat-copy-status")?.textContent ??
        null,
      forbiddenHashLeak: document.documentElement.outerHTML.includes(
        "/homepage/#/",
      ),
      forbiddenAssetLeak: document.documentElement.outerHTML.includes(
        "/homepage/assets/",
      ),
      detail,
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
    { timeout: 12000 },
  );
};

const waitForDetailReady = async (page, kind) => {
  const wrapSelector =
    kind === "case-study" ? ".case-study__wrap" : ".article__wrap";
  const sectionName = kind === "case-study" ? "case-study" : "article";

  await waitForVisibleSection(page, sectionName);
  await page.waitForFunction(
    (selector) => {
      const wrap = document.querySelector(selector);

      return Boolean(wrap && wrap.textContent && wrap.textContent.trim().length > 40);
    },
    wrapSelector,
    { timeout: 20000 },
  );
  await page.waitForTimeout(900);
};

const waitForDetailTitle = async (page, kind, expectedTitle) => {
  await page.waitForFunction(
    ({ detailKind, title }) => {
      const selector =
        detailKind === "case-study"
          ? ".case-study h1 .text"
          : ".article h1 .text";
      const heading = document.querySelector(selector)?.textContent ?? "";
      const routeState = window.__homepageRouteLifecycle?.getState?.();
      const routeTitle =
        detailKind === "case-study"
          ? routeState?.caseStudyTitle
          : routeState?.articleTitle;

      return (
        heading.includes(title) ||
        document.title.includes(title) ||
        routeTitle === title ||
        window.__homepageLegacyLifecycle?.caseStudyItem?.title === title ||
        window.__homepageLegacyLifecycle?.articleItem?.title === title
      );
    },
    { detailKind: kind, title: expectedTitle },
    { timeout: 20000 },
  );
  await page.waitForTimeout(700);
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
      const nextUrl = new URL(href, window.location.href);
      window.location.hash = nextUrl.hash;
    }
  });
};

const methodCalls = (probe, method, phase = "before") =>
  (probe?.methodCalls ?? []).filter(
    (entry) => entry.method === method && entry.phase === phase,
  );

const delayDeltas = (calls) =>
  calls.slice(1).map((entry, index) => entry.at - calls[index].at);

const hasApproxDelta = (deltas, expected, tolerance) =>
  deltas.some((delta) => Math.abs(delta - expected) <= tolerance);

const summarizeRetryEvidence = (probe, kind) => {
  const setMethod = kind === "case-study" ? "setCaseStudy" : "setArticle";
  const getMethod = kind === "case-study" ? "getCaseStudy" : "getArticle";
  const switchCalls = methodCalls(probe, "switchSlide");
  const setCalls = methodCalls(probe, setMethod);
  const getCalls = methodCalls(probe, getMethod);
  const switchDeltas = delayDeltas(
    switchCalls.filter((entry) => entry.args[0] === kind),
  );
  const setDeltas = delayDeltas(setCalls);
  const scheduledDelays = probe?.setTimeouts?.map((entry) => entry.delay) ?? [];

  return {
    getCallCount: getCalls.length,
    setCallCount: setCalls.length,
    switchSlideDetailCallCount: switchCalls.filter(
      (entry) => entry.args[0] === kind,
    ).length,
    setDeltas,
    switchDeltas,
    scheduledDelays,
    hasSetRetry1000:
      hasApproxDelta(setDeltas, 1000, 220) || scheduledDelays.includes(1000),
    hasSwitchRetry100:
      hasApproxDelta(switchDeltas, 100, 80) || scheduledDelays.includes(100),
    hadContentNotReadySetCall: setCalls.some(
      (entry) => entry.snapshot && entry.snapshot.contentPayloadReady === false,
    ),
  };
};

const runSlowDirectOpen = async (browser, payload, route) => {
  const context = await browser.newContext();
  const events = makeBrowserEvents();
  const page = await createPage(context, DESKTOP, events, {
    slowApiDelayMs: 2600,
  });
  const start = Date.now();

  await page.goto(hashUrl(route.hash), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1300);
  const duringDelay = await getPageState(page);
  const pageErrorsDuringDelay = events.pageErrors.length;
  await waitForDetailReady(page, route.kind);
  const finalState = await getPageState(page);
  const probe = await getProbeState(page);
  const bridgeState = await getBridgeState(page);
  const retryEvidence = summarizeRetryEvidence(probe, route.kind);
  const finalAt = Date.now();

  const expectedItem =
    route.kind === "case-study"
      ? payload.caseStudies[route.index]
      : payload.articles[route.index];
  const expectedNext =
    route.kind === "case-study"
      ? payload.caseStudies[(route.index + 1) % payload.caseStudies.length]
      : payload.articles[(route.index + 1) % payload.articles.length];

  recordCheck(
    `slow direct ${route.hash} has no page error during payload delay`,
    pageErrorsDuringDelay === 0,
    { pageErrorsDuringDelay },
  );
  recordCheck(
    `slow direct ${route.hash} final detail content ready`,
    route.kind === "case-study"
      ? probe?.lifecycleSnapshot?.caseStudyTitle === expectedItem.title ||
          finalState.detail.caseStudyHeading?.includes(expectedItem.title)
      : probe?.lifecycleSnapshot?.articleTitle === expectedItem.title ||
          finalState.title.includes(expectedItem.title) ||
          finalState.detail.articleHeading?.includes(expectedItem.title),
    {
      expectedTitle: expectedItem.title,
      finalTitle: finalState.title,
      caseStudyHeading: finalState.detail.caseStudyHeading,
      articleHeading: finalState.detail.articleHeading,
      lifecycleSnapshot: probe?.lifecycleSnapshot,
      visibleSections: finalState.visibleSections,
    },
  );
  recordCheck(
    `slow direct ${route.hash} next/listing nav correct`,
    route.kind === "case-study"
      ? finalState.detail.caseStudyNextHref === expectedNext.url.local &&
          finalState.detail.caseStudyListingHref ===
            `/#/${expectedItem.category}/`
      : finalState.detail.articleNextHref === expectedNext.url &&
          finalState.detail.articleListingHref === "/#/achievements/",
    {
      expectedNext:
        route.kind === "case-study" ? expectedNext.url.local : expectedNext.url,
      actualNext:
        route.kind === "case-study"
          ? finalState.detail.caseStudyNextHref
          : finalState.detail.articleNextHref,
      actualListing:
        route.kind === "case-study"
          ? finalState.detail.caseStudyListingHref
          : finalState.detail.articleListingHref,
    },
  );
  recordCheck(
    `slow direct ${route.hash} payload retry still schedules 1000ms`,
    retryEvidence.hasSetRetry1000,
    retryEvidence,
  );
  recordCheck(
    `slow direct ${route.hash} switchSlide retry stays at 100ms`,
    retryEvidence.hasSwitchRetry100,
    retryEvidence,
  );
  // P2: ownership fields are diagnostic only — behavior asserted above.
  recordCheck(
    `slow direct ${route.hash} detail content observed after retries`,
    Boolean(
      finalState.detail.caseStudyHeading ||
        finalState.detail.articleHeading ||
        finalState.title,
    ),
    {
      visibleAnimationOwner: bridgeState?.detailContract?.visibleAnimationOwner,
      scrollRevealOwner: bridgeState?.detailContract?.scrollReveal?.owner,
      lazyloadOwner: bridgeState?.detailContract?.lazyload?.owner,
    },
  );

  await context.close();

  return {
    route,
    durationMs: finalAt - start,
    duringDelay,
    finalState,
    retryEvidence,
    bridgeSummary: {
      version: bridgeState?.version,
      fallbackTotal:
        bridgeState?.lifecycle?.methods?.reduce(
          (total, method) => total + method.fallbackCount,
          0,
        ) ?? null,
      enterCaseStudyOwner: bridgeState?.lifecycle?.methods?.find(
        (method) => method.method === "enterCaseStudy",
      )?.owner,
      enterArticleOwner: bridgeState?.lifecycle?.methods?.find(
        (method) => method.method === "enterArticle",
      )?.owner,
      detailVisibleAnimationOwner:
        bridgeState?.detailContract?.visibleAnimationOwner,
      detailScrollRevealOwner: bridgeState?.detailContract?.scrollReveal?.owner,
      lazyloadOwner: bridgeState?.detailContract?.lazyload?.owner,
    },
    events,
  };
};

const openDetailAndScroll = async (page, hash, kind) => {
  await page.goto(hashUrl(hash), { waitUntil: "domcontentloaded" });
  await waitForDetailReady(page, kind);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await page.waitForTimeout(900);
};

const runWatcherDestroyFlow = async (browser, payload, kind, targetHash) => {
  const context = await browser.newContext();
  const events = makeBrowserEvents();
  const page = await createPage(context, DESKTOP, events);
  const startHash = kind === "case-study" ? CASE_HASH : ARTICLE_HASH;

  await openDetailAndScroll(page, startHash, kind);
  const beforeLeave = await getPageState(page);
  await page.evaluate((hash) => {
    window.location.hash = hash;
  }, targetHash);

  const targetSection = targetHash.includes("unknown")
    ? "error"
    : targetHash.replace("#/", "").replace("/", "");

  await waitForVisibleSection(page, targetSection);
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    window.scrollTo(0, Math.min(document.body.scrollHeight, 800));
    window.dispatchEvent(new Event("scroll"));
  });
  await page.waitForTimeout(500);
  const afterLeave = await getPageState(page);
  const probe = await getProbeState(page);
  const destroyMethod =
    kind === "case-study"
      ? "destroyCaseStudyScrollMonitor"
      : "destroyArticleScrollMonitor";
  const createMethod =
    kind === "case-study"
      ? "createCaseStudyScrollMonitor"
      : "createArticleScrollMonitor";
  const watcherDestroyType =
    kind === "case-study"
      ? "caseStudyWatcher.destroy"
      : "articleWatcher.destroy";
  const destroyCalls = methodCalls(probe, destroyMethod);
  const createCalls = methodCalls(probe, createMethod);
  const watcherDestroyEvents = (probe?.watcherEvents ?? []).filter(
    (entry) => entry.type === watcherDestroyType && entry.phase === "after",
  );
  const lastDestroyAt = Math.max(
    0,
    ...destroyCalls.map((entry) => entry.at),
  );
  const staleEnterCalls = methodCalls(
    probe,
    kind === "case-study" ? "enterCaseStudy" : "enterArticle",
  ).filter((entry) => entry.at > lastDestroyAt);

  recordCheck(
    `${kind} watcher destroyed when leaving to ${targetHash}`,
    createCalls.length > 0 && destroyCalls.length > 0 && watcherDestroyEvents.length > 0,
    {
      createCalls: createCalls.length,
      destroyCalls: destroyCalls.length,
      watcherDestroyEvents: watcherDestroyEvents.length,
    },
  );
  recordCheck(
    `${kind} leaving to ${targetHash} keeps target visible after scroll`,
    afterLeave.visibleSections.includes(targetSection) &&
      !afterLeave.visibleSections.includes(kind),
    {
      beforeVisible: beforeLeave.visibleSections,
      afterVisible: afterLeave.visibleSections,
      hash: afterLeave.hash,
    },
  );
  recordCheck(
    `${kind} stale watcher does not re-enter detail after leaving to ${targetHash}`,
    staleEnterCalls.length <= 1,
    { staleEnterCalls: staleEnterCalls.length },
  );

  await context.close();

  return {
    kind,
    targetHash,
    beforeLeave,
    afterLeave,
    destroyCalls: destroyCalls.length,
    createCalls: createCalls.length,
    watcherDestroyEvents: watcherDestroyEvents.length,
    watcherEvents: probe?.watcherEvents ?? [],
    events,
  };
};

const runDetailNavigationFlow = async (browser, payload, kind, viewport) => {
  const context = await browser.newContext({
    isMobile: Boolean(viewport.isMobile),
    hasTouch: Boolean(viewport.hasTouch),
  });
  const events = makeBrowserEvents();
  const page = await createPage(context, viewport, events);
  const startHash = kind === "case-study" ? CASE_HASH : ARTICLE_HASH;
  const expectedNext =
    kind === "case-study" ? payload.caseStudies[1] : payload.articles[1];

  await openDetailAndScroll(page, startHash, kind);
  const scrolled = await getPageState(page);
  const nextSelector =
    kind === "case-study"
      ? ".case-study__wrap .navigation a:not(.js-back-to-listing)"
      : ".article__wrap .navigation a:not(.js-back-to-listing)";
  const listingSelector =
    kind === "case-study"
      ? ".case-study__wrap .navigation .js-back-to-listing"
      : ".article__wrap .navigation .js-back-to-listing";

  await clickLinkBySelector(page, nextSelector);
  await waitForDetailReady(page, kind);
  await waitForDetailTitle(page, kind, expectedNext.title);
  const afterNext = await getPageState(page);
  await clickLinkBySelector(page, listingSelector);
  await waitForVisibleSection(page, kind === "case-study" ? "coding" : "achievements");
  await page.waitForTimeout(1200);
  const afterListing = await getPageState(page);
  const probe = await getProbeState(page);

  recordCheck(
    `${viewport.name} ${kind} scroll creates reveal/lazy state`,
    kind === "case-study"
      ? scrolled.detail.caseStudySections > 0 &&
          scrolled.detail.caseStudyRevealed > 0
      : scrolled.detail.articleSections > 0 && scrolled.detail.articleRevealed > 0,
    {
      sections:
        kind === "case-study"
          ? scrolled.detail.caseStudySections
          : scrolled.detail.articleSections,
      revealed:
        kind === "case-study"
          ? scrolled.detail.caseStudyRevealed
          : scrolled.detail.articleRevealed,
      lazyWithDataOriginal: scrolled.detail.lazyWithDataOriginal,
      lazyImagesMissingSrc: scrolled.detail.lazyImagesMissingSrc,
    },
  );
  recordCheck(
    `${viewport.name} ${kind} next navigation reaches next item`,
    kind === "case-study"
      ? afterNext.detail.caseStudyHeading?.includes(expectedNext.title) ||
          afterNext.detail.caseStudyText?.includes(expectedNext.title)
      : afterNext.title.includes(expectedNext.title) ||
          afterNext.detail.articleHeading?.includes(expectedNext.title),
    {
      expectedNextTitle: expectedNext.title,
      hash: afterNext.hash,
      title: afterNext.title,
      caseStudyHeading: afterNext.detail.caseStudyHeading,
      articleHeading: afterNext.detail.articleHeading,
    },
  );
  recordCheck(
    `${viewport.name} ${kind} listing navigation returns to baseline listing`,
    kind === "case-study"
      ? afterListing.hash === "#/coding/" &&
          afterListing.visibleSections.includes("coding")
      : afterListing.hash === "#/achievements/" &&
          afterListing.visibleSections.includes("achievements"),
    {
      hash: afterListing.hash,
      visibleSections: afterListing.visibleSections,
    },
  );

  await context.close();

  return {
    kind,
    viewport: viewport.name,
    scrolled,
    afterNext,
    afterListing,
    probeSummary: {
      createCaseStudy: methodCalls(probe, "createCaseStudyScrollMonitor").length,
      destroyCaseStudy: methodCalls(probe, "destroyCaseStudyScrollMonitor").length,
      createArticle: methodCalls(probe, "createArticleScrollMonitor").length,
      destroyArticle: methodCalls(probe, "destroyArticleScrollMonitor").length,
    },
    events,
  };
};

const runRapidNavigationFlow = async (browser, kind) => {
  const context = await browser.newContext();
  const events = makeBrowserEvents();
  const page = await createPage(context, DESKTOP, events, {
    slowApiDelayMs: 1900,
  });
  const startHash = kind === "case-study" ? CASE_HASH : ARTICLE_HASH;
  const listingHash = kind === "case-study" ? "#/coding/" : "#/achievements/";

  await page.goto(hashUrl(startHash), { waitUntil: "domcontentloaded" });
  await waitForDetailReady(page, kind);
  await page.evaluate(
    ({ nextHash, listing }) => {
      const nextSelector = window.location.hash.startsWith("#/case-study/")
        ? ".case-study__wrap .navigation a:not(.js-back-to-listing)"
        : ".article__wrap .navigation a:not(.js-back-to-listing)";
      const nextHref = document
        .querySelector(nextSelector)
        ?.getAttribute("href");

      window.location.hash = nextHref || nextHash;
      window.setTimeout(() => {
        window.location.hash = listing;
      }, 80);
    },
    {
      nextHash:
        kind === "case-study"
          ? "#/case-study/open-design"
          : "#/article/2018-the-year-of-artificial-intelligence",
      listing: listingHash,
    },
  );
  await waitForVisibleSection(page, kind === "case-study" ? "coding" : "achievements");
  await page.waitForTimeout(1600);
  const finalState = await getPageState(page);
  const probe = await getProbeState(page);

  recordCheck(
    `${kind} rapid next/listing settles on listing`,
    finalState.hash === listingHash,
    {
      hash: finalState.hash,
      visibleSections: finalState.visibleSections,
      pageErrors: events.pageErrors.length,
    },
  );

  await context.close();

  return {
    kind,
    finalState,
    probeSummary: {
      switchSlideCalls: methodCalls(probe, "switchSlide").length,
      setCaseStudyCalls: methodCalls(probe, "setCaseStudy").length,
      setArticleCalls: methodCalls(probe, "setArticle").length,
    },
    events,
  };
};

const runStaticRouteRegression = async (browser) => {
  const context = await browser.newContext();
  const events = makeBrowserEvents();
  const page = await createPage(context, DESKTOP, events);
  const routes = [
    ["#/hello/", "hello"],
    ["#/about/", "about"],
    ["#/achievements/", "achievements"],
    ["#/coding/", "coding"],
    ["#/design/", "design"],
    ["#/contact/", "contact"],
    ["#/unknown-route", "error"],
  ];
  const captures = [];

  for (const [hash, section] of routes) {
    await page.goto(hashUrl(hash), { waitUntil: "domcontentloaded" });
    await waitForVisibleSection(page, section);
    await page.waitForTimeout(section === "achievements" ? 3800 : 1500);
    const state = await getPageState(page);
    captures.push({ hash, section, state });
    recordCheck(
      `static route ${hash} visible section ${section}`,
      state.visibleSections.includes(section),
      {
        visibleSections: state.visibleSections,
        activeNav: state.activeNav,
      },
    );
  }

  await context.close();

  return { captures, events };
};

const runMobileMenu = async (browser) => {
  const context = await browser.newContext({ isMobile: true, hasTouch: true });
  const events = makeBrowserEvents();
  const page = await createPage(context, MOBILE, events);

  await page.goto(hashUrl("#/hello/"), { waitUntil: "domcontentloaded" });
  await waitForVisibleSection(page, "hello");
  await page.locator(".header .menu").click();
  await page.waitForTimeout(500);
  const openState = await getPageState(page);
  await page.locator(".header .menu").click();
  await page.waitForTimeout(500);
  const closedState = await getPageState(page);

  recordCheck(
    "mobile menu toggles active classes",
    openState.menuActive &&
      openState.primaryNavActive &&
      openState.headerWrapActive &&
      !closedState.menuActive &&
      !closedState.primaryNavActive &&
      !closedState.headerWrapActive,
    { openState, closedState },
  );

  await context.close();

  return { openState, closedState, events };
};

const runInteractionChecks = async (browser) => {
  const context = await browser.newContext();
  const events = makeBrowserEvents();
  const page = await createPage(context, DESKTOP, events);

  await page.goto(hashUrl("#/contact/"), { waitUntil: "domcontentloaded" });
  await waitForVisibleSection(page, "contact");
  await page.locator(".contact .js-wechat-toggle").first().click();
  await page.waitForTimeout(300);
  await page.locator(".contact .js-wechat-copy").first().click();
  await page.waitForTimeout(600);
  const wechat = await getPageState(page);

  await page.goto(hashUrl("#/coding/"), { waitUntil: "domcontentloaded" });
  await waitForVisibleSection(page, "coding");
  await page.locator(".project-note--coding").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  const projectNote = await getPageState(page);

  await page.goto(hashUrl("#/achievements/"), { waitUntil: "domcontentloaded" });
  await waitForVisibleSection(page, "achievements");
  await page.waitForTimeout(3800);
  const achievements = await getPageState(page);

  recordCheck(
    "wechat card opens and copy status updates",
    wechat.wechatOpen === 1 &&
      (wechat.wechatCopyLabel === "已复制" ||
        wechat.wechatCopyLabel === "手动复制"),
    {
      wechatOpen: wechat.wechatOpen,
      wechatCopyLabel: wechat.wechatCopyLabel,
      wechatCopyStatus: wechat.wechatCopyStatus,
    },
  );
  recordCheck(
    "project note reveal remains active on coding",
    projectNote.projectNoteVisible &&
      projectNote.projectNoteAriaHidden === "false",
    {
      projectNoteVisible: projectNote.projectNoteVisible,
      ariaHidden: projectNote.projectNoteAriaHidden,
    },
  );
  recordCheck(
    "achievements delayed refresh keeps route active",
    achievements.visibleSections.includes("achievements") &&
      !achievements.achievementsInactive,
    {
      visibleSections: achievements.visibleSections,
      achievementsInactive: achievements.achievementsInactive,
      nominationsInit: achievements.nominationsInit,
    },
  );

  await context.close();

  return { wechat, projectNote, achievements, events };
};

const runApiAndHttpChecks = async (browser) => {
  const context = await browser.newContext();
  const canonical = await context.request.get(`${BASE_URL}/api/content`);
  const compat = await context.request.get(
    `${BASE_URL}/homepage/api/content`,
  );
  const canonicalJson = await canonical.json();
  const compatJson = await compat.json();
  const notFound = await context.request.get(
    `${BASE_URL}/definitely-missing-for-baseline`,
  );
  const notFoundText = htmlToText(await notFound.text());
  const missingAsset = await context.request.get(
    `${BASE_URL}/assets/homepage/__detail-retry-watchers-missing__.png`,
  );

  recordCheck(
    "api content endpoints match shape",
    canonical.status() === 200 &&
      compat.status() === 200 &&
      canonical.headers()["content-type"] ===
        "application/json; charset=utf-8" &&
      compat.headers()["content-type"] ===
        "application/json; charset=utf-8" &&
      canonicalJson.caseStudies.length === 6 &&
      canonicalJson.articles.length === 15 &&
      JSON.stringify(canonicalJson) === JSON.stringify(compatJson),
    {
      canonicalStatus: canonical.status(),
      compatStatus: compat.status(),
      canonicalContentType: canonical.headers()["content-type"],
      compatContentType: compat.headers()["content-type"],
      caseStudies: canonicalJson.caseStudies.length,
      articles: canonicalJson.articles.length,
    },
  );
  recordCheck(
    "http 404 matches normalized baseline body prefix",
    notFound.status() === 404 &&
      notFoundText.includes("404: Not Found") &&
      notFoundText.includes(
        "404: Not found Path: /definitely-missing-for-baseline",
      ),
    {
      status: notFound.status(),
      normalizedBodyStart: notFoundText.slice(0, 120),
    },
  );
  recordCheck(
    "same-origin missing asset returns 404",
    missingAsset.status() === 404,
    { status: missingAsset.status() },
  );
  recordCheck(
    "api payload has no forbidden output leak",
    !JSON.stringify(canonicalJson).includes("/homepage/#/") &&
      !JSON.stringify(canonicalJson).includes("/homepage/assets/"),
  );

  await context.close();

  return {
    canonical: {
      status: canonical.status(),
      contentType: canonical.headers()["content-type"],
      caseStudies: canonicalJson.caseStudies.length,
      articles: canonicalJson.articles.length,
    },
    compat: {
      status: compat.status(),
      contentType: compat.headers()["content-type"],
      caseStudies: compatJson.caseStudies.length,
      articles: compatJson.articles.length,
    },
    http404: {
      status: notFound.status(),
      normalizedBodyStart: notFoundText.slice(0, 180),
    },
    missingAsset: { status: missingAsset.status() },
    payload: canonicalJson,
  };
};

const collectEventSummary = (sections) => {
  const allConsole = sections.flatMap((section) => section.events?.console ?? []);
  const allPageErrors = sections.flatMap(
    (section) => section.events?.pageErrors ?? [],
  );
  const allRequestFailures = sections.flatMap(
    (section) => section.events?.requestFailures ?? [],
  );
  const allSameOriginHttpErrors = sections.flatMap(
    (section) => section.events?.sameOriginHttpErrors ?? [],
  );
  const unexpectedConsole = allConsole.filter((entry) => !isExpectedConsole(entry));
  const unexpectedRequestFailures = allRequestFailures.filter(
    (entry) => !isExpectedRequestFailure(entry),
  );
  const unexpectedSameOriginHttpErrors = allSameOriginHttpErrors.filter(
    (entry) =>
      !entry.url.includes("__detail-retry-watchers-missing__.png") &&
      !entry.url.includes("/definitely-missing-for-baseline"),
  );

  recordCheck("no unexpected console errors", unexpectedConsole.length === 0, {
    consoleErrors: allConsole.length,
    unexpectedConsole,
  });
  recordCheck("no page errors", allPageErrors.length === 0, {
    pageErrors: allPageErrors,
  });
  recordCheck(
    "no unexpected request failures",
    unexpectedRequestFailures.length === 0,
    { requestFailures: allRequestFailures, unexpectedRequestFailures },
  );
  recordCheck(
    "no unexpected same-origin HTTP errors",
    unexpectedSameOriginHttpErrors.length === 0,
    { sameOriginHttpErrors: allSameOriginHttpErrors, unexpectedSameOriginHttpErrors },
  );

  return {
    consoleErrors: allConsole.length,
    unexpectedConsoleErrors: unexpectedConsole.length,
    pageErrorCount: allPageErrors.length,
    requestFailureCount: allRequestFailures.length,
    unexpectedRequestFailures: unexpectedRequestFailures.length,
    sameOriginHttpErrorCount: allSameOriginHttpErrors.length,
    unexpectedSameOriginHttpErrors: unexpectedSameOriginHttpErrors.length,
    console: allConsole,
    pageErrors: allPageErrors,
    requestFailures: allRequestFailures,
    sameOriginHttpErrors: allSameOriginHttpErrors,
  };
};

const getFallbackTotal = (bridgeSummary) =>
  bridgeSummary?.fallbackTotal ?? null;

const writeSummary = async (result) => {
  const failedChecks = result.checks.filter((check) => !check.passed);
  const slowCase = result.slowDirectOpen.find(
    (entry) => entry.route.hash === CASE_HASH,
  );
  const slowArticle = result.slowDirectOpen.find(
    (entry) => entry.route.hash === ARTICLE_HASH,
  );
  const fallbackTotal = getFallbackTotal(slowCase?.bridgeSummary);

  const lines = [
    "# Detail Retry and Watchers Verification",
    "",
    `- Run id: \`${result.runId}\``,
    `- Base URL: \`${BASE_URL}\``,
    `- Checks passed: ${result.checks.length - failedChecks.length}`,
    `- Checks failed: ${failedChecks.length}`,
    `- Slow direct routes: ${result.slowDirectOpen
      .map((entry) => `\`${entry.route.hash}\``)
      .join(", ")}`,
    `- Case study payload retry 1000ms: ${slowCase?.retryEvidence.hasSetRetry1000 ? "yes" : "no"}`,
    `- Article payload retry 1000ms: ${slowArticle?.retryEvidence.hasSetRetry1000 ? "yes" : "no"}`,
    `- switchSlide 100ms retry observed: ${
      result.slowDirectOpen.every((entry) => entry.retryEvidence.hasSwitchRetry100)
        ? "yes"
        : "no"
    }`,
    `- fallbackTotal: ${fallbackTotal}`,
    `- enterCaseStudy owner: \`${slowCase?.bridgeSummary.enterCaseStudyOwner}\``,
    `- enterArticle owner: \`${slowArticle?.bridgeSummary.enterArticleOwner}\``,
    `- detail visible animation owner: \`${slowCase?.bridgeSummary.detailVisibleAnimationOwner}\``,
    `- detail scroll reveal owner: \`${slowCase?.bridgeSummary.detailScrollRevealOwner}\``,
    `- lazyload owner: \`${slowCase?.bridgeSummary.lazyloadOwner}\``,
    `- Console errors: ${result.browserEvents.consoleErrors}`,
    `- Unexpected console errors: ${result.browserEvents.unexpectedConsoleErrors}`,
    `- Page errors: ${result.browserEvents.pageErrorCount}`,
    `- Request failures: ${result.browserEvents.requestFailureCount}`,
    `- Unexpected request failures: ${result.browserEvents.unexpectedRequestFailures}`,
    `- Same-origin HTTP errors: ${result.browserEvents.sameOriginHttpErrorCount}`,
    `- Unexpected same-origin HTTP errors: ${result.browserEvents.unexpectedSameOriginHttpErrors}`,
    "",
    "## Watcher Destroy",
    "",
    ...result.watcherDestroyFlows.map(
      (flow) =>
        `- ${flow.kind} -> \`${flow.targetHash}\`: create=${flow.createCalls}, destroy=${flow.destroyCalls}, watcherDestroyEvents=${flow.watcherDestroyEvents}, finalHash=\`${flow.afterLeave.hash}\`, visible=${flow.afterLeave.visibleSections.join(",")}`,
    ),
    "",
    "## Detail Navigation",
    "",
    ...result.detailNavigationFlows.map(
      (flow) =>
        `- ${flow.viewport} ${flow.kind}: afterNext=\`${flow.afterNext.hash}\`, afterListing=\`${flow.afterListing.hash}\`, create/destroy=${JSON.stringify(flow.probeSummary)}`,
    ),
    "",
    "## API and 404",
    "",
    `- /api/content: ${result.api.canonical.status}, ${result.api.canonical.caseStudies} case studies, ${result.api.canonical.articles} articles`,
    `- /homepage/api/content: ${result.api.compat.status}, ${result.api.compat.caseStudies} case studies, ${result.api.compat.articles} articles`,
    `- HTTP 404: ${result.api.http404.status}, body starts \`${result.api.http404.normalizedBodyStart}\``,
    `- Missing asset 404: ${result.api.missingAsset.status}`,
    "",
    "## Failures",
    "",
    ...(failedChecks.length
      ? failedChecks.map(
          (check) =>
            `- ${check.name}: ${JSON.stringify(check.details).slice(0, 500)}`,
        )
      : ["- None"]),
    "",
  ];

  await writeTextFile(
    path.join(OUT_DIR, "detail-retry-watchers-verification.md"),
    `${lines.join("\n")}\n`,
  );
};

const main = async () => {
  await ensureDir(OUT_DIR);

  const browser = await chromium.launch();
  const api = await runApiAndHttpChecks(browser);
  const payload = api.payload;
  const sectionsWithEvents = [];

  const slowDirectOpen = [];
  for (const route of [
    { hash: CASE_HASH, kind: "case-study", index: 0 },
    { hash: CASE_ALIAS_HASH, kind: "case-study", index: 0 },
    { hash: ARTICLE_HASH, kind: "article", index: 0 },
  ]) {
    const result = await runSlowDirectOpen(browser, payload, route);
    slowDirectOpen.push(result);
    sectionsWithEvents.push(result);
  }

  const watcherDestroyFlows = [];
  for (const kind of ["case-study", "article"]) {
    for (const targetHash of [
      "#/hello/",
      "#/coding/",
      "#/design/",
      "#/achievements/",
      "#/contact/",
      "#/unknown-route",
    ]) {
      const result = await runWatcherDestroyFlow(browser, payload, kind, targetHash);
      watcherDestroyFlows.push(result);
      sectionsWithEvents.push(result);
    }
  }

  const detailNavigationFlows = [];
  for (const viewport of [DESKTOP, MOBILE]) {
    for (const kind of ["case-study", "article"]) {
      const result = await runDetailNavigationFlow(browser, payload, kind, viewport);
      detailNavigationFlows.push(result);
      sectionsWithEvents.push(result);
    }
  }

  const rapidNavigationFlows = [];
  for (const kind of ["case-study", "article"]) {
    const result = await runRapidNavigationFlow(browser, kind);
    rapidNavigationFlows.push(result);
    sectionsWithEvents.push(result);
  }

  const staticRegression = await runStaticRouteRegression(browser);
  sectionsWithEvents.push(staticRegression);

  const mobileMenu = await runMobileMenu(browser);
  sectionsWithEvents.push(mobileMenu);

  const interactions = await runInteractionChecks(browser);
  sectionsWithEvents.push(interactions);

  const browserEvents = collectEventSummary(sectionsWithEvents);

  await browser.close();

  const result = {
    runId: RUN_ID,
    baseUrl: BASE_URL,
    generatedAt: new Date().toISOString(),
    checks,
    slowDirectOpen,
    watcherDestroyFlows,
    detailNavigationFlows,
    rapidNavigationFlows,
    staticRegression,
    mobileMenu,
    interactions,
    api: {
      canonical: api.canonical,
      compat: api.compat,
      http404: api.http404,
      missingAsset: api.missingAsset,
    },
    browserEvents,
  };

  await writeJsonFile(
    path.join(OUT_DIR, "detail-retry-watchers-verification.json"),
    result,
    { trailingNewline: true },
  );
  await writeSummary(result);

  const failedChecks = checks.filter((check) => !check.passed);

  console.log(`Detail retry/watchers verification run: ${RUN_ID}`);
  console.log(`Output: ${path.resolve(OUT_DIR)}`);
  console.log(`Checks: ${checks.length - failedChecks.length} passed, ${failedChecks.length} failed`);

  if (failedChecks.length > 0) {
    console.log("Failures:");
    for (const check of failedChecks) {
      console.log(`- ${check.name}`);
    }
    process.exitCode = 1;
  }
};

const currentFile = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFile) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
