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
  newContextForViewport,
  taskDir,
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
  `final-broad-regression-verification-${RUN_ID}`,
);

const VIEWPORTS = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
  { name: "tablet-768x1024", width: 768, height: 1024, isMobile: true, hasTouch: true },
  { name: "mobile-390x844", width: 390, height: 844, isMobile: true, hasTouch: true },
];

const DETAIL_VIEWPORTS = [VIEWPORTS[0], VIEWPORTS[3]];
const MOBILE_VIEWPORTS = [VIEWPORTS[2], VIEWPORTS[3]];

const STATIC_ROUTES = [
  { hash: "#/hello/", page: "hello", activeNav: "hello" },
  { hash: "#/about/", page: "about", activeNav: "about" },
  { hash: "#/achievements/", page: "achievements", activeNav: "achievements" },
  { hash: "#/coding/", page: "coding", activeNav: "coding" },
  { hash: "#/design/", page: "design", activeNav: "design" },
  { hash: "#/contact/", page: "contact", activeNav: "contact" },
  { hash: "#/unknown-route", page: "error", activeNav: null },
];

const CASE_STUDY_LEGACY_ALIASES = [
  "elements",
  "physical-web",
  "adelphi-digital",
  "homepage-beta",
  "the-jewel-box",
  "envirobot",
];

const { checks, recordCheck } = createCheckRecorder();

const hashUrl = (hash) => buildHashUrl(BASE_URL, hash);

const missingAssetUrl = () =>
  `${BASE_URL}${["", "assets", "homepage", "__final-broad-missing__.png"].join("/")}`;

const finalProbeScript = String.raw`
(() => {
  const hideToolbar = () => {
    if (!document.documentElement) return;
    if (document.getElementById("__final_broad_hide_toolbar")) return;
    const style = document.createElement("style");
    style.id = "__final_broad_hide_toolbar";
    style.textContent =
      "astro-dev-toolbar{display:none!important;pointer-events:none!important;visibility:hidden!important;}";
    document.documentElement.appendChild(style);
  };

  hideToolbar();
  document.addEventListener("DOMContentLoaded", hideToolbar);

  if (window.__finalBroadProbe) return;

  const nativeSetTimeout = window.setTimeout.bind(window);
  const timeouts = [];

  window.setTimeout = function wrappedFinalBroadSetTimeout(callback, delay, ...args) {
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
      timeouts.push({
        at: Date.now(),
        delay: normalizedDelay,
        hash: window.location.hash,
        sourceHint: source.replace(/\s+/g, " ").slice(0, 180),
      });
    }

    return nativeSetTimeout(callback, delay, ...args);
  };

  window.__finalBroadProbe = {
    getState: () => ({ timeouts: timeouts.slice() }),
  };
})();
`;

const makeEvents = createBrowserEvents;

const isExpectedConsole = (entry) => {
  const text = `${entry.text || ""} ${entry.location?.url || ""}`;

  return (
    text.includes("google-analytics.com") ||
    text.includes("analytics.js") ||
    text.includes("404")
  );
};

const isExpectedRequestFailure = (entry) => {
  if (entry.url.includes("google-analytics.com") || entry.url.includes("analytics.js")) {
    return true;
  }

  if (entry.failure !== "net::ERR_ABORTED" || !entry.url.startsWith(BASE_URL)) {
    return false;
  }

  const url = new URL(entry.url);

  return (
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/.vite/")
  );
};

const createPage = (context, viewport, events, options = {}) =>
  createHarnessPage(context, viewport, events, {
    ...options,
    baseUrl: BASE_URL,
    initScript: finalProbeScript,
    initScriptPlacement: "before-events",
  });

const contextForViewport = newContextForViewport;

const selectorForPage = (pageName) =>
  pageName === "coding" || pageName === "design"
    ? `.case-studies.${pageName}`
    : `.${pageName}`;

const getState = (page) =>
  page.evaluate(() => {
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
    const bridge = window.__homepageAnimationBridge?.getState?.();
    const lifecycle = bridge?.lifecycle ?? null;
    const methodState = (methodName) =>
      lifecycle?.methods?.find((method) => method.method === methodName) ?? null;
    const ownership = (areaName) =>
      bridge?.animationOwnership?.find((entry) => entry.area === areaName) ??
      null;
    const meta = (selector) =>
      document.querySelector(selector)?.getAttribute("content") ?? null;
    const activeNav = Array.from(
      document.querySelectorAll(".primary-nav .element-box.active"),
    ).map((element) => element.getAttribute("data-name"));
    const html = document.documentElement.outerHTML;
    const skillBars = Array.from(document.querySelectorAll(".skills__bar")).map(
      (element) => ({
        width: window.getComputedStyle(element).width,
        opacity: Number(window.getComputedStyle(element).opacity),
      }),
    );
    const logoItems = Array.from(document.querySelectorAll(".logos li")).map(
      (element) => ({
        opacity: Number(window.getComputedStyle(element).opacity),
        transform: window.getComputedStyle(element).transform,
      }),
    );
    const opacityFor = (selector) => {
      const element = document.querySelector(selector);

      return element ? Number(window.getComputedStyle(element).opacity) : null;
    };
    const lifecycleSummary = {
      enterCaseStudy: methodState("enterCaseStudy"),
      enterArticle: methodState("enterArticle"),
      getCaseStudy: methodState("getCaseStudy"),
      getArticle: methodState("getArticle"),
      exitCurrentSlide: methodState("exitCurrentSlide"),
      switchSlide: methodState("switchSlide"),
      resetSlide: methodState("resetSlide"),
      fallbackTotal:
        lifecycle?.methods?.reduce(
          (total, method) => total + method.fallbackCount,
          0,
        ) ?? null,
    };

    return {
      url: window.location.href,
      hash: window.location.hash,
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
      bodyClass: document.body.className,
      htmlClass: document.documentElement.className,
      visibleSections,
      currentPage: window.__homepageLegacyLifecycle?.currentPage ?? null,
      activeNav,
      scrollTop: {
        windowY: window.scrollY,
        body: document.body.scrollTop,
        documentElement: document.documentElement.scrollTop,
      },
      menu: {
        menuActive:
          document.querySelector(".header .menu")?.classList.contains("active") ??
          false,
        primaryNavActive:
          document.querySelector(".primary-nav")?.classList.contains("active") ??
          false,
        headerWrapActive:
          document.querySelector(".header-wrap")?.classList.contains("active") ??
          false,
      },
      detail: {
        caseStudyTitle:
          window.__homepageLegacyLifecycle?.caseStudyItem?.title ??
          null,
        nextCaseStudyTitle:
          window.__homepageLegacyLifecycle?.nextCaseStudyItem
            ?.title ?? null,
        articleTitle:
          window.__homepageLegacyLifecycle?.articleItem?.title ??
          null,
        nextArticleTitle:
          window.__homepageLegacyLifecycle?.nextArticleItem?.title ??
          null,
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
        caseStudyWatcherExists: Boolean(
          window.__homepageLegacyLifecycle?.caseStudyWatcher,
        ),
        articleWatcherExists: Boolean(
          window.__homepageLegacyLifecycle?.articleWatcher,
        ),
      },
      interactions: {
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
        nominationsInit: document.querySelectorAll(
          ".achievements .nominations li.init",
        ).length,
        nominationTitleOpacity: opacityFor(
          ".achievements .nominations .title",
        ),
        nominationPatternOpacity: opacityFor(
          ".achievements .nominations .ui-pattern",
        ),
        ribbonTextOpacity: opacityFor(".achievements .ribbons p"),
        ribbonItemOpacity: opacityFor(".achievements .ribbons li"),
        wechatOpen: document.querySelectorAll(".contact .wechat-item.is-open")
          .length,
        wechatCopyLabel:
          document.querySelector(".contact .js-wechat-copy")?.textContent ??
          null,
        wechatCopyStatus:
          document.querySelector(".contact .js-wechat-copy-status")
            ?.textContent ?? null,
        skillBars,
        logoItems,
      },
      lifecycle: lifecycleSummary,
      ownership: {
        routeEnterExit: ownership("route-enter-exit"),
        detailVisibleAnimation: ownership("detail-visible-animation"),
        caseStudyRouteEnter: ownership("case-study-route-enter"),
        articleRouteEnter: ownership("article-route-enter"),
        detailScrollReveal: ownership("detail-scroll-reveal"),
        scrollMonitor: ownership("scrollMonitor"),
        lazyload: ownership("lazyload"),
      },
      detailContract: bridge?.detailContract ?? null,
      bridgeVersion: bridge?.version ?? null,
      forbiddenHashLeak: html.includes("/homepage/#/"),
      forbiddenAssetLeak: html.includes("/homepage/assets/"),
    };
  });

const getProbe = (page) =>
  page.evaluate(() => window.__finalBroadProbe?.getState?.() ?? null);

const waitForVisibleSection = async (page, pageName) => {
  await page.waitForFunction(
    (expectedPage) => {
      const selector =
        expectedPage === "coding" || expectedPage === "design"
          ? `.case-studies.${expectedPage}`
          : `.${expectedPage}`;
      const element = document.querySelector(selector);

      return Boolean(
        element && window.getComputedStyle(element).display !== "none",
      );
    },
    pageName,
    { timeout: 25000 },
  );
};

const waitForCurrentPage = async (page, pageName) => {
  await page.waitForFunction(
    (expectedPage) =>
      window.__homepageLegacyLifecycle?.currentPage === expectedPage,
    pageName,
    { timeout: 25000 },
  );
};

const waitForStaticReady = async (page, target) => {
  await waitForVisibleSection(page, target.page);
  await waitForCurrentPage(page, target.page);
  await page.waitForTimeout(1300);
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
    { timeout: 30000 },
  );
  await page.waitForTimeout(1400);
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

const assertCleanState = (label, state) => {
  recordCheck(
    `${label} has no forbidden output leaks`,
    !state.forbiddenHashLeak && !state.forbiddenAssetLeak,
    {
      forbiddenHashLeak: state.forbiddenHashLeak,
      forbiddenAssetLeak: state.forbiddenAssetLeak,
    },
  );
};

const assertOwnership = (label, state) => {
  const lifecycle = state.lifecycle;

  recordCheck(
    `${label} lifecycle ownership and fallback`,
    lifecycle.enterCaseStudy?.owner === "ts-owned" &&
      lifecycle.enterArticle?.owner === "ts-owned" &&
      lifecycle.getCaseStudy?.owner === "ts-owned" &&
      lifecycle.getArticle?.owner === "ts-owned" &&
      lifecycle.exitCurrentSlide?.owner === "ts-owned" &&
      lifecycle.switchSlide?.owner === "ts-owned" &&
      lifecycle.resetSlide?.owner === "ts-owned" &&
      lifecycle.fallbackTotal === 0,
    {
      lifecycle,
      bridgeVersion: state.bridgeVersion,
    },
  );
  recordCheck(
    `${label} visible animation and native runtime ownership`,
    state.ownership.routeEnterExit?.owner === "ts-owned" &&
      state.ownership.detailVisibleAnimation?.owner === "ts-owned" &&
      state.ownership.caseStudyRouteEnter?.owner === "ts-owned" &&
      state.ownership.articleRouteEnter?.owner === "ts-owned" &&
      state.ownership.detailScrollReveal?.owner === "ts-owned" &&
      state.ownership.scrollMonitor?.owner === "ts-owned" &&
      state.ownership.lazyload?.owner === "ts-owned" &&
      state.detailContract?.scrollReveal?.owner === "ts-owned" &&
      state.detailContract?.scrollReveal?.scrollMonitorOwner ===
        "ts-owned" &&
      state.detailContract?.lazyload?.owner === "ts-owned",
    {
      ownership: state.ownership,
      detailContract: state.detailContract,
    },
  );
};

const assertStaticState = (label, state, target) => {
  recordCheck(
    `${label} static route state`,
    state.currentPage === target.page &&
      state.visibleSections.includes(target.page) &&
      state.scrollTop.windowY <= 2,
    {
      currentPage: state.currentPage,
      visibleSections: state.visibleSections,
      scrollTop: state.scrollTop,
    },
  );

  if (target.activeNav) {
    recordCheck(
      `${label} active nav`,
      state.activeNav.includes(target.activeNav),
      { activeNav: state.activeNav, expected: target.activeNav },
    );
  }

  recordCheck(
    `${label} generic metadata`,
    state.title === `${target.page} | iTsawaysu` &&
      state.meta.ogTitle === state.title &&
      state.meta.twitterTitle === state.title &&
      state.meta.ogType === "website",
    { title: state.title, meta: state.meta },
  );
  assertCleanState(label, state);
};

const collectEventSummary = (eventGroups) => {
  const consoleErrors = eventGroups.flatMap((events) => events.console);
  const pageErrors = eventGroups.flatMap((events) => events.pageErrors);
  const requestFailures = eventGroups.flatMap((events) => events.requestFailures);
  const sameOriginHttpErrors = eventGroups.flatMap(
    (events) => events.sameOriginHttpErrors,
  );
  const unexpectedConsole = consoleErrors.filter(
    (entry) => !isExpectedConsole(entry),
  );
  const unexpectedRequestFailures = requestFailures.filter(
    (entry) => !isExpectedRequestFailure(entry),
  );

  recordCheck(
    "browser run has no unexpected console/page/request errors",
    unexpectedConsole.length === 0 &&
      pageErrors.length === 0 &&
      unexpectedRequestFailures.length === 0 &&
      sameOriginHttpErrors.length === 0,
    {
      consoleErrors,
      unexpectedConsole,
      pageErrors,
      requestFailures,
      unexpectedRequestFailures,
      sameOriginHttpErrors,
    },
  );

  return {
    consoleErrors: consoleErrors.length,
    unexpectedConsoleErrors: unexpectedConsole.length,
    pageErrors: pageErrors.length,
    requestFailures: requestFailures.length,
    unexpectedRequestFailures: unexpectedRequestFailures.length,
    sameOriginHttpErrors: sameOriginHttpErrors.length,
  };
};

const parseHashSlug = (url, prefix) => {
  const match = url.match(new RegExp(`${prefix}/([^/]+)`));

  return match?.[1] ?? null;
};

const buildCaseStudySpecs = (payload) =>
  payload.caseStudies.map((item, index) => {
    const slug = parseHashSlug(item.url.local, "case-study");

    return {
      index,
      slug,
      alias: CASE_STUDY_LEGACY_ALIASES[index],
      item,
    };
  });

const buildArticleSpecs = (payload) =>
  payload.articles.map((item, index) => ({
    index,
    slug: parseHashSlug(item.url, "article"),
    item,
  }));

const runApiAndHttpChecks = async (requestContext) => {
  const canonical = await requestContext.get(`${BASE_URL}/api/content`);
  const compat = await requestContext.get(
    `${BASE_URL}/homepage/api/content`,
  );
  const canonicalJson = await canonical.json();
  const compatJson = await compat.json();
  const notFound = await requestContext.get(
    `${BASE_URL}/definitely-missing-for-baseline`,
  );
  const notFoundText = htmlToText(await notFound.text());
  const missingAsset = await requestContext.get(missingAssetUrl());
  const payloadText = JSON.stringify(canonicalJson);

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
      normalizedBodyStart: notFoundText.slice(0, 180),
    },
  );
  recordCheck(
    "same-origin missing asset returns 404",
    missingAsset.status() === 404,
    { status: missingAsset.status() },
  );
  recordCheck(
    "api payload has no forbidden output leak",
    !payloadText.includes("/homepage/#/") &&
      !payloadText.includes("/homepage/assets/"),
  );

  return {
    payload: canonicalJson,
    api: {
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
      missingAsset: {
        status: missingAsset.status(),
      },
    },
  };
};

const runStaticRoutes = async (browser, eventGroups) => {
  const samples = [];

  for (const viewport of VIEWPORTS) {
    const context = await contextForViewport(browser, viewport);
    const events = makeEvents();
    eventGroups.push(events);
    const page = await createPage(context, viewport, events);

    for (const target of STATIC_ROUTES) {
      await page.goto(hashUrl(target.hash), { waitUntil: "domcontentloaded" });
      await waitForStaticReady(page, target);
      const state = await getState(page);
      const label = `${viewport.name} static ${target.hash}`;
      assertStaticState(label, state, target);
      assertOwnership(label, state);
      samples.push({ viewport: viewport.name, hash: target.hash, state });
    }

    await context.close();
  }

  return samples;
};

const assertCaseStudyState = (label, state, spec, nextSpec) => {
  recordCheck(
    `${label} case-study detail state`,
    state.currentPage === "case-study" &&
      state.visibleSections.includes("case-study") &&
      state.detail.caseStudyTitle === spec.item.title &&
      state.detail.caseStudyNextHref === nextSpec.item.url.local &&
      state.detail.caseStudyListingHref === `/#/${spec.item.category}/`,
    {
      currentPage: state.currentPage,
      visibleSections: state.visibleSections,
      detail: state.detail,
      expected: {
        title: spec.item.title,
        nextHref: nextSpec.item.url.local,
        listingHref: `/#/${spec.item.category}/`,
      },
    },
  );
  assertCleanState(label, state);
  assertOwnership(label, state);
};

const assertArticleState = (label, state, spec, nextSpec) => {
  recordCheck(
    `${label} article detail state`,
    state.currentPage === "article" &&
      state.visibleSections.includes("article") &&
      state.detail.articleTitle === spec.item.title &&
      state.detail.articleNextHref === nextSpec.item.url &&
      state.detail.articleListingHref === "/#/achievements/" &&
      state.title === `${spec.item.title} | iTsawaysu` &&
      state.meta.ogType === "article",
    {
      currentPage: state.currentPage,
      visibleSections: state.visibleSections,
      title: state.title,
      meta: state.meta,
      detail: state.detail,
      expected: {
        title: spec.item.title,
        nextHref: nextSpec.item.url,
      },
    },
  );
  assertCleanState(label, state);
  assertOwnership(label, state);
};

const runCaseStudyDirectRoutes = async (browser, caseSpecs, eventGroups) => {
  const samples = [];

  for (const viewport of DETAIL_VIEWPORTS) {
    const context = await contextForViewport(browser, viewport);
    const events = makeEvents();
    eventGroups.push(events);
    const page = await createPage(context, viewport, events);

    for (const spec of caseSpecs) {
      for (const slug of [spec.slug, spec.alias]) {
        await page.goto(hashUrl(`#/case-study/${slug}`), {
          waitUntil: "domcontentloaded",
        });
        await waitForDetailReady(page, "case-study", spec.item.title);
        const state = await getState(page);
        const nextSpec = caseSpecs[(spec.index + 1) % caseSpecs.length];
        const label = `${viewport.name} case-study direct ${slug}`;
        assertCaseStudyState(label, state, spec, nextSpec);
        samples.push({ viewport: viewport.name, slug, title: state.detail.caseStudyTitle });
      }
    }

    await context.close();
  }

  return samples;
};

const runArticleDirectRoutes = async (browser, articleSpecs, eventGroups) => {
  const samples = [];

  for (const viewport of DETAIL_VIEWPORTS) {
    const context = await contextForViewport(browser, viewport);
    const events = makeEvents();
    eventGroups.push(events);
    const page = await createPage(context, viewport, events);

    for (const spec of articleSpecs) {
      await page.goto(hashUrl(`#/article/${spec.slug}`), {
        waitUntil: "domcontentloaded",
      });
      await waitForDetailReady(page, "article", spec.item.title);
      const state = await getState(page);
      const nextSpec = articleSpecs[(spec.index + 1) % articleSpecs.length];
      const label = `${viewport.name} article direct ${spec.slug}`;
      assertArticleState(label, state, spec, nextSpec);
      samples.push({ viewport: viewport.name, slug: spec.slug, title: state.detail.articleTitle });
    }

    await context.close();
  }

  return samples;
};

const runCaseStudyListingAndFlows = async (browser, caseSpecs, eventGroups) => {
  const listingSamples = [];
  const flowSamples = [];

  for (const viewport of DETAIL_VIEWPORTS) {
    const context = await contextForViewport(browser, viewport);
    const events = makeEvents();
    eventGroups.push(events);
    const page = await createPage(context, viewport, events);

    for (const spec of caseSpecs) {
      const listingTarget = {
        hash: `#/${spec.item.category}/`,
        page: spec.item.category,
        activeNav: spec.item.category,
      };

      await page.goto(hashUrl(listingTarget.hash), { waitUntil: "domcontentloaded" });
      await waitForStaticReady(page, listingTarget);
      await clickLinkBySelector(page, `.card-link[href="${spec.item.url.local}"]`);
      await waitForDetailReady(page, "case-study", spec.item.title);
      let state = await getState(page);
      let nextSpec = caseSpecs[(spec.index + 1) % caseSpecs.length];
      const label = `${viewport.name} case-study listing ${spec.slug}`;
      assertCaseStudyState(label, state, spec, nextSpec);
      listingSamples.push({ viewport: viewport.name, slug: spec.slug });

      await page.goto(hashUrl(`#/case-study/${spec.slug}`), {
        waitUntil: "domcontentloaded",
      });
      await waitForDetailReady(page, "case-study", spec.item.title);
      await clickLinkBySelector(
        page,
        ".case-study__wrap .navigation a:not(.js-back-to-listing)",
      );
      await waitForDetailReady(page, "case-study", nextSpec.item.title);
      state = await getState(page);
      const afterNextLabel = `${viewport.name} case-study next ${spec.slug}`;
      assertCaseStudyState(
        afterNextLabel,
        state,
        nextSpec,
        caseSpecs[(nextSpec.index + 1) % caseSpecs.length],
      );
      await clickLinkBySelector(
        page,
        ".case-study__wrap .navigation .js-back-to-listing",
      );
      const backTarget = {
        hash: `#/${nextSpec.item.category}/`,
        page: nextSpec.item.category,
        activeNav: nextSpec.item.category,
      };
      await waitForStaticReady(page, backTarget);
      state = await getState(page);
      assertStaticState(
        `${viewport.name} case-study back/listing ${spec.slug}`,
        state,
        backTarget,
      );
      flowSamples.push({
        viewport: viewport.name,
        slug: spec.slug,
        nextSlug: nextSpec.slug,
        backPage: backTarget.page,
      });
    }

    await context.close();
  }

  return { listingSamples, flowSamples };
};

const runArticleListingAndFlows = async (browser, articleSpecs, eventGroups) => {
  const listingSamples = [];
  const flowSamples = [];

  for (const viewport of DETAIL_VIEWPORTS) {
    const context = await contextForViewport(browser, viewport);
    const events = makeEvents();
    eventGroups.push(events);
    const page = await createPage(context, viewport, events);

    for (const spec of articleSpecs) {
      await page.goto(hashUrl("#/achievements/"), { waitUntil: "domcontentloaded" });
      await waitForStaticReady(page, {
        hash: "#/achievements/",
        page: "achievements",
        activeNav: "achievements",
      });
      await page.waitForTimeout(1200);
      await clickLinkBySelector(page, `.listing a[href="${spec.item.url}"]`);
      await waitForDetailReady(page, "article", spec.item.title);
      let state = await getState(page);
      let nextSpec = articleSpecs[(spec.index + 1) % articleSpecs.length];
      const label = `${viewport.name} article listing ${spec.slug}`;
      assertArticleState(label, state, spec, nextSpec);
      listingSamples.push({ viewport: viewport.name, slug: spec.slug });

      await page.goto(hashUrl(`#/article/${spec.slug}`), {
        waitUntil: "domcontentloaded",
      });
      await waitForDetailReady(page, "article", spec.item.title);
      await clickLinkBySelector(
        page,
        ".article__wrap .navigation a:not(.js-back-to-listing)",
      );
      await waitForDetailReady(page, "article", nextSpec.item.title);
      state = await getState(page);
      const afterNextLabel = `${viewport.name} article next ${spec.slug}`;
      assertArticleState(
        afterNextLabel,
        state,
        nextSpec,
        articleSpecs[(nextSpec.index + 1) % articleSpecs.length],
      );
      await clickLinkBySelector(
        page,
        ".article__wrap .navigation .js-back-to-listing",
      );
      const listingTarget = {
        hash: "#/achievements/",
        page: "achievements",
        activeNav: "achievements",
      };
      await waitForStaticReady(page, listingTarget);
      state = await getState(page);
      assertStaticState(
        `${viewport.name} article back/listing ${spec.slug}`,
        state,
        listingTarget,
      );
      flowSamples.push({
        viewport: viewport.name,
        slug: spec.slug,
        nextSlug: nextSpec.slug,
      });
    }

    await context.close();
  }

  return { listingSamples, flowSamples };
};

const runSlowDirectRoutes = async (
  browser,
  caseSpecs,
  articleSpecs,
  eventGroups,
) => {
  const specs = [
    {
      label: "case-study-current",
      kind: "case-study",
      hash: `#/case-study/${caseSpecs[0].slug}`,
      title: caseSpecs[0].item.title,
    },
    {
      label: "case-study-legacy-alias",
      kind: "case-study",
      hash: `#/case-study/${caseSpecs[0].alias}`,
      title: caseSpecs[0].item.title,
    },
    {
      label: "article",
      kind: "article",
      hash: `#/article/${articleSpecs[0].slug}`,
      title: articleSpecs[0].item.title,
    },
  ];
  const samples = [];

  for (const spec of specs) {
    const context = await contextForViewport(browser, VIEWPORTS[0]);
    const events = makeEvents();
    eventGroups.push(events);
    const page = await createPage(context, VIEWPORTS[0], events, {
      slowApiDelayMs: 2600,
    });

    await page.goto(hashUrl(spec.hash), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1300);
    const duringDelay = await getState(page);
    await waitForDetailReady(page, spec.kind, spec.title);
    const finalState = await getState(page);
    const probe = await getProbe(page);
    const delays = new Set((probe?.timeouts ?? []).map((entry) => entry.delay));

    recordCheck(
      `slow ${spec.label} direct open keeps 500ms dispatch and detail retry timing`,
      delays.has(500) && delays.has(100) && delays.has(1000),
      {
        timeouts: probe?.timeouts ?? [],
        duringDelay: {
          currentPage: duringDelay.currentPage,
          visibleSections: duringDelay.visibleSections,
        },
      },
    );
    recordCheck(
      `slow ${spec.label} direct open reaches detail`,
      finalState.currentPage === spec.kind &&
        finalState.visibleSections.includes(spec.kind),
      {
        currentPage: finalState.currentPage,
        visibleSections: finalState.visibleSections,
      },
    );
    assertOwnership(`slow ${spec.label}`, finalState);
    samples.push({ spec, duringDelay, finalState, timeouts: probe?.timeouts ?? [] });
    await context.close();
  }

  return samples;
};

const runRapidNavigation = async (
  browser,
  caseSpecs,
  articleSpecs,
  eventGroups,
) => {
  const samples = [];
  const scenarios = [
    {
      label: "article-to-hello",
      from: `#/article/${articleSpecs[0].slug}`,
      fromKind: "article",
      fromTitle: articleSpecs[0].item.title,
      to: { hash: "#/hello/", page: "hello", activeNav: "hello" },
    },
    {
      label: "case-study-to-contact",
      from: `#/case-study/${caseSpecs[0].slug}`,
      fromKind: "case-study",
      fromTitle: caseSpecs[0].item.title,
      to: { hash: "#/contact/", page: "contact", activeNav: "contact" },
    },
    {
      label: "static-to-case-study",
      fromStatic: { hash: "#/coding/", page: "coding", activeNav: "coding" },
      toDetail: {
        hash: `#/case-study/${caseSpecs[0].slug}`,
        kind: "case-study",
        title: caseSpecs[0].item.title,
      },
    },
    {
      label: "static-to-article",
      fromStatic: {
        hash: "#/achievements/",
        page: "achievements",
        activeNav: "achievements",
      },
      toDetail: {
        hash: `#/article/${articleSpecs[0].slug}`,
        kind: "article",
        title: articleSpecs[0].item.title,
      },
    },
    {
      label: "unknown-to-about",
      fromStatic: { hash: "#/unknown-route", page: "error", activeNav: null },
      to: { hash: "#/about/", page: "about", activeNav: "about" },
    },
  ];

  for (const scenario of scenarios) {
    const context = await contextForViewport(browser, VIEWPORTS[0]);
    const events = makeEvents();
    eventGroups.push(events);
    const page = await createPage(context, VIEWPORTS[0], events);

    if (scenario.fromKind) {
      await page.goto(hashUrl(scenario.from), { waitUntil: "domcontentloaded" });
      await waitForDetailReady(page, scenario.fromKind, scenario.fromTitle);
      await page.evaluate((hash) => {
        window.location.hash = hash;
      }, scenario.to.hash);
      await waitForStaticReady(page, scenario.to);
      const state = await getState(page);
      assertStaticState(`rapid ${scenario.label}`, state, scenario.to);
      samples.push({ label: scenario.label, state });
    } else if (scenario.toDetail) {
      await page.goto(hashUrl(scenario.fromStatic.hash), {
        waitUntil: "domcontentloaded",
      });
      await waitForStaticReady(page, scenario.fromStatic);
      await page.evaluate((hash) => {
        window.location.hash = hash;
      }, scenario.toDetail.hash);
      await waitForDetailReady(
        page,
        scenario.toDetail.kind,
        scenario.toDetail.title,
      );
      const state = await getState(page);
      recordCheck(
        `rapid ${scenario.label} reaches detail`,
        state.currentPage === scenario.toDetail.kind &&
          state.visibleSections.includes(scenario.toDetail.kind),
        {
          currentPage: state.currentPage,
          visibleSections: state.visibleSections,
        },
      );
      assertOwnership(`rapid ${scenario.label}`, state);
      samples.push({ label: scenario.label, state });
    } else {
      await page.goto(hashUrl(scenario.fromStatic.hash), {
        waitUntil: "domcontentloaded",
      });
      await waitForStaticReady(page, scenario.fromStatic);
      await page.evaluate((hash) => {
        window.location.hash = hash;
      }, scenario.to.hash);
      await waitForStaticReady(page, scenario.to);
      const state = await getState(page);
      assertStaticState(`rapid ${scenario.label}`, state, scenario.to);
      samples.push({ label: scenario.label, state });
    }

    await context.close();
  }

  return samples;
};

const runMobileMenus = async (browser, eventGroups) => {
  const samples = [];

  for (const viewport of MOBILE_VIEWPORTS) {
    const context = await contextForViewport(browser, viewport);
    const events = makeEvents();
    eventGroups.push(events);
    const page = await createPage(context, viewport, events);

    await page.goto(hashUrl("#/hello/"), { waitUntil: "domcontentloaded" });
    await waitForStaticReady(page, {
      hash: "#/hello/",
      page: "hello",
      activeNav: "hello",
    });
    await page.locator(".header .menu").click();
    await page.waitForTimeout(500);
    const openState = await getState(page);
    await page.locator(".header .menu").click();
    await page.waitForTimeout(500);
    const closedState = await getState(page);

    recordCheck(
      `${viewport.name} mobile menu toggles active classes`,
      openState.menu.menuActive &&
        openState.menu.primaryNavActive &&
        openState.menu.headerWrapActive &&
        !closedState.menu.menuActive &&
        !closedState.menu.primaryNavActive &&
        !closedState.menu.headerWrapActive,
      { openState: openState.menu, closedState: closedState.menu },
    );
    samples.push({ viewport: viewport.name, openState, closedState });
    await context.close();
  }

  return samples;
};

const runInteractionChecks = async (browser, eventGroups) => {
  const context = await contextForViewport(browser, VIEWPORTS[0]);
  const events = makeEvents();
  eventGroups.push(events);
  const page = await createPage(context, VIEWPORTS[0], events);

  await page.goto(hashUrl("#/contact/"), { waitUntil: "domcontentloaded" });
  await waitForStaticReady(page, {
    hash: "#/contact/",
    page: "contact",
    activeNav: "contact",
  });
  await page.locator(".contact .js-wechat-toggle").first().click();
  await page.waitForTimeout(300);
  await page.locator(".contact .js-wechat-copy").first().click();
  await page.waitForTimeout(700);
  const wechat = await getState(page);

  await page.goto(hashUrl("#/coding/"), { waitUntil: "domcontentloaded" });
  await waitForStaticReady(page, {
    hash: "#/coding/",
    page: "coding",
    activeNav: "coding",
  });
  await page.locator(".project-note--coding").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  const projectNote = await getState(page);

  await page.goto(hashUrl("#/achievements/"), { waitUntil: "domcontentloaded" });
  await waitForStaticReady(page, {
    hash: "#/achievements/",
    page: "achievements",
    activeNav: "achievements",
  });
  await page.waitForTimeout(3800);
  const achievements = await getState(page);

  await page.goto(hashUrl("#/about/"), { waitUntil: "domcontentloaded" });
  await waitForStaticReady(page, {
    hash: "#/about/",
    page: "about",
    activeNav: "about",
  });
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    window.dispatchEvent(new Event("scroll"));
  });
  await page.waitForTimeout(2200);
  const about = await getState(page);

  recordCheck(
    "wechat card opens and copy status updates",
    wechat.interactions.wechatOpen === 1 &&
      (wechat.interactions.wechatCopyLabel === "已复制" ||
        wechat.interactions.wechatCopyLabel === "手动复制"),
    {
      wechatOpen: wechat.interactions.wechatOpen,
      wechatCopyLabel: wechat.interactions.wechatCopyLabel,
      wechatCopyStatus: wechat.interactions.wechatCopyStatus,
    },
  );
  recordCheck(
    "project note reveal remains active on coding",
    projectNote.interactions.projectNoteVisible &&
      projectNote.interactions.projectNoteAriaHidden === "false",
    {
      projectNoteVisible: projectNote.interactions.projectNoteVisible,
      ariaHidden: projectNote.interactions.projectNoteAriaHidden,
    },
  );
  recordCheck(
    "achievements delayed refresh keeps route active",
    achievements.visibleSections.includes("achievements") &&
      !achievements.interactions.achievementsInactive &&
      achievements.interactions.nominationsInit > 0 &&
      achievements.interactions.nominationTitleOpacity > 0 &&
      achievements.interactions.nominationPatternOpacity > 0,
    {
      visibleSections: achievements.visibleSections,
      achievementsInactive: achievements.interactions.achievementsInactive,
      nominationsInit: achievements.interactions.nominationsInit,
      nominationTitleOpacity:
        achievements.interactions.nominationTitleOpacity,
      nominationPatternOpacity:
        achievements.interactions.nominationPatternOpacity,
      ribbonTextOpacity: achievements.interactions.ribbonTextOpacity,
      ribbonItemOpacity: achievements.interactions.ribbonItemOpacity,
    },
  );
  recordCheck(
    "about skills and logos scroll state remains visible",
    about.interactions.skillBars.some((bar) => parseFloat(bar.width) > 0) &&
      about.interactions.logoItems.some((item) => item.opacity > 0),
    {
      skillBars: about.interactions.skillBars,
      logoItems: about.interactions.logoItems,
    },
  );

  await context.close();

  return { wechat, projectNote, achievements, about };
};

const runUnknownDetailFallbacks = async (browser, eventGroups) => {
  const context = await contextForViewport(browser, VIEWPORTS[0]);
  const events = makeEvents();
  eventGroups.push(events);
  const page = await createPage(context, VIEWPORTS[0], events);
  const routes = [
    "#/case-study/not-a-real-case-study",
    "#/article/not-a-real-article",
  ];
  const samples = [];

  for (const hash of routes) {
    await page.goto(hashUrl(hash), { waitUntil: "domcontentloaded" });
    await waitForStaticReady(page, {
      hash,
      page: "error",
      activeNav: null,
    });
    const state = await getState(page);
    recordCheck(
      `unknown detail slug ${hash} falls back to error`,
      state.currentPage === "error" && state.visibleSections.includes("error"),
      {
        currentPage: state.currentPage,
        visibleSections: state.visibleSections,
      },
    );
    assertCleanState(`unknown detail slug ${hash}`, state);
    samples.push({ hash, state });
  }

  await context.close();

  return samples;
};

const writeReport = async (result) => {
  await ensureDir(OUT_DIR);
  const sampleState =
    result.samples.staticRoutes[0]?.state ??
    result.samples.caseStudyDirect[0]?.state ??
    null;
  const compactResult = {
    runId: result.runId,
    baseUrl: result.baseUrl,
    checksPassed: result.checks.length - result.failures.length,
    checksFailed: result.failures.length,
    failures: result.failures,
    api: result.api,
    browserEvents: result.browserEvents,
    coverage: {
      viewports: VIEWPORTS.map((viewport) => ({
        name: viewport.name,
        width: viewport.width,
        height: viewport.height,
      })),
      staticRouteCaptures: result.samples.staticRoutes.length,
      caseStudyDirectCaptures: result.samples.caseStudyDirect.length,
      caseStudyListingCaptures: result.samples.caseStudyListing.length,
      caseStudyNextBackFlows: result.samples.caseStudyFlows.length,
      articleDirectCaptures: result.samples.articleDirect.length,
      articleListingCaptures: result.samples.articleListing.length,
      articleNextBackFlows: result.samples.articleFlows.length,
      slowDirectOpens: result.samples.slowDirect.length,
      rapidNavigationScenarios: result.samples.rapidNavigation.length,
      mobileMenuChecks: result.samples.mobileMenus.length,
      caseStudyDirectSlugs: Array.from(
        new Set(result.samples.caseStudyDirect.map((entry) => entry.slug)),
      ),
      articleDirectSlugs: Array.from(
        new Set(result.samples.articleDirect.map((entry) => entry.slug)),
      ),
    },
    ownership: {
      bridgeVersion: sampleState?.bridgeVersion ?? null,
      fallbackTotal: sampleState?.lifecycle?.fallbackTotal ?? null,
      enterCaseStudy: sampleState?.lifecycle?.enterCaseStudy?.owner ?? null,
      enterArticle: sampleState?.lifecycle?.enterArticle?.owner ?? null,
      getCaseStudy: sampleState?.lifecycle?.getCaseStudy?.owner ?? null,
      getArticle: sampleState?.lifecycle?.getArticle?.owner ?? null,
      exitCurrentSlide:
        sampleState?.lifecycle?.exitCurrentSlide?.owner ?? null,
      switchSlide: sampleState?.lifecycle?.switchSlide?.owner ?? null,
      resetSlide: sampleState?.lifecycle?.resetSlide?.owner ?? null,
      detailVisibleAnimation:
        sampleState?.ownership?.detailVisibleAnimation?.owner ?? null,
      detailScrollReveal:
        sampleState?.ownership?.detailScrollReveal?.owner ?? null,
      scrollMonitor: sampleState?.ownership?.scrollMonitor?.owner ?? null,
      lazyload: sampleState?.ownership?.lazyload?.owner ?? null,
    },
  };

  await writeJsonFile(
    path.join(OUT_DIR, "final-broad-regression-verification.json"),
    compactResult,
    { trailingNewline: true },
  );

  const failedChecks = result.checks.filter((check) => !check.passed);
  const lines = [
    "# Final Broad Regression Verification",
    "",
    `- Run id: \`${RUN_ID}\``,
    `- Base URL: \`${BASE_URL}\``,
    `- Checks passed: ${result.checks.length - failedChecks.length}`,
    `- Checks failed: ${failedChecks.length}`,
    `- Viewports: ${VIEWPORTS.map((viewport) => `${viewport.width}x${viewport.height}`).join(", ")}`,
    `- Static route captures: ${result.samples.staticRoutes.length}`,
    `- Case-study direct captures: ${result.samples.caseStudyDirect.length}`,
    `- Case-study listing captures: ${result.samples.caseStudyListing.length}`,
    `- Case-study next/back flows: ${result.samples.caseStudyFlows.length}`,
    `- Article direct captures: ${result.samples.articleDirect.length}`,
    `- Article listing captures: ${result.samples.articleListing.length}`,
    `- Article next/back flows: ${result.samples.articleFlows.length}`,
    `- Slow direct opens: ${result.samples.slowDirect.length}`,
    `- Rapid navigation scenarios: ${result.samples.rapidNavigation.length}`,
    `- Mobile menu checks: ${result.samples.mobileMenus.length}`,
    `- fallbackTotal: ${sampleState?.lifecycle?.fallbackTotal ?? "unknown"}`,
    `- exitCurrentSlide owner: \`${sampleState?.lifecycle?.exitCurrentSlide?.owner ?? "unknown"}\``,
    `- switchSlide owner: \`${sampleState?.lifecycle?.switchSlide?.owner ?? "unknown"}\``,
    `- resetSlide owner: \`${sampleState?.lifecycle?.resetSlide?.owner ?? "unknown"}\``,
    `- getCaseStudy owner: \`${sampleState?.lifecycle?.getCaseStudy?.owner ?? "unknown"}\``,
    `- getArticle owner: \`${sampleState?.lifecycle?.getArticle?.owner ?? "unknown"}\``,
    `- detail visible animation owner: \`${sampleState?.ownership?.detailVisibleAnimation?.owner ?? "unknown"}\``,
    `- detail scroll reveal owner: \`${sampleState?.ownership?.detailScrollReveal?.owner ?? "unknown"}\``,
    `- scrollMonitor owner: \`${sampleState?.ownership?.scrollMonitor?.owner ?? "unknown"}\``,
    `- lazyload owner: \`${sampleState?.ownership?.lazyload?.owner ?? "unknown"}\``,
    `- Unexpected console errors: ${result.browserEvents.unexpectedConsoleErrors}`,
    `- Page errors: ${result.browserEvents.pageErrors}`,
    `- Unexpected request failures: ${result.browserEvents.unexpectedRequestFailures}`,
    `- Same-origin HTTP errors during page navigation: ${result.browserEvents.sameOriginHttpErrors}`,
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
          (failure) =>
            `- ${failure.name}: ${JSON.stringify(failure.details).slice(0, 700)}`,
        )
      : ["- None"]),
    "",
  ];

  await writeTextFile(
    path.join(OUT_DIR, "final-broad-regression-verification.md"),
    `${lines.join("\n")}\n`,
  );
};

const main = async () => {
  const browser = await chromium.launch();
  const requestContext = await browser.newContext();
  const eventGroups = [];

  try {
    const { payload, api } = await runApiAndHttpChecks(requestContext.request);
    const caseSpecs = buildCaseStudySpecs(payload);
    const articleSpecs = buildArticleSpecs(payload);

    recordCheck(
      "case-study specs include current slugs and legacy aliases",
      caseSpecs.length === 6 &&
        caseSpecs.every((spec) => spec.slug && spec.alias),
      { caseSpecs: caseSpecs.map((spec) => ({ slug: spec.slug, alias: spec.alias })) },
    );
    recordCheck(
      "article specs include 15 slugs",
      articleSpecs.length === 15 && articleSpecs.every((spec) => spec.slug),
      { slugs: articleSpecs.map((spec) => spec.slug) },
    );

    const staticRoutes = await runStaticRoutes(browser, eventGroups);
    const caseStudyDirect = await runCaseStudyDirectRoutes(
      browser,
      caseSpecs,
      eventGroups,
    );
    const articleDirect = await runArticleDirectRoutes(
      browser,
      articleSpecs,
      eventGroups,
    );
    const caseStudyNavigation = await runCaseStudyListingAndFlows(
      browser,
      caseSpecs,
      eventGroups,
    );
    const articleNavigation = await runArticleListingAndFlows(
      browser,
      articleSpecs,
      eventGroups,
    );
    const slowDirect = await runSlowDirectRoutes(
      browser,
      caseSpecs,
      articleSpecs,
      eventGroups,
    );
    const rapidNavigation = await runRapidNavigation(
      browser,
      caseSpecs,
      articleSpecs,
      eventGroups,
    );
    const mobileMenus = await runMobileMenus(browser, eventGroups);
    const interactions = await runInteractionChecks(browser, eventGroups);
    const unknownDetailFallbacks = await runUnknownDetailFallbacks(
      browser,
      eventGroups,
    );
    const browserEvents = collectEventSummary(eventGroups);
    const result = {
      runId: RUN_ID,
      baseUrl: BASE_URL,
      checks,
      failures: checks.filter((check) => !check.passed),
      api,
      browserEvents,
      samples: {
        staticRoutes,
        caseStudyDirect,
        articleDirect,
        caseStudyListing: caseStudyNavigation.listingSamples,
        caseStudyFlows: caseStudyNavigation.flowSamples,
        articleListing: articleNavigation.listingSamples,
        articleFlows: articleNavigation.flowSamples,
        slowDirect,
        rapidNavigation,
        mobileMenus,
        interactions,
        unknownDetailFallbacks,
      },
    };

    await writeReport(result);

    if (result.failures.length > 0) {
      console.error(`Final broad regression failed: ${result.failures.length}`);
      console.error(OUT_DIR);
      process.exitCode = 1;
      return;
    }

    console.log(`Final broad regression passed: ${checks.length} checks`);
    console.log(OUT_DIR);
  } finally {
    await requestContext.close();
    await browser.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
