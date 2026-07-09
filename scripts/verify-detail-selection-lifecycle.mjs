import path from "node:path";
import { chromium } from "playwright";
import {
  createBrowserEvents,
  createCheckRecorder,
  createHarnessPage,
  createRunId,
  ensureDir,
  hashUrl as buildHashUrl,
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
  `detail-selection-lifecycle-verification-${RUN_ID}`,
);

const VIEWPORTS = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "mobile-390x844", width: 390, height: 844, isMobile: true, hasTouch: true },
];

const CASE_STUDY_ROUTES = [
  { slug: "cc-switch", index: 0, category: "coding", type: "current" },
  { slug: "open-design", index: 1, category: "coding", type: "current" },
  { slug: "kaku", index: 2, category: "coding", type: "current" },
  { slug: "ai-design-workflow", index: 3, category: "design", type: "current" },
  {
    slug: "design-to-frontend-components",
    index: 4,
    category: "design",
    type: "current",
  },
  { slug: "small-design-system", index: 5, category: "design", type: "current" },
  { slug: "elements", index: 0, category: "coding", type: "legacy" },
  { slug: "physical-web", index: 1, category: "coding", type: "legacy" },
  { slug: "adelphi-digital", index: 2, category: "coding", type: "legacy" },
  { slug: "homepage-beta", index: 3, category: "design", type: "legacy" },
  { slug: "the-jewel-box", index: 4, category: "design", type: "legacy" },
  { slug: "envirobot", index: 5, category: "design", type: "legacy" },
];

const ARTICLE_SLUGS = [
  "using-artificial-intelligence-to-generate-alt-text-on-images",
  "2018-the-year-of-artificial-intelligence",
  "vr-and-ar-in-the-mobile-web",
  "are-qr-codes-making-a-comeback",
  "identifying-objects-using-your-browser-with-tensorflowjs",
  "the-art-of-minimalism-with-ux",
  "baoyu-design-local-agent-design",
  "huashu-design-agent-design-workflow",
  "anthropic-skills-official-examples",
  "sanyuan-skills-production-workflows",
  "service-workers-on-ios",
  "through-the-looking-glass-an-overview-of-visual-recognition",
  "an-app-but-not-progressive-web-apps",
  "what-i-have-learned-from-building-a-chatbot",
  "ux-beacons-and-the-physical-web",
];

const { checks, recordCheck } = createCheckRecorder();

const hashUrl = (hash) => buildHashUrl(BASE_URL, hash);
const caseHash = (slug) => `#/case-study/${slug}`;
const articleHash = (slug) => `#/article/${slug}`;

const makeEvents = createBrowserEvents;

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
  entry.url.includes("analytics.js");

const probeScript = String.raw`
(() => {
  const hideToolbar = () => {
    if (!document.documentElement) return;
    if (document.getElementById("__detail_selection_hide_toolbar")) return;
    const style = document.createElement("style");
    style.id = "__detail_selection_hide_toolbar";
    style.textContent = "astro-dev-toolbar{display:none!important;pointer-events:none!important;visibility:hidden!important;}";
    document.documentElement.appendChild(style);
  };

  hideToolbar();
  document.addEventListener("DOMContentLoaded", hideToolbar);

  if (window.__detailSelectionProbe) return;

  const nativeSetTimeout = window.setTimeout.bind(window);
  const probe = {
    timeouts: [],
  };

  window.setTimeout = function wrappedDetailSelectionSetTimeout(callback, delay, ...args) {
    const normalizedDelay = Number(delay) || 0;
    if (normalizedDelay === 100 || normalizedDelay === 500 || normalizedDelay === 1000) {
      const source =
        typeof callback === "function"
          ? Function.prototype.toString.call(callback)
          : String(callback);
      probe.timeouts.push({
        at: Date.now(),
        delay: normalizedDelay,
        hash: window.location.hash,
        sourceHint: source.replace(/\s+/g, " ").slice(0, 220),
      });
    }

    return nativeSetTimeout(callback, delay, ...args);
  };

  window.__detailSelectionProbe = {
    getState: () => ({ ...probe }),
  };
})();
`;

const createPage = (context, viewport, events, options = {}) =>
  createHarnessPage(context, viewport, events, {
    ...options,
    baseUrl: BASE_URL,
    initScript: probeScript,
    initScriptPlacement: "before-events",
    pageErrorShape: "message",
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

const waitForCurrentPage = async (page, currentPage) => {
  await page.waitForFunction(
    (expectedPage) =>
      window.__homepageLegacyLifecycle?.currentPage === expectedPage,
    currentPage,
    { timeout: 20000 },
  );
};

const waitForDetailTitle = async (page, kind, title) => {
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

  await waitForVisibleSection(page, kind);
  await waitForCurrentPage(page, kind);
  await page.waitForTimeout(1200);
};

const getState = (page) =>
  page.evaluate(() => {
    const bridge = window.__homepageAnimationBridge?.getState?.();
    const lifecycle = bridge?.lifecycle;
    const methodState = (methodName) =>
      lifecycle?.methods?.find((method) => method.method === methodName) ??
      null;
    const activeNav = Array.from(
      document.querySelectorAll(".primary-nav .element-box.active"),
    ).map((element) => element.getAttribute("data-name"));
    const visibleSections = [
      "hello",
      "about",
      "achievements",
      "coding",
      "design",
      "contact",
      "error",
      "case-study",
      "article",
    ].filter((name) => {
      const selector =
        name === "coding" || name === "design"
          ? `.case-studies.${name}`
          : `.${name}`;
      const element = document.querySelector(selector);

      return Boolean(
        element && window.getComputedStyle(element).display !== "none",
      );
    });
    const caseStudyNext = document.querySelector(
      ".case-study__wrap .navigation a:not(.js-back-to-listing)",
    );
    const caseStudyListing = document.querySelector(
      ".case-study__wrap .navigation .js-back-to-listing",
    );
    const articleNext = document.querySelector(
      ".article__wrap .navigation a:not(.js-back-to-listing)",
    );
    const articleListing = document.querySelector(
      ".article__wrap .navigation .js-back-to-listing",
    );

    return {
      url: window.location.href,
      hash: window.location.hash,
      title: document.title,
      visibleSections,
      activeNav,
      forbiddenHashLeak: document.documentElement.outerHTML.includes(
        "/homepage/#/",
      ),
      forbiddenAssetLeak: document.documentElement.outerHTML.includes(
        "/homepage/assets/",
      ),
      lifecycle: {
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
      },
      detailContract: bridge?.detailContract ?? null,
      ownership: {
        detailVisibleAnimation:
          bridge?.animationOwnership?.find(
            (entry) => entry.area === "detail-visible-animation",
          ) ?? null,
        caseStudyRouteEnter:
          bridge?.animationOwnership?.find(
            (entry) => entry.area === "case-study-route-enter",
          ) ?? null,
        articleRouteEnter:
          bridge?.animationOwnership?.find(
            (entry) => entry.area === "article-route-enter",
          ) ?? null,
        detailScrollReveal:
          bridge?.animationOwnership?.find(
            (entry) => entry.area === "detail-scroll-reveal",
          ) ?? null,
        scrollMonitor:
          bridge?.animationOwnership?.find(
            (entry) => entry.area === "scrollMonitor",
          ) ?? null,
        lazyload:
          bridge?.animationOwnership?.find((entry) => entry.area === "lazyload") ??
          null,
      },
      caseStudy: {
        itemTitle:
          window.__homepageLegacyLifecycle?.caseStudyItem?.title ??
          null,
        nextTitle:
          window.__homepageLegacyLifecycle?.nextCaseStudyItem
            ?.title ?? null,
        nextHref: caseStudyNext?.getAttribute("href") ?? null,
        listingHref: caseStudyListing?.getAttribute("href") ?? null,
        text:
          document
            .querySelector(".case-study__wrap")
            ?.textContent?.replace(/\s+/g, " ")
            .trim()
            .slice(0, 300) ?? null,
      },
      article: {
        itemTitle:
          window.__homepageLegacyLifecycle?.articleItem?.title ??
          null,
        nextTitle:
          window.__homepageLegacyLifecycle?.nextArticleItem?.title ??
          null,
        nextHref: articleNext?.getAttribute("href") ?? null,
        listingHref: articleListing?.getAttribute("href") ?? null,
        text:
          document
            .querySelector(".article__wrap")
            ?.textContent?.replace(/\s+/g, " ")
            .trim()
            .slice(0, 300) ?? null,
      },
      probe: window.__detailSelectionProbe?.getState?.() ?? null,
    };
  });

const assertLifecycleOwnership = (label, state) => {
  recordCheck(
    `${label} detail selection lifecycle ownership`,
    state.lifecycle.enterCaseStudy?.owner === "ts-owned" &&
      state.lifecycle.enterArticle?.owner === "ts-owned" &&
      state.lifecycle.getCaseStudy?.owner === "ts-owned" &&
      state.lifecycle.getArticle?.owner === "ts-owned" &&
      state.lifecycle.exitCurrentSlide?.owner === "ts-owned" &&
      state.lifecycle.switchSlide?.owner === "ts-owned" &&
      state.lifecycle.resetSlide?.owner === "ts-owned" &&
      state.lifecycle.fallbackTotal === 0,
    state.lifecycle,
  );
  recordCheck(
    `${label} detail scroll/lazy ownership`,
    state.ownership.detailScrollReveal?.owner === "ts-owned" &&
      state.ownership.scrollMonitor?.owner === "ts-owned" &&
      state.ownership.lazyload?.owner === "ts-owned" &&
      state.detailContract?.scrollReveal?.owner === "ts-owned" &&
      state.detailContract?.lazyload?.owner === "ts-owned",
    {
      ownership: state.ownership,
      detailContract: state.detailContract,
    },
  );
  recordCheck(
    `${label} forbidden output leaks absent`,
    !state.forbiddenHashLeak && !state.forbiddenAssetLeak,
    {
      forbiddenHashLeak: state.forbiddenHashLeak,
      forbiddenAssetLeak: state.forbiddenAssetLeak,
    },
  );
};

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

const runCaseStudyDirect = async (browser, payload, viewport, route) => {
  const context = await browser.newContext();
  const events = makeEvents();
  const page = await createPage(context, viewport, events);
  const expected = payload.caseStudies[route.index];
  const expectedNext = payload.caseStudies[(route.index + 1) % payload.caseStudies.length];
  const label = `${viewport.name} case-study ${route.type} ${route.slug}`;

  await page.goto(hashUrl(caseHash(route.slug)), { waitUntil: "domcontentloaded" });
  await waitForDetailTitle(page, "case-study", expected.title);
  const state = await getState(page);

  recordCheck(
    `${label} maps to expected item and nav targets`,
    state.visibleSections.includes("case-study") &&
      state.caseStudy.itemTitle === expected.title &&
      state.caseStudy.nextHref === expectedNext.url.local &&
      state.caseStudy.listingHref === `/#/${expected.category}/` &&
      state.activeNav.includes(expected.category),
    {
      expected: {
        title: expected.title,
        nextHref: expectedNext.url.local,
        listingHref: `/#/${expected.category}/`,
        activeNav: expected.category,
      },
      actual: state.caseStudy,
      visibleSections: state.visibleSections,
      activeNav: state.activeNav,
    },
  );
  assertLifecycleOwnership(label, state);
  assertEventsClean(label, events);
  await context.close();

  return state;
};

const runArticleDirect = async (browser, payload, viewport, slug, index) => {
  const context = await browser.newContext();
  const events = makeEvents();
  const page = await createPage(context, viewport, events);
  const expected = payload.articles[index];
  const expectedNext = payload.articles[(index + 1) % payload.articles.length];
  const label = `${viewport.name} article ${slug}`;

  await page.goto(hashUrl(articleHash(slug)), { waitUntil: "domcontentloaded" });
  await waitForDetailTitle(page, "article", expected.title);
  const state = await getState(page);

  recordCheck(
    `${label} maps to expected item and nav targets`,
    state.visibleSections.includes("article") &&
      state.article.itemTitle === expected.title &&
      state.article.nextHref === expectedNext.url &&
      state.article.listingHref === "/#/achievements/",
    {
      expected: {
        title: expected.title,
        nextHref: expectedNext.url,
        listingHref: "/#/achievements/",
      },
      actual: state.article,
      visibleSections: state.visibleSections,
    },
  );
  assertLifecycleOwnership(label, state);
  assertEventsClean(label, events);
  await context.close();

  return state;
};

const runSlowDirect = async (browser, payload, route) => {
  const context = await browser.newContext();
  const events = makeEvents();
  const page = await createPage(context, VIEWPORTS[0], events, {
    slowApiDelayMs: 2600,
  });
  const isCaseStudy = route.kind === "case-study";
  const expected = isCaseStudy
    ? payload.caseStudies[route.index]
    : payload.articles[route.index];
  const hash = isCaseStudy ? caseHash(route.slug) : articleHash(route.slug);
  const label = `slow /api/content ${route.kind} ${route.slug}`;

  await page.goto(hashUrl(hash), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1300);
  const duringDelay = await getState(page);
  await waitForDetailTitle(page, route.kind, expected.title);
  const state = await getState(page);
  const timeouts = state.probe?.timeouts ?? [];

  recordCheck(
    `${label} keeps 1000ms payload retry and 100ms switch retry`,
    timeouts.some((entry) => entry.delay === 1000) &&
      timeouts.some((entry) => entry.delay === 100),
    {
      timeouts,
      duringDelay: {
        hash: duringDelay.hash,
        visibleSections: duringDelay.visibleSections,
        caseStudyTitle: duringDelay.caseStudy.itemTitle,
        articleTitle: duringDelay.article.itemTitle,
      },
    },
  );
  recordCheck(
    `${label} eventually renders expected item`,
    isCaseStudy
      ? state.caseStudy.itemTitle === expected.title
      : state.article.itemTitle === expected.title,
    {
      expectedTitle: expected.title,
      caseStudy: state.caseStudy,
      article: state.article,
    },
  );
  assertLifecycleOwnership(label, state);
  assertEventsClean(label, events);
  await context.close();

  return state;
};

const runUnknownFallback = async (browser, hash, label) => {
  const context = await browser.newContext();
  const events = makeEvents();
  const page = await createPage(context, VIEWPORTS[0], events);

  await page.goto(hashUrl(hash), { waitUntil: "domcontentloaded" });
  await waitForVisibleSection(page, "error");
  await waitForCurrentPage(page, "error");
  await page.waitForTimeout(1000);
  const state = await getState(page);

  recordCheck(
    `${label} falls back to error route`,
    state.visibleSections.includes("error"),
    {
      hash: state.hash,
      visibleSections: state.visibleSections,
    },
  );
  assertLifecycleOwnership(label, state);
  assertEventsClean(label, events);
  await context.close();

  return state;
};

const runRepresentativeNavigation = async (browser, payload) => {
  const context = await browser.newContext();
  const events = makeEvents();
  const page = await createPage(context, VIEWPORTS[0], events);

  await page.goto(hashUrl(caseHash("cc-switch")), { waitUntil: "domcontentloaded" });
  await waitForDetailTitle(page, "case-study", payload.caseStudies[0].title);
  await page.click(".case-study__wrap .navigation a:not(.js-back-to-listing)");
  await waitForDetailTitle(page, "case-study", payload.caseStudies[1].title);
  let state = await getState(page);
  recordCheck(
    "case-study next navigation uses circular detail target",
    state.hash === "#/case-study/open-design" &&
      state.caseStudy.itemTitle === payload.caseStudies[1].title,
    { hash: state.hash, caseStudy: state.caseStudy },
  );
  await page.click(".case-study__wrap .navigation .js-back-to-listing");
  await waitForVisibleSection(page, "coding");
  await waitForCurrentPage(page, "coding");
  state = await getState(page);
  recordCheck(
    "case-study listing navigation returns to category listing",
    state.hash === "#/coding/" && state.visibleSections.includes("coding"),
    { hash: state.hash, visibleSections: state.visibleSections },
  );

  await page.goto(hashUrl(articleHash(ARTICLE_SLUGS[0])), {
    waitUntil: "domcontentloaded",
  });
  await waitForDetailTitle(page, "article", payload.articles[0].title);
  await page.click(".article__wrap .navigation a:not(.js-back-to-listing)");
  await waitForDetailTitle(page, "article", payload.articles[1].title);
  state = await getState(page);
  recordCheck(
    "article next navigation uses circular detail target",
    state.hash === `#/article/${ARTICLE_SLUGS[1]}` &&
      state.article.itemTitle === payload.articles[1].title,
    { hash: state.hash, article: state.article },
  );
  await page.click(".article__wrap .navigation .js-back-to-listing");
  await waitForVisibleSection(page, "achievements");
  await waitForCurrentPage(page, "achievements");
  state = await getState(page);
  recordCheck(
    "article listing navigation returns to achievements",
    state.hash === "#/achievements/" &&
      state.visibleSections.includes("achievements"),
    { hash: state.hash, visibleSections: state.visibleSections },
  );
  assertLifecycleOwnership("representative detail navigation", state);
  assertEventsClean("representative detail navigation", events);
  await context.close();
};

const validateApi = async (request) => {
  const canonical = await request.get(`${BASE_URL}/api/content`);
  const compat = await request.get(`${BASE_URL}/homepage/api/content`);
  const canonicalJson = await canonical.json();
  const compatJson = await compat.json();

  recordCheck(
    "content API shape remains compatible",
    canonical.status() === 200 &&
      compat.status() === 200 &&
      canonical.headers()["content-type"]?.includes("application/json") &&
      compat.headers()["content-type"]?.includes("application/json") &&
      canonicalJson.caseStudies.length === 6 &&
      canonicalJson.articles.length === 15 &&
      JSON.stringify(canonicalJson) === JSON.stringify(compatJson),
    {
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
    },
  );

  return canonicalJson;
};

const writeReport = async (result) => {
  await ensureDir(OUT_DIR);
  await writeJsonFile(
    path.join(OUT_DIR, "detail-selection-lifecycle-verification.json"),
    result,
    { trailingNewline: true },
  );

  const failures = checks.filter((check) => !check.passed);
  const sampleState = result.samples.find(Boolean);
  const markdown = [
    "# Detail Selection Lifecycle Verification",
    "",
    `- Run id: \`${RUN_ID}\``,
    `- Base URL: \`${BASE_URL}\``,
    `- Checks passed: ${checks.length - failures.length}`,
    `- Checks failed: ${failures.length}`,
    `- Case study routes: ${CASE_STUDY_ROUTES.length} per viewport`,
    `- Article routes: ${ARTICLE_SLUGS.length} per viewport`,
    `- Slow API direct routes: ${result.slowRoutes.join(", ")}`,
    `- getCaseStudy owner: \`${sampleState?.lifecycle.getCaseStudy?.owner ?? "unknown"}\``,
    `- getArticle owner: \`${sampleState?.lifecycle.getArticle?.owner ?? "unknown"}\``,
    `- enterCaseStudy owner: \`${sampleState?.lifecycle.enterCaseStudy?.owner ?? "unknown"}\``,
    `- enterArticle owner: \`${sampleState?.lifecycle.enterArticle?.owner ?? "unknown"}\``,
    `- exitCurrentSlide owner: \`${sampleState?.lifecycle.exitCurrentSlide?.owner ?? "unknown"}\``,
    `- switchSlide owner: \`${sampleState?.lifecycle.switchSlide?.owner ?? "unknown"}\``,
    `- resetSlide owner: \`${sampleState?.lifecycle.resetSlide?.owner ?? "unknown"}\``,
    `- fallbackTotal: ${sampleState?.lifecycle.fallbackTotal ?? "unknown"}`,
    `- detail scroll reveal owner: \`${sampleState?.ownership.detailScrollReveal?.owner ?? "unknown"}\``,
    `- scrollMonitor owner: \`${sampleState?.ownership.scrollMonitor?.owner ?? "unknown"}\``,
    `- lazyload owner: \`${sampleState?.ownership.lazyload?.owner ?? "unknown"}\``,
    "",
    "## Coverage",
    "",
    `- Case study current slugs: ${CASE_STUDY_ROUTES.filter((route) => route.type === "current")
      .map((route) => `\`${route.slug}\``)
      .join(", ")}.`,
    `- Case study legacy aliases: ${CASE_STUDY_ROUTES.filter((route) => route.type === "legacy")
      .map((route) => `\`${route.slug}\``)
      .join(", ")}.`,
    `- Article slugs: ${ARTICLE_SLUGS.map((slug) => `\`${slug}\``).join(", ")}.`,
    "- Direct opens covered on desktop 1440x900 and mobile 390x844.",
    "- Representative next/listing navigation covered for case study and article.",
    "- Slow `/api/content` direct open covered for case study current slug, legacy alias, and article.",
    "- Unknown case-study and article slugs covered.",
    "- API shape, forbidden leak checks, lifecycle ownership, fallback count, and browser errors covered.",
    "",
    "## Failures",
    "",
    ...(failures.length
      ? failures.map((failure) => `- ${failure.name}: ${JSON.stringify(failure.details)}`)
      : ["- None"]),
    "",
  ].join("\n");

  await writeTextFile(
    path.join(OUT_DIR, "detail-selection-lifecycle-verification.md"),
    markdown,
  );
};

const main = async () => {
  const browser = await chromium.launch();
  const requestContext = await chromium.launch().then(async (requestBrowser) => {
    const context = await requestBrowser.newContext();
    return { requestBrowser, context };
  });

  try {
    const payload = await validateApi(requestContext.context.request);
    const samples = [];

    for (const viewport of VIEWPORTS) {
      for (const route of CASE_STUDY_ROUTES) {
        samples.push(await runCaseStudyDirect(browser, payload, viewport, route));
      }

      for (const [index, slug] of ARTICLE_SLUGS.entries()) {
        samples.push(await runArticleDirect(browser, payload, viewport, slug, index));
      }
    }

    await runRepresentativeNavigation(browser, payload);

    const slowRoutes = [
      { kind: "case-study", slug: "cc-switch", index: 0 },
      { kind: "case-study", slug: "elements", index: 0 },
      { kind: "article", slug: ARTICLE_SLUGS[0], index: 0 },
    ];

    for (const route of slowRoutes) {
      samples.push(await runSlowDirect(browser, payload, route));
    }

    samples.push(
      await runUnknownFallback(
        browser,
        "#/case-study/not-real",
        "unknown case-study slug",
      ),
    );
    samples.push(
      await runUnknownFallback(
        browser,
        "#/article/not-real",
        "unknown article slug",
      ),
    );

    const result = {
      runId: RUN_ID,
      baseUrl: BASE_URL,
      checks,
      failures: checks.filter((check) => !check.passed),
      samples,
      slowRoutes: slowRoutes.map((route) => `${route.kind}:${route.slug}`),
    };

    await writeReport(result);

    if (result.failures.length > 0) {
      console.error(
        `Detail selection lifecycle verification failed: ${result.failures.length}`,
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      `Detail selection lifecycle verification passed: ${checks.length} checks`,
    );
    console.log(OUT_DIR);
  } finally {
    await requestContext.context.close();
    await requestContext.requestBrowser.close();
    await browser.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
