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
const OUT_DIR = path.join(
  TASK_DIR,
  "research",
  `enter-case-study-route-enter-verification-${RUN_ID}`,
);

const DESKTOP = { name: "desktop-1440x900", width: 1440, height: 900 };
const MOBILE = {
  name: "mobile-390x844",
  width: 390,
  height: 844,
  isMobile: true,
  hasTouch: true,
};

const ARTICLE_HASH =
  "#/article/using-artificial-intelligence-to-generate-alt-text-on-images";

const CASE_ROUTE_SPECS = [
  { label: "cc-switch", hash: "#/case-study/cc-switch", index: 0 },
  {
    label: "ai-design-workflow",
    hash: "#/case-study/ai-design-workflow",
    index: 3,
  },
  { label: "legacy-elements", hash: "#/case-study/elements", index: 0 },
  {
    label: "legacy-physical-web",
    hash: "#/case-study/physical-web",
    index: 1,
  },
  {
    label: "legacy-adelphi-digital",
    hash: "#/case-study/adelphi-digital",
    index: 2,
  },
];

const hideToolbarScript = `
(() => {
  const hide = () => {
    if (!document.documentElement) {
      return;
    }
    if (document.getElementById("__enter_case_study_hide_toolbar")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "__enter_case_study_hide_toolbar";
    style.textContent = "astro-dev-toolbar{display:none!important;pointer-events:none!important;visibility:hidden!important;}";
    document.documentElement.appendChild(style);
  };
  hide();
  document.addEventListener("DOMContentLoaded", hide);
})();
`;

const { checks, recordCheck } = createCheckRecorder();

const hashUrl = (hash) => buildHashUrl(BASE_URL, hash);

const makeBrowserEvents = createBrowserEvents;

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

const createPage = (context, viewport, events, options = {}) =>
  createHarnessPage(context, viewport, events, {
    ...options,
    baseUrl: BASE_URL,
    includeResponseStatusText: true,
    initScript: { content: hideToolbarScript },
  });

const getBridgeState = async (page) =>
  page.evaluate(() => window.__homepageAnimationBridge?.getState());

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

    const lifecycle = window.__homepageAnimationBridge
      ?.getState()
      ?.lifecycle;
    const methodState = (methodName) =>
      lifecycle?.methods?.find((method) => method.method === methodName);
    const detailContract = window.__homepageAnimationBridge
      ?.getState()
      ?.detailContract;
    const activeNav = Array.from(
      document.querySelectorAll(".primary-nav .element-box.active"),
    ).map((element) => element.getAttribute("data-name"));
    const detail = {
      caseStudyHeading: document
        .querySelector(".case-study h1 .text")
        ?.textContent?.replace(/\s+/g, " ")
        .trim(),
      caseStudyText: document
        .querySelector(".case-study__wrap")
        ?.textContent?.replace(/\s+/g, " ")
        .trim(),
      caseStudyItemTitle:
        window.__homepageLegacyLifecycle?.caseStudyItem?.title ??
        null,
      articleHeading: document
        .querySelector(".article h1 .text")
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
      caseStudyRevealed: Array.from(
        document.querySelectorAll(
          ".case-study__section h2, .case-study__section h3, .case-study__section p, .case-study__section li, .case-study__section .cta",
        ),
      ).filter((element) => Number(window.getComputedStyle(element).opacity) > 0.01)
        .length,
      lazyElements: document.querySelectorAll(".case-study .lazy").length,
      lazyWithDataOriginal: document.querySelectorAll(
        ".case-study .lazy[data-original]",
      ).length,
      lazyImagesMissingSrc: Array.from(
        document.querySelectorAll(".case-study img.lazy[data-original]"),
      ).filter((element) => !element.getAttribute("src")).length,
    };

    return {
      url: window.location.href,
      hash: window.location.hash,
      title: document.title,
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
      detailContract,
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
    { timeout: 15000 },
  );
};

const waitForCaseStudyReady = async (page, title) => {
  await waitForVisibleSection(page, "case-study");
  await page.waitForFunction(
    (expectedTitle) => {
      const wrapText = document.querySelector(".case-study__wrap")?.textContent ?? "";
      const itemTitle =
        window.__homepageLegacyLifecycle?.caseStudyItem?.title ?? "";
      const hasRenderedDetail = wrapText.trim().length > 40;

      return hasRenderedDetail && itemTitle === expectedTitle;
    },
    title,
    { timeout: 25000 },
  );
  await page.waitForFunction(
    (expectedTitle) => {
      const heading = document.querySelector(".case-study h1 .text")?.textContent ?? "";

      return heading.includes(expectedTitle);
    },
    title,
    { timeout: 8000 },
  );
  await page.waitForTimeout(300);
};

const waitForArticleReady = async (page) => {
  await waitForVisibleSection(page, "article");
  await page.waitForFunction(
    () =>
      Boolean(
        document.querySelector(".article__wrap")?.textContent?.trim().length >
          40,
      ),
    null,
    { timeout: 20000 },
  );
  await page.waitForTimeout(1800);
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

const getExpectedCase = (payload, spec) => {
  const item = payload.caseStudies[spec.index];
  const next = payload.caseStudies[(spec.index + 1) % payload.caseStudies.length];

  return { item, next };
};

const assertCaseStudyState = (prefix, state, expected) => {
  recordCheck(`${prefix} visible case-study section`, state.visibleSections.includes("case-study"), {
    visibleSections: state.visibleSections,
    hash: state.hash,
  });
  recordCheck(
    `${prefix} renders expected title/content`,
    (state.detail.caseStudyItemTitle === expected.item.title ||
      state.detail.caseStudyHeading?.includes(expected.item.title)) &&
      Boolean(state.detail.caseStudyText && state.detail.caseStudyText.length > 40),
    {
      expectedTitle: expected.item.title,
      heading: state.detail.caseStudyHeading,
      caseStudyItemTitle: state.detail.caseStudyItemTitle,
      textStart: state.detail.caseStudyText?.slice(0, 160),
    },
  );
  recordCheck(
    `${prefix} next/listing hrefs remain correct`,
    state.detail.caseStudyNextHref === expected.next.url.local &&
      state.detail.caseStudyListingHref === `/#/${expected.item.category}/`,
    {
      expectedNext: expected.next.url.local,
      actualNext: state.detail.caseStudyNextHref,
      expectedListing: `/#/${expected.item.category}/`,
      actualListing: state.detail.caseStudyListingHref,
    },
  );
  recordCheck(
    `${prefix} active nav follows case-study category`,
    state.activeNav.includes(expected.item.category),
    {
      activeNav: state.activeNav,
      expectedCategory: expected.item.category,
    },
  );
  recordCheck(
    `${prefix} enterCaseStudy is ts-owned with zero fallback`,
    state.lifecycle.enterCaseStudy?.owner === "ts-owned" &&
      state.lifecycle.enterCaseStudy?.fallbackCount === 0,
    {
      enterCaseStudy: state.lifecycle.enterCaseStudy,
    },
  );
  recordCheck(
    `${prefix} detail lifecycle ownership remains ts-owned`,
    state.lifecycle.enterArticle?.owner === "ts-owned" &&
      state.lifecycle.exitCurrentSlide?.owner === "ts-owned" &&
      state.lifecycle.switchSlide?.owner === "ts-owned" &&
      state.lifecycle.resetSlide?.owner === "ts-owned",
    {
      enterArticle: state.lifecycle.enterArticle?.owner,
      exitCurrentSlide: state.lifecycle.exitCurrentSlide?.owner,
      switchSlide: state.lifecycle.switchSlide?.owner,
      resetSlide: state.lifecycle.resetSlide?.owner,
    },
  );
  recordCheck(
    `${prefix} detail scroll/lazy ownership remains ts-owned`,
    state.detailContract?.scrollReveal?.owner === "ts-owned" &&
      state.detailContract?.scrollReveal?.scrollMonitorOwner === "ts-owned" &&
      state.detailContract?.lazyload?.owner === "ts-owned",
    {
      scrollReveal: state.detailContract?.scrollReveal,
      lazyload: state.detailContract?.lazyload,
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
};

const runCaseStudyDirect = async (browser, payload, spec, viewport, options = {}) => {
  const context = await browser.newContext({
    isMobile: Boolean(viewport.isMobile),
    hasTouch: Boolean(viewport.hasTouch),
  });
  const events = makeBrowserEvents();
  const page = await createPage(context, viewport, events, options);
  const expected = getExpectedCase(payload, spec);

  await page.goto(hashUrl(spec.hash), { waitUntil: "domcontentloaded" });
  await waitForCaseStudyReady(page, expected.item.title);

  if (options.scrollDetail) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      window.dispatchEvent(new Event("scroll"));
    });
    await page.waitForTimeout(1400);
  }

  const state = await getPageState(page);
  const prefix = `${viewport.name} direct ${spec.label}`;

  assertCaseStudyState(prefix, state, expected);

  if (options.scrollDetail) {
    recordCheck(
      `${prefix} mobile detail scroll/reveal/lazyload state remains active`,
      state.detail.caseStudySections > 0 &&
        state.detail.caseStudyRevealed > 0 &&
        state.detail.lazyImagesMissingSrc === 0,
      {
        caseStudySections: state.detail.caseStudySections,
        caseStudyRevealed: state.detail.caseStudyRevealed,
        lazyElements: state.detail.lazyElements,
        lazyWithDataOriginal: state.detail.lazyWithDataOriginal,
        lazyImagesMissingSrc: state.detail.lazyImagesMissingSrc,
      },
    );
  }

  await context.close();

  return { spec, viewport: viewport.name, state, events };
};

const runListingEnter = async (browser, payload, spec, viewport) => {
  const expected = getExpectedCase(payload, spec);
  const context = await browser.newContext({
    isMobile: Boolean(viewport.isMobile),
    hasTouch: Boolean(viewport.hasTouch),
  });
  const events = makeBrowserEvents();
  const page = await createPage(context, viewport, events);
  const listingHash = `#/${expected.item.category}/`;

  await page.goto(hashUrl(listingHash), { waitUntil: "domcontentloaded" });
  await waitForVisibleSection(page, expected.item.category);
  await page.waitForFunction(
    (href) => Boolean(document.querySelector(`a.card-link[href="${href}"]`)),
    expected.item.url.local,
    { timeout: 15000 },
  );
  await clickLinkBySelector(page, `a.card-link[href="${expected.item.url.local}"]`);
  await waitForCaseStudyReady(page, expected.item.title);

  const state = await getPageState(page);
  const prefix = `${viewport.name} listing ${expected.item.category} -> ${spec.label}`;

  assertCaseStudyState(prefix, state, expected);
  recordCheck(`${prefix} reached expected hash`, state.hash === spec.hash, {
    expectedHash: spec.hash,
    actualHash: state.hash,
  });

  await context.close();

  return { spec, viewport: viewport.name, state, events };
};

const runNextListingFlow = async (browser, payload, startSpec, viewport) => {
  const expected = getExpectedCase(payload, startSpec);
  const nextExpected = {
    item: expected.next,
    next:
      payload.caseStudies[
        (startSpec.index + 2) % payload.caseStudies.length
      ],
  };
  const context = await browser.newContext({
    isMobile: Boolean(viewport.isMobile),
    hasTouch: Boolean(viewport.hasTouch),
  });
  const events = makeBrowserEvents();
  const page = await createPage(context, viewport, events);

  await page.goto(hashUrl(startSpec.hash), { waitUntil: "domcontentloaded" });
  await waitForCaseStudyReady(page, expected.item.title);
  await clickLinkBySelector(
    page,
    ".case-study__wrap .navigation a:not(.js-back-to-listing)",
  );
  await waitForCaseStudyReady(page, expected.next.title);
  const afterNext = await getPageState(page);
  await clickLinkBySelector(
    page,
    ".case-study__wrap .navigation .js-back-to-listing",
  );
  await waitForVisibleSection(page, expected.next.category);
  await page.waitForTimeout(1200);
  const afterListing = await getPageState(page);

  assertCaseStudyState(
    `${viewport.name} next from ${startSpec.label}`,
    afterNext,
    nextExpected,
  );
  recordCheck(
    `${viewport.name} listing from next case returns to category`,
    afterListing.hash === `#/${expected.next.category}/` &&
      afterListing.visibleSections.includes(expected.next.category),
    {
      expectedHash: `#/${expected.next.category}/`,
      actualHash: afterListing.hash,
      visibleSections: afterListing.visibleSections,
    },
  );

  await context.close();

  return { startSpec, viewport: viewport.name, afterNext, afterListing, events };
};

const runCircularNextCheck = async (browser, payload) => {
  const lastIndex = payload.caseStudies.length - 1;
  const context = await browser.newContext();
  const events = makeBrowserEvents();
  const page = await createPage(context, DESKTOP, events);
  const lastItem = payload.caseStudies[lastIndex];
  const firstItem = payload.caseStudies[0];

  await page.goto(hashUrl(lastItem.url.local.replace("/#", "#")), {
    waitUntil: "domcontentloaded",
  });
  await waitForCaseStudyReady(page, lastItem.title);
  const state = await getPageState(page);

  recordCheck(
    "case-study last item next href remains circular",
    state.detail.caseStudyNextHref === firstItem.url.local,
    {
      lastItem: lastItem.title,
      expectedNext: firstItem.url.local,
      actualNext: state.detail.caseStudyNextHref,
    },
  );

  await context.close();

  return { state, events };
};

const runRapidNavigation = async (browser, payload, targetHash) => {
  const context = await browser.newContext();
  const events = makeBrowserEvents();
  const page = await createPage(context, DESKTOP, events);
  const first = payload.caseStudies[0];
  const targetSection = targetHash.includes("unknown")
    ? "error"
    : targetHash.replace("#/", "").replace("/", "");

  await page.goto(hashUrl("#/case-study/cc-switch"), {
    waitUntil: "domcontentloaded",
  });
  await waitForCaseStudyReady(page, first.title);
  await page.evaluate((hash) => {
    window.location.hash = hash;
  }, targetHash);
  await waitForVisibleSection(page, targetSection);
  await page.waitForTimeout(1400);
  const state = await getPageState(page);

  recordCheck(
    `rapid case detail -> ${targetHash} settles on target`,
    state.hash === targetHash && state.visibleSections.includes(targetSection),
    {
      hash: state.hash,
      visibleSections: state.visibleSections,
      targetSection,
    },
  );
  recordCheck(
    `rapid case detail -> ${targetHash} keeps enterCaseStudy fallback zero`,
    state.lifecycle.enterCaseStudy?.fallbackCount === 0,
    { enterCaseStudy: state.lifecycle.enterCaseStudy },
  );

  await context.close();

  return { targetHash, state, events };
};

const runArticleRegression = async (browser) => {
  const context = await browser.newContext();
  const events = makeBrowserEvents();
  const page = await createPage(context, DESKTOP, events);

  await page.goto(hashUrl(ARTICLE_HASH), { waitUntil: "domcontentloaded" });
  await waitForArticleReady(page);
  const state = await getPageState(page);

  recordCheck(
    "article route remains visible and enterArticle is ts-owned",
    state.visibleSections.includes("article") &&
      state.lifecycle.enterArticle?.owner === "ts-owned",
    {
      visibleSections: state.visibleSections,
      enterArticle: state.lifecycle.enterArticle,
      title: state.title,
      articleHeading: state.detail.articleHeading,
    },
  );

  await context.close();

  return { state, events };
};

const runStaticRoutes = async (browser) => {
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
    `${BASE_URL}/assets/homepage/__enter-case-study-missing__.png`,
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
  recordCheck("no same-origin HTTP errors during page navigation", allSameOriginHttpErrors.length === 0, {
    sameOriginHttpErrors: allSameOriginHttpErrors,
  });

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

const writeSummary = async (result) => {
  const failedChecks = result.checks.filter((check) => !check.passed);
  const sampleState = result.directCaseStudies[0]?.state;

  const lines = [
    "# Enter Case Study Route Enter Verification",
    "",
    `- Run id: \`${result.runId}\``,
    `- Base URL: \`${BASE_URL}\``,
    `- Checks passed: ${result.checks.length - failedChecks.length}`,
    `- Checks failed: ${failedChecks.length}`,
    `- Direct case-study routes: ${result.directCaseStudies
      .map((entry) => `${entry.viewport}:${entry.spec.hash}`)
      .join(", ")}`,
    `- Slow API direct routes: ${result.slowDirectCaseStudies
      .map((entry) => entry.spec.hash)
      .join(", ")}`,
    `- Listing enters: ${result.listingEnters
      .map((entry) => `${entry.viewport}:${entry.spec.hash}`)
      .join(", ")}`,
    `- Rapid navigation targets: ${result.rapidNavigation
      .map((entry) => entry.targetHash)
      .join(", ")}`,
    `- enterCaseStudy owner: \`${sampleState?.lifecycle.enterCaseStudy?.owner}\``,
    `- enterCaseStudy fallbackCount: ${sampleState?.lifecycle.enterCaseStudy?.fallbackCount}`,
    `- enterArticle owner: \`${sampleState?.lifecycle.enterArticle?.owner}\``,
    `- exitCurrentSlide owner: \`${sampleState?.lifecycle.exitCurrentSlide?.owner}\``,
    `- switchSlide owner: \`${sampleState?.lifecycle.switchSlide?.owner}\``,
    `- resetSlide owner: \`${sampleState?.lifecycle.resetSlide?.owner}\``,
    `- detail visible animation owner: \`${sampleState?.detailContract?.visibleAnimationOwner}\``,
    `- case-study visible animation owner: \`${sampleState?.detailContract?.caseStudyVisibleAnimationOwner}\``,
    `- article visible animation owner: \`${sampleState?.detailContract?.articleVisibleAnimationOwner}\``,
    `- detail scroll reveal owner: \`${sampleState?.detailContract?.scrollReveal?.owner}\``,
    `- scrollMonitor owner: \`${sampleState?.detailContract?.scrollReveal?.scrollMonitorOwner}\``,
    `- lazyload owner: \`${sampleState?.detailContract?.lazyload?.owner}\``,
    `- Console errors: ${result.browserEvents.consoleErrors}`,
    `- Unexpected console errors: ${result.browserEvents.unexpectedConsoleErrors}`,
    `- Page errors: ${result.browserEvents.pageErrorCount}`,
    `- Request failures: ${result.browserEvents.requestFailureCount}`,
    `- Unexpected request failures: ${result.browserEvents.unexpectedRequestFailures}`,
    `- Same-origin HTTP errors during page navigation: ${result.browserEvents.sameOriginHttpErrorCount}`,
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
    path.join(OUT_DIR, "enter-case-study-route-enter-verification.md"),
    `${lines.join("\n")}\n`,
  );
};

const main = async () => {
  await ensureDir(OUT_DIR);

  const browser = await chromium.launch();
  const api = await runApiAndHttpChecks(browser);
  const payload = api.payload;
  const sectionsWithEvents = [];

  const directCaseStudies = [];
  for (const viewport of [DESKTOP, MOBILE]) {
    for (const spec of CASE_ROUTE_SPECS) {
      console.log(`direct ${viewport.name} ${spec.hash}`);
      const result = await runCaseStudyDirect(browser, payload, spec, viewport, {
        scrollDetail: viewport.name === MOBILE.name && spec.label === "cc-switch",
      });
      directCaseStudies.push(result);
      sectionsWithEvents.push(result);
    }
  }

  const slowDirectCaseStudies = [];
  for (const spec of [CASE_ROUTE_SPECS[0], CASE_ROUTE_SPECS[2]]) {
    console.log(`slow direct ${spec.hash}`);
    const result = await runCaseStudyDirect(browser, payload, spec, DESKTOP, {
      slowApiDelayMs: 2600,
    });
    slowDirectCaseStudies.push(result);
    sectionsWithEvents.push(result);
  }

  const listingEnters = [];
  for (const entry of [
    { spec: CASE_ROUTE_SPECS[0], viewport: DESKTOP },
    { spec: CASE_ROUTE_SPECS[1], viewport: DESKTOP },
    { spec: CASE_ROUTE_SPECS[0], viewport: MOBILE },
    { spec: CASE_ROUTE_SPECS[1], viewport: MOBILE },
  ]) {
    console.log(`listing ${entry.viewport.name} ${entry.spec.hash}`);
    const result = await runListingEnter(
      browser,
      payload,
      entry.spec,
      entry.viewport,
    );
    listingEnters.push(result);
    sectionsWithEvents.push(result);
  }

  const nextListingFlows = [];
  for (const viewport of [DESKTOP, MOBILE]) {
    console.log(`next/listing ${viewport.name}`);
    const result = await runNextListingFlow(
      browser,
      payload,
      CASE_ROUTE_SPECS[0],
      viewport,
    );
    nextListingFlows.push(result);
    sectionsWithEvents.push(result);
  }

  const circularNext = await runCircularNextCheck(browser, payload);
  sectionsWithEvents.push(circularNext);

  const rapidNavigation = [];
  for (const targetHash of [
    "#/hello/",
    "#/coding/",
    "#/design/",
    "#/achievements/",
    "#/unknown-route",
  ]) {
    console.log(`rapid ${targetHash}`);
    const result = await runRapidNavigation(browser, payload, targetHash);
    rapidNavigation.push(result);
    sectionsWithEvents.push(result);
  }

  const articleRegression = await runArticleRegression(browser);
  sectionsWithEvents.push(articleRegression);

  const staticRoutes = await runStaticRoutes(browser);
  sectionsWithEvents.push(staticRoutes);

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
    directCaseStudies,
    slowDirectCaseStudies,
    listingEnters,
    nextListingFlows,
    circularNext,
    rapidNavigation,
    articleRegression,
    staticRoutes,
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
    path.join(OUT_DIR, "enter-case-study-route-enter-verification.json"),
    result,
    { trailingNewline: true },
  );
  await writeSummary(result);

  const failedChecks = checks.filter((check) => !check.passed);

  console.log(`Enter case-study route-enter verification run: ${RUN_ID}`);
  console.log(`Output: ${path.resolve(OUT_DIR)}`);
  console.log(
    `Checks: ${checks.length - failedChecks.length} passed, ${failedChecks.length} failed`,
  );

  if (failedChecks.length > 0) {
    console.log("Failures:");
    for (const check of failedChecks) {
      console.log(`- ${check.name}`);
    }
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
