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
const RUN_ID = createRunId();
const MODE = process.argv.includes("--baseline") ? "baseline" : "verification";
const EXPECTED_ARTICLE_OWNER = "ts-owned";
const OUT_DIR = path.join(
  TASK_DIR,
  "research",
  `enter-article-route-enter-${MODE}-${RUN_ID}`,
);
const SCREENSHOT_DIR = path.join(OUT_DIR, "screenshots");

const DESKTOP = { name: "desktop-1440x900", width: 1440, height: 900 };
const MOBILE = {
  name: "mobile-390x844",
  width: 390,
  height: 844,
  isMobile: true,
  hasTouch: true,
};

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

const REPRESENTATIVE_ARTICLE_SLUGS = [
  ARTICLE_SLUGS[0],
  ARTICLE_SLUGS[4],
  ARTICLE_SLUGS[14],
];

const STATIC_ROUTES = [
  ["#/hello/", "hello"],
  ["#/about/", "about"],
  ["#/achievements/", "achievements"],
  ["#/coding/", "coding"],
  ["#/design/", "design"],
  ["#/contact/", "contact"],
  ["#/unknown-route", "error"],
];

const CASE_STUDY_REGRESSION_HASHES = [
  "#/case-study/cc-switch",
  "#/case-study/elements",
];

const RAPID_NAV_TARGETS = [
  ["#/hello/", "hello"],
  ["#/achievements/", "achievements"],
  ["#/coding/", "coding"],
  ["#/unknown-route", "error"],
];

const hideToolbarScript = `
(() => {
  const hide = () => {
    if (!document.documentElement) return;
    if (document.getElementById("__enter_article_hide_toolbar")) return;
    const style = document.createElement("style");
    style.id = "__enter_article_hide_toolbar";
    style.textContent = "astro-dev-toolbar{display:none!important;pointer-events:none!important;visibility:hidden!important;}";
    document.documentElement.appendChild(style);
  };
  hide();
  document.addEventListener("DOMContentLoaded", hide);
})();
`;

const { checks, recordCheck } = createCheckRecorder();

const hashUrl = (hash) => buildHashUrl(BASE_URL, hash);
const articleHash = (slug) => `#/article/${slug}`;
const articleUrl = (slug) => `/#/article/${slug}`;

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

const makeBrowserEvents = createBrowserEvents;

const createPage = (context, viewport, events, options = {}) =>
  createHarnessPage(context, viewport, events, {
    ...options,
    baseUrl: BASE_URL,
    includeResponseStatusText: true,
    initScript: { content: hideToolbarScript },
  });

const getLifecycleMethod = (state, methodName) =>
  state.lifecycle?.methods?.find((method) => method.method === methodName) ??
  null;

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

    const bridge = window.__homepageAnimationBridge?.getState();
    const lifecycle = bridge?.lifecycle;
    const methodState = (methodName) =>
      lifecycle?.methods?.find((method) => method.method === methodName) ??
      null;
    const ownership = (area) =>
      bridge?.animationOwnership?.find((entry) => entry.area === area) ?? null;
    const legacyLifecycle = window.__homepageLegacyLifecycle;
    const articleTitleText = document.querySelector(".article h1 .text");
    const articleBar = document.querySelector(".article .bar");
    const articleIcon = document.querySelector(".article h1 .icon");
    const articleWrap = document.querySelector(".article__wrap");
    const articleSections = Array.from(
      document.querySelectorAll(".article__section"),
    );
    const articleRevealTargets = Array.from(
      document.querySelectorAll(
        ".article__section h2, .article__section h3, .article__section p, .article__section code, .article__section li, .article__section img, .article__section .cta",
      ),
    );
    const activeNav = Array.from(
      document.querySelectorAll(".primary-nav .element-box.active"),
    ).map((element) => element.getAttribute("data-name"));

    return {
      url: window.location.href,
      hash: window.location.hash,
      title: document.title,
      ogTitle:
        document
          .querySelector('meta[property="og:title"]')
          ?.getAttribute("content") ?? null,
      ogType:
        document
          .querySelector('meta[property="og:type"]')
          ?.getAttribute("content") ?? null,
      twitterTitle:
        document
          .querySelector('meta[name="twitter:title"]')
          ?.getAttribute("content") ?? null,
      visibleSections,
      activeNav,
      menuActive:
        document.querySelector(".header .menu")?.classList.contains("active") ??
        false,
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
      nominationsInit: document.querySelectorAll(
        ".achievements .nominations li.init",
      ).length,
      wechatOpen: document.querySelectorAll(".contact .wechat-item.is-open")
        .length,
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
      lifecycle: {
        enterCaseStudy: methodState("enterCaseStudy"),
        enterArticle: methodState("enterArticle"),
        exitCurrentSlide: methodState("exitCurrentSlide"),
        switchSlide: methodState("switchSlide"),
        resetSlide: methodState("resetSlide"),
        getCaseStudy: methodState("getCaseStudy"),
        getArticle: methodState("getArticle"),
        fallbackTotal:
          lifecycle?.methods?.reduce(
            (total, method) => total + method.fallbackCount,
            0,
          ) ?? null,
      },
      ownership: {
        detailVisibleAnimation: ownership("detail-visible-animation"),
        caseStudyRouteEnter: ownership("case-study-route-enter"),
        articleRouteEnter: ownership("article-route-enter"),
        detailScrollReveal: ownership("detail-scroll-reveal"),
        scrollMonitor: ownership("scrollMonitor"),
        lazyload: ownership("lazyload"),
      },
      detailContract: bridge?.detailContract ?? null,
      titleRevealHelper: bridge?.titleRevealHelper ?? null,
      timings: window.__homepageAnimationBridge?.getTimings?.() ?? null,
      article: {
        title: legacyLifecycle?.articleItem?.title ?? null,
        nextTitle: legacyLifecycle?.nextArticleItem?.title ?? null,
        heading: articleTitleText?.textContent?.replace(/\s+/g, " ").trim() ?? null,
        headingHasGlitch: articleTitleText?.classList.contains("glitch") ?? false,
        barWidth: articleBar ? window.getComputedStyle(articleBar).width : null,
        barOpacity: articleBar ? window.getComputedStyle(articleBar).opacity : null,
        iconOpacity: articleIcon
          ? window.getComputedStyle(articleIcon).opacity
          : null,
        wrapText:
          articleWrap?.textContent?.replace(/\s+/g, " ").trim().slice(0, 240) ??
          null,
        wrapTextLength:
          articleWrap?.textContent?.replace(/\s+/g, " ").trim().length ?? 0,
        sectionCount: articleSections.length,
        revealVisibleCount: articleRevealTargets.filter(
          (element) => Number(window.getComputedStyle(element).opacity) > 0.01,
        ).length,
        lazyElements: document.querySelectorAll(".article .lazy").length,
        lazyWithDataOriginal: document.querySelectorAll(
          ".article .lazy[data-original]",
        ).length,
        lazyImagesMissingSrc: Array.from(
          document.querySelectorAll(".article img.lazy[data-original]"),
        ).filter((element) => !element.getAttribute("src")).length,
        nextHref:
          document
            .querySelector(".article__wrap .navigation a:not(.js-back-to-listing)")
            ?.getAttribute("href") ?? null,
        listingHref:
          document
            .querySelector(".article__wrap .navigation .js-back-to-listing")
            ?.getAttribute("href") ?? null,
      },
      caseStudy: {
        heading:
          document
            .querySelector(".case-study h1 .text")
            ?.textContent?.replace(/\s+/g, " ")
            .trim() ?? null,
        title: legacyLifecycle?.caseStudyItem?.title ?? null,
      },
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

const waitForArticleReady = async (page, expectedTitle) => {
  await waitForVisibleSection(page, "article");
  await page.waitForFunction(
    (title) => {
      const wrapText = document.querySelector(".article__wrap")?.textContent ?? "";
      const itemTitle =
        window.__homepageLegacyLifecycle?.articleItem?.title ?? "";

      return wrapText.trim().length > 40 && itemTitle === title;
    },
    expectedTitle,
    { timeout: 30000 },
  );
  await page.waitForFunction(
    (title) => {
      const heading = document.querySelector(".article h1 .text")?.textContent ?? "";

      return heading.includes(title);
    },
    expectedTitle,
    { timeout: 10000 },
  );
  await page.waitForTimeout(500);
};

const waitForCaseStudyReady = async (page) => {
  await waitForVisibleSection(page, "case-study");
  await page.waitForFunction(
    () =>
      Boolean(
        document.querySelector(".case-study__wrap")?.textContent?.trim()
          .length > 40,
      ),
    null,
    { timeout: 25000 },
  );
  await page.waitForTimeout(1600);
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

const articleFromSlug = (payload, slug) =>
  payload.articles.find((article) => article.url === articleUrl(slug));

const articleIndexFromSlug = (payload, slug) =>
  payload.articles.findIndex((article) => article.url === articleUrl(slug));

const expectedForArticle = (payload, slug) => {
  const index = articleIndexFromSlug(payload, slug);
  const item = payload.articles[index];
  const next = payload.articles[(index + 1) % payload.articles.length];

  return { index, item, next };
};

const assertArticleState = (prefix, state, expected, options = {}) => {
  recordCheck(`${prefix} visible article section`, state.visibleSections.includes("article"), {
    visibleSections: state.visibleSections,
    hash: state.hash,
  });
  recordCheck(
    `${prefix} renders expected article title/content`,
    state.article.title === expected.item.title &&
      state.article.wrapTextLength > 40,
    {
      expectedTitle: expected.item.title,
      title: state.article.title,
      heading: state.article.heading,
      wrapText: state.article.wrapText,
      wrapTextLength: state.article.wrapTextLength,
    },
  );
  recordCheck(
    `${prefix} metadata is article-specific`,
    state.title === `${expected.item.title} | iTsawaysu` &&
      state.ogTitle === `${expected.item.title} | iTsawaysu` &&
      state.twitterTitle === `${expected.item.title} | iTsawaysu` &&
      state.ogType === "article",
    {
      title: state.title,
      ogTitle: state.ogTitle,
      twitterTitle: state.twitterTitle,
      ogType: state.ogType,
    },
  );
  recordCheck(
    `${prefix} next/listing hrefs remain correct`,
    state.article.nextHref === expected.next.url &&
      state.article.listingHref === "/#/achievements/",
    {
      expectedNext: expected.next.url,
      actualNext: state.article.nextHref,
      expectedListing: "/#/achievements/",
      actualListing: state.article.listingHref,
    },
  );
  recordCheck(
    `${prefix} route-enter animation stable state matches legacy`,
    Boolean(state.article.heading) &&
      state.article.headingHasGlitch &&
      Number.parseFloat(state.article.iconOpacity ?? "0") > 0.99 &&
      Number.parseFloat(state.article.barWidth ?? "0") > 0,
    {
      heading: state.article.heading,
      headingHasGlitch: state.article.headingHasGlitch,
      iconOpacity: state.article.iconOpacity,
      barWidth: state.article.barWidth,
    },
  );
  recordCheck(
    `${prefix} enterArticle owner/fallback matches ${EXPECTED_ARTICLE_OWNER}`,
    state.lifecycle.enterArticle?.owner === EXPECTED_ARTICLE_OWNER &&
      state.lifecycle.enterArticle?.fallbackCount === 0,
    {
      enterArticle: state.lifecycle.enterArticle,
      expectedOwner: EXPECTED_ARTICLE_OWNER,
    },
  );
  recordCheck(
    `${prefix} exit/switch/reset/getArticle remain ts-owned`,
    state.lifecycle.exitCurrentSlide?.owner === "ts-owned" &&
      state.lifecycle.switchSlide?.owner === "ts-owned" &&
      state.lifecycle.resetSlide?.owner === "ts-owned" &&
      state.lifecycle.getArticle?.owner === "ts-owned",
    {
      exitCurrentSlide: state.lifecycle.exitCurrentSlide,
      switchSlide: state.lifecycle.switchSlide,
      resetSlide: state.lifecycle.resetSlide,
      getArticle: state.lifecycle.getArticle,
    },
  );
  recordCheck(
    `${prefix} case-study ownership remains ts-owned`,
    state.lifecycle.enterCaseStudy?.owner === "ts-owned" &&
      state.lifecycle.enterCaseStudy?.fallbackCount === 0,
    {
      enterCaseStudy: state.lifecycle.enterCaseStudy,
    },
  );
  recordCheck(
    `${prefix} detail scroll/lazy ownership remains ts-owned`,
    state.detailContract?.scrollReveal?.owner === "ts-owned" &&
      state.detailContract?.scrollReveal?.scrollMonitorOwner === "ts-owned" &&
      state.detailContract?.lazyload?.owner === "ts-owned" &&
      state.ownership.detailScrollReveal?.owner === "ts-owned" &&
      state.ownership.scrollMonitor?.owner === "ts-owned" &&
      state.ownership.lazyload?.owner === "ts-owned",
    {
      detailContract: state.detailContract,
      ownership: state.ownership,
    },
  );
  recordCheck(
    `${prefix} no forbidden browser output leaks`,
    !state.forbiddenHashLeak && !state.forbiddenAssetLeak,
    {
      forbiddenHashLeak: state.forbiddenHashLeak,
      forbiddenAssetLeak: state.forbiddenAssetLeak,
    },
  );

  if (options.expectScrollReveal) {
    recordCheck(
      `${prefix} mobile scroll/reveal/lazyload state remains active`,
      state.article.sectionCount > 0 &&
        state.article.revealVisibleCount > 0 &&
        state.article.lazyImagesMissingSrc === 0,
      {
        sectionCount: state.article.sectionCount,
        revealVisibleCount: state.article.revealVisibleCount,
        lazyElements: state.article.lazyElements,
        lazyWithDataOriginal: state.article.lazyWithDataOriginal,
        lazyImagesMissingSrc: state.article.lazyImagesMissingSrc,
      },
    );
  }
};

const screenshot = async (page, name) => {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
};

const runArticleDirect = async (browser, payload, slug, viewport, options = {}) => {
  const expected = expectedForArticle(payload, slug);
  const context = await browser.newContext({
    isMobile: Boolean(viewport.isMobile),
    hasTouch: Boolean(viewport.hasTouch),
  });
  const events = makeBrowserEvents();
  const page = await createPage(context, viewport, events, options);

  await page.goto(hashUrl(articleHash(slug)), { waitUntil: "domcontentloaded" });
  await waitForArticleReady(page, expected.item.title);

  if (options.scrollDetail) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      window.dispatchEvent(new Event("scroll"));
    });
    await page.waitForTimeout(1500);
  }

  const state = await getPageState(page);
  const prefix = `${viewport.name} direct article ${slug}`;
  assertArticleState(prefix, state, expected, {
    expectScrollReveal: Boolean(options.scrollDetail),
  });
  await screenshot(
    page,
    `${viewport.width}x${viewport.height}-article-direct-${slug}${
      options.scrollDetail ? "-scrolled" : ""
    }`,
  );

  await context.close();

  return { slug, viewport: viewport.name, state, events };
};

const runListingEnter = async (browser, payload, slug, viewport) => {
  const expected = expectedForArticle(payload, slug);
  const context = await browser.newContext({
    isMobile: Boolean(viewport.isMobile),
    hasTouch: Boolean(viewport.hasTouch),
  });
  const events = makeBrowserEvents();
  const page = await createPage(context, viewport, events);

  await page.goto(hashUrl("#/achievements/"), { waitUntil: "domcontentloaded" });
  await waitForVisibleSection(page, "achievements");
  await page.waitForFunction(
    (href) => Boolean(document.querySelector(`.listing a[href="${href}"]`)),
    expected.item.url,
    { timeout: 20000 },
  );
  await clickLinkBySelector(page, `.listing a[href="${expected.item.url}"]`);
  await waitForArticleReady(page, expected.item.title);

  const state = await getPageState(page);
  const prefix = `${viewport.name} achievements listing -> article ${slug}`;
  assertArticleState(prefix, state, expected);
  recordCheck(`${prefix} reached expected hash`, state.hash === articleHash(slug), {
    expectedHash: articleHash(slug),
    actualHash: state.hash,
  });
  await screenshot(page, `${viewport.width}x${viewport.height}-article-listing-${slug}`);

  await context.close();

  return { slug, viewport: viewport.name, state, events };
};

const runNextBackFlow = async (browser, payload, viewport) => {
  const slug = ARTICLE_SLUGS[0];
  const expected = expectedForArticle(payload, slug);
  const nextSlug = expected.next.url.replace("/#/article/", "");
  const nextExpected = expectedForArticle(payload, nextSlug);
  const context = await browser.newContext({
    isMobile: Boolean(viewport.isMobile),
    hasTouch: Boolean(viewport.hasTouch),
  });
  const events = makeBrowserEvents();
  const page = await createPage(context, viewport, events);

  await page.goto(hashUrl(articleHash(slug)), { waitUntil: "domcontentloaded" });
  await waitForArticleReady(page, expected.item.title);
  const initial = await getPageState(page);
  await screenshot(page, `${viewport.width}x${viewport.height}-article-flow-initial`);

  await clickLinkBySelector(
    page,
    ".article__wrap .navigation a:not(.js-back-to-listing)",
  );
  await waitForArticleReady(page, expected.next.title);
  const afterNext = await getPageState(page);
  await screenshot(page, `${viewport.width}x${viewport.height}-article-flow-after-next`);

  await clickLinkBySelector(
    page,
    ".article__wrap .navigation .js-back-to-listing",
  );
  await waitForVisibleSection(page, "achievements");
  await page.waitForTimeout(1400);
  const afterListing = await getPageState(page);
  await screenshot(
    page,
    `${viewport.width}x${viewport.height}-article-flow-after-back-listing`,
  );

  assertArticleState(`${viewport.name} article flow initial`, initial, expected);
  assertArticleState(`${viewport.name} article flow after next`, afterNext, nextExpected);
  recordCheck(
    `${viewport.name} article back/listing returns to achievements`,
    afterListing.hash === "#/achievements/" &&
      afterListing.visibleSections.includes("achievements"),
    {
      expectedHash: "#/achievements/",
      actualHash: afterListing.hash,
      visibleSections: afterListing.visibleSections,
    },
  );

  await context.close();

  return { viewport: viewport.name, initial, afterNext, afterListing, events };
};

const runCircularNextCheck = async (browser, payload) => {
  const slug = ARTICLE_SLUGS[ARTICLE_SLUGS.length - 1];
  const expected = expectedForArticle(payload, slug);
  const context = await browser.newContext();
  const events = makeBrowserEvents();
  const page = await createPage(context, DESKTOP, events);

  await page.goto(hashUrl(articleHash(slug)), { waitUntil: "domcontentloaded" });
  await waitForArticleReady(page, expected.item.title);
  const state = await getPageState(page);
  recordCheck(
    "article last item next href remains circular",
    state.article.nextHref === payload.articles[0].url,
    {
      lastArticle: expected.item.title,
      expectedNext: payload.articles[0].url,
      actualNext: state.article.nextHref,
    },
  );

  await context.close();

  return { slug, state, events };
};

const runSlowApiDirect = async (browser, payload) => {
  const slug = ARTICLE_SLUGS[0];
  const expected = expectedForArticle(payload, slug);
  const context = await browser.newContext();
  const events = makeBrowserEvents();
  const page = await createPage(context, DESKTOP, events, {
    slowApiDelayMs: 1800,
  });

  await page.goto(hashUrl(articleHash(slug)), { waitUntil: "domcontentloaded" });
  await waitForArticleReady(page, expected.item.title);
  const state = await getPageState(page);
  assertArticleState("slow /api/content article direct open", state, expected);
  recordCheck(
    "slow /api/content direct open keeps fallback zero",
    state.lifecycle.enterArticle?.fallbackCount === 0 &&
      state.lifecycle.switchSlide?.fallbackCount === 0,
    {
      enterArticle: state.lifecycle.enterArticle,
      switchSlide: state.lifecycle.switchSlide,
    },
  );

  await context.close();

  return { slug, state, events };
};

const runRapidNavigation = async (browser, payload, targetHash, targetSection) => {
  const slug = ARTICLE_SLUGS[0];
  const expected = expectedForArticle(payload, slug);
  const context = await browser.newContext();
  const events = makeBrowserEvents();
  const page = await createPage(context, DESKTOP, events);

  await page.goto(hashUrl(articleHash(slug)), { waitUntil: "domcontentloaded" });
  await waitForArticleReady(page, expected.item.title);
  await page.evaluate((hash) => {
    window.location.hash = hash;
  }, targetHash);
  await waitForVisibleSection(page, targetSection);
  await page.waitForTimeout(1400);
  const state = await getPageState(page);

  recordCheck(
    `rapid article detail -> ${targetHash} settles on target`,
    state.hash === targetHash && state.visibleSections.includes(targetSection),
    {
      hash: state.hash,
      visibleSections: state.visibleSections,
      targetSection,
    },
  );
  recordCheck(
    `rapid article detail -> ${targetHash} keeps watcher/fallback stable`,
    state.lifecycle.enterArticle?.fallbackCount === 0 &&
      state.lifecycle.fallbackTotal === 0,
    {
      lifecycle: state.lifecycle,
    },
  );

  await context.close();

  return { targetHash, state, events };
};

const runCaseStudyRegression = async (browser, hash) => {
  const context = await browser.newContext();
  const events = makeBrowserEvents();
  const page = await createPage(context, DESKTOP, events);

  await page.goto(hashUrl(hash), { waitUntil: "domcontentloaded" });
  await waitForCaseStudyReady(page);
  const state = await getPageState(page);

  recordCheck(
    `case-study regression ${hash} remains ts-owned and visible`,
    state.visibleSections.includes("case-study") &&
      state.lifecycle.enterCaseStudy?.owner === "ts-owned" &&
      state.lifecycle.enterCaseStudy?.fallbackCount === 0 &&
      Boolean(state.caseStudy.title),
    {
      visibleSections: state.visibleSections,
      enterCaseStudy: state.lifecycle.enterCaseStudy,
      heading: state.caseStudy.heading,
      title: state.caseStudy.title,
    },
  );

  await context.close();

  return { hash, state, events };
};

const runStaticRoutes = async (browser) => {
  const context = await browser.newContext();
  const events = makeBrowserEvents();
  const page = await createPage(context, DESKTOP, events);
  const captures = [];

  for (const [hash, section] of STATIC_ROUTES) {
    await page.goto(hashUrl(hash), { waitUntil: "domcontentloaded" });
    await waitForVisibleSection(page, section);
    await page.waitForTimeout(section === "achievements" ? 3800 : 1600);
    const state = await getPageState(page);
    captures.push({ hash, section, state });
    recordCheck(`static regression ${hash} shows ${section}`, state.visibleSections.includes(section), {
      visibleSections: state.visibleSections,
      activeNav: state.activeNav,
    });
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
  await page.waitForTimeout(700);
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
    `${BASE_URL}/assets/homepage/__enter-article-missing__.png`,
  );
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
      normalizedBodyStart: notFoundText.slice(0, 140),
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
    "no same-origin HTTP errors during page navigation",
    allSameOriginHttpErrors.length === 0,
    { sameOriginHttpErrors: allSameOriginHttpErrors },
  );

  return {
    consoleErrors: allConsole.length,
    unexpectedConsoleErrors: unexpectedConsole.length,
    pageErrorCount: allPageErrors.length,
    requestFailureCount: allRequestFailures.length,
    unexpectedRequestFailures: unexpectedRequestFailures.length,
    sameOriginHttpErrorCount: allSameOriginHttpErrors.length,
    console: allConsole,
    pageErrors: allPageErrors,
    requestFailures: allRequestFailures,
    sameOriginHttpErrors: allSameOriginHttpErrors,
  };
};

const getAnimationParams = (sampleState) => ({
  articleMetadata: {
    titleFormat: "<article title> | iTsawaysu",
    ogType: "article",
    ogDescription: "",
    twitterDescription: "",
  },
  titleReveal: {
    owner: sampleState?.detailContract?.titleBaffleOwner ?? "legacy-reused",
    baffleInstance: "bArticle",
    textPrefix: "// 文章：",
    durationMs: sampleState?.timings?.titleRevealDurationMs ?? 750,
    delayMs: sampleState?.timings?.titleRevealDelayMs ?? 750,
    glitchClass: ".article h1 .text.glitch",
  },
  bar: {
    selector: ".article .bar",
    width: "100%",
    durationSeconds: 0.5,
    ease: "Expo.easeOut / expo.out",
  },
  icon: {
    selector: ".article h1 .icon",
    opacity: 1,
    durationSeconds: 0.5,
    ease: "Expo.easeOut / expo.out",
  },
  paragraphAndContentReveal: {
    owner: "legacy detail scroll reveal",
    createMethod: "createArticleScrollMonitor",
    destroyMethod: "destroyArticleScrollMonitor",
    watcherThresholdPx: -100,
    revealTweenSeconds: 0.5,
    targets:
      sampleState?.detailContract?.selectors?.article?.revealTargets ?? [],
  },
});

const writeSummary = async (result) => {
  const failedChecks = result.checks.filter((check) => !check.passed);
  const sampleState = result.directArticles[0]?.state;

  const lines = [
    `# Enter Article Route Enter ${MODE === "baseline" ? "Baseline" : "Verification"}`,
    "",
    `- Run id: \`${result.runId}\``,
    `- Mode: \`${MODE}\``,
    `- Base URL: \`${BASE_URL}\``,
    `- Checks passed: ${result.checks.length - failedChecks.length}`,
    `- Checks failed: ${failedChecks.length}`,
    `- Direct article routes: ${result.directArticles
      .map((entry) => `${entry.viewport}:#/article/${entry.slug}`)
      .join(", ")}`,
    `- Listing enters: ${result.listingEnters
      .map((entry) => `${entry.viewport}:#/article/${entry.slug}`)
      .join(", ")}`,
    `- Slow API direct routes: ${result.slowDirectArticles
      .map((entry) => `#/article/${entry.slug}`)
      .join(", ")}`,
    `- Rapid navigation targets: ${result.rapidNavigation
      .map((entry) => entry.targetHash)
      .join(", ")}`,
    `- enterArticle owner: \`${sampleState?.lifecycle.enterArticle?.owner ?? "unknown"}\``,
    `- enterArticle fallbackCount: ${
      sampleState?.lifecycle.enterArticle?.fallbackCount ?? "unknown"
    }`,
    `- enterCaseStudy owner: \`${sampleState?.lifecycle.enterCaseStudy?.owner ?? "unknown"}\``,
    `- exitCurrentSlide owner: \`${sampleState?.lifecycle.exitCurrentSlide?.owner ?? "unknown"}\``,
    `- switchSlide owner: \`${sampleState?.lifecycle.switchSlide?.owner ?? "unknown"}\``,
    `- resetSlide owner: \`${sampleState?.lifecycle.resetSlide?.owner ?? "unknown"}\``,
    `- getArticle owner: \`${sampleState?.lifecycle.getArticle?.owner ?? "unknown"}\``,
    `- detail visible animation owner: \`${sampleState?.ownership.detailVisibleAnimation?.owner ?? "unknown"}\``,
    `- case-study visible animation owner: \`${sampleState?.ownership.caseStudyRouteEnter?.owner ?? "unknown"}\``,
    `- article visible animation owner: \`${sampleState?.ownership.articleRouteEnter?.owner ?? "unknown"}\``,
    `- detail scroll reveal owner: \`${sampleState?.ownership.detailScrollReveal?.owner ?? "unknown"}\``,
    `- scrollMonitor owner: \`${sampleState?.ownership.scrollMonitor?.owner ?? "unknown"}\``,
    `- lazyload owner: \`${sampleState?.ownership.lazyload?.owner ?? "unknown"}\``,
    `- Console errors: ${result.events.consoleErrors}`,
    `- Unexpected console errors: ${result.events.unexpectedConsoleErrors}`,
    `- Page errors: ${result.events.pageErrorCount}`,
    `- Request failures: ${result.events.requestFailureCount}`,
    `- Unexpected request failures: ${result.events.unexpectedRequestFailures}`,
    `- Same-origin HTTP errors during page navigation: ${result.events.sameOriginHttpErrorCount}`,
    "",
    "## Article Route-Enter Animation Parameters",
    "",
    "```json",
    JSON.stringify(result.animationParams, null, 2),
    "```",
    "",
    "## Article Behavior Covered",
    "",
    `- Article slugs: ${ARTICLE_SLUGS.map((slug) => `\`${slug}\``).join(", ")}.`,
    "- Direct open covered for all 15 article slugs on desktop 1440x900 and mobile 390x844.",
    "- Achievements listing enter covered for 3 representative article slugs on both desktop and mobile.",
    "- Next/back/listing covered on desktop and mobile.",
    "- Last article circular next index covered.",
    "- Slow `/api/content` direct open covered for the first article.",
    "- Mobile scroll/reveal/lazyload covered for the first article.",
    "- Rapid article-detail navigation covered for hello, achievements, coding, and unknown.",
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
    failedChecks.length === 0
      ? "- None"
      : failedChecks
          .map(
            (check) =>
              `- ${check.name}: ${JSON.stringify(check.details, null, 2)}`,
          )
          .join("\n"),
    "",
  ];

  await writeTextFile(
    path.join(
      OUT_DIR,
      `enter-article-route-enter-${MODE}.md`,
    ),
    lines.join("\n"),
  );
};

const main = async () => {
  await ensureDir(SCREENSHOT_DIR);
  const browser = await chromium.launch();
  const api = await runApiAndHttpChecks(browser);
  const payload = api.payload;

  for (const slug of ARTICLE_SLUGS) {
    recordCheck(`payload contains article ${slug}`, Boolean(articleFromSlug(payload, slug)), {
      slug,
    });
  }

  const directArticles = [];
  for (const viewport of [DESKTOP, MOBILE]) {
    for (const slug of ARTICLE_SLUGS) {
      directArticles.push(
        await runArticleDirect(browser, payload, slug, viewport, {
          scrollDetail: viewport.name === MOBILE.name && slug === ARTICLE_SLUGS[0],
        }),
      );
    }
  }

  const listingEnters = [];
  for (const viewport of [DESKTOP, MOBILE]) {
    for (const slug of REPRESENTATIVE_ARTICLE_SLUGS) {
      listingEnters.push(await runListingEnter(browser, payload, slug, viewport));
    }
  }

  const nextBackFlows = [];
  for (const viewport of [DESKTOP, MOBILE]) {
    nextBackFlows.push(await runNextBackFlow(browser, payload, viewport));
  }

  const circularNext = await runCircularNextCheck(browser, payload);
  const slowDirectArticles = [await runSlowApiDirect(browser, payload)];

  const rapidNavigation = [];
  for (const [targetHash, targetSection] of RAPID_NAV_TARGETS) {
    rapidNavigation.push(
      await runRapidNavigation(browser, payload, targetHash, targetSection),
    );
  }

  const caseStudyRegressions = [];
  for (const hash of CASE_STUDY_REGRESSION_HASHES) {
    caseStudyRegressions.push(await runCaseStudyRegression(browser, hash));
  }

  const staticRoutes = await runStaticRoutes(browser);
  const mobileMenu = await runMobileMenu(browser);
  const interactions = await runInteractionChecks(browser);

  await browser.close();

  const eventSections = [
    ...directArticles,
    ...listingEnters,
    ...nextBackFlows,
    circularNext,
    ...slowDirectArticles,
    ...rapidNavigation,
    ...caseStudyRegressions,
    staticRoutes,
    mobileMenu,
    interactions,
  ];
  const events = collectEventSummary(eventSections);
  const result = {
    runId: RUN_ID,
    mode: MODE,
    baseUrl: BASE_URL,
    expectedArticleOwner: EXPECTED_ARTICLE_OWNER,
    checks,
    directArticles,
    listingEnters,
    nextBackFlows,
    circularNext,
    slowDirectArticles,
    rapidNavigation,
    caseStudyRegressions,
    staticRoutes,
    mobileMenu,
    interactions,
    events,
    api: {
      canonical: api.canonical,
      compat: api.compat,
      http404: api.http404,
      missingAsset: api.missingAsset,
    },
    animationParams: getAnimationParams(directArticles[0]?.state),
  };

  await writeSummary(result);
  await writeJsonFile(
    path.join(OUT_DIR, `enter-article-route-enter-${MODE}.json`),
    result,
  );

  const failedChecks = checks.filter((check) => !check.passed);
  console.log(
    `enter-article ${MODE}: ${checks.length - failedChecks.length} passed, ${failedChecks.length} failed`,
  );
  console.log(`Report: ${OUT_DIR}`);

  if (failedChecks.length > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
