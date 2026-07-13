import path from "node:path";
import { chromium, webkit } from "playwright";
import {
  createBrowserEvents,
  createCheckRecorder,
  createHarnessPage,
  createRunId,
  ensureDir,
  newContextForViewport,
  sleep,
  taskDir,
  waitForRoutePage,
  writeJsonFile,
  writeTextFile,
} from "./verify/lib/harness.mjs";

const BASE_URL = process.env.MOBILE_VERIFY_BASE_URL ?? "http://127.0.0.1:5174";
const TASK_DIR = taskDir(".trellis/tasks/07-13-mobile-verification-reliability");
const RUN_ID = createRunId();
const OUT_DIR = path.join(TASK_DIR, "research", `mobile-responsive-verification-${RUN_ID}`);

const MOBILE_PORTRAIT = [
  { name: "mobile-320x568", width: 320, height: 568, isMobile: true, hasTouch: true },
  { name: "mobile-360x800", width: 360, height: 800, isMobile: true, hasTouch: true },
  { name: "mobile-379x844", width: 379, height: 844, isMobile: true, hasTouch: true },
  { name: "mobile-380x844", width: 380, height: 844, isMobile: true, hasTouch: true },
  { name: "mobile-390x844", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "mobile-430x932", width: 430, height: 932, isMobile: true, hasTouch: true },
  { name: "mobile-767x900", width: 767, height: 900, isMobile: true, hasTouch: true },
];
const MOBILE_LANDSCAPE = [
  { name: "landscape-667x375", width: 667, height: 375, isMobile: true, hasTouch: true },
];
const ADJACENCY = [
  { name: "tablet-768x1024", width: 768, height: 1024, isMobile: true, hasTouch: true, target: false },
  { name: "tablet-1023x768", width: 1023, height: 768, target: false },
  { name: "desktop-1024x768", width: 1024, height: 768, target: false },
];
const DESKTOP = [
  { name: "desktop-1280x800", width: 1280, height: 800, target: false },
  { name: "desktop-1440x900", width: 1440, height: 900, target: false },
];

const ALL_VIEWPORTS = [
  ...MOBILE_PORTRAIT,
  ...MOBILE_LANDSCAPE,
  ...ADJACENCY,
  ...DESKTOP,
];

const ROUTES = [
  { hash: "#/hello/", page: "hello" },
  { hash: "#/about/", page: "about" },
  { hash: "#/achievements/", page: "achievements" },
  { hash: "#/coding/", page: "coding" },
  { hash: "#/design/", page: "design" },
  { hash: "#/contact/", page: "contact" },
];

const OVERFLOW_TOLERANCE = 1;
const ROUTE_MINIMUM_SETTLE_MS = 1100;
const STABLE_SAMPLE_COUNT = 3;
const STABLE_SAMPLE_INTERVAL_MS = 100;
const STABLE_VIEWPORT_TIMEOUT_MS = 5000;

const MOBILE_320 = MOBILE_PORTRAIT.find((viewport) => viewport.width === 320);
const MOBILE_390 = MOBILE_PORTRAIT.find((viewport) => viewport.width === 390);
const TABLET_768 = ADJACENCY.find((viewport) => viewport.width === 768);
const DESKTOP_1440 = DESKTOP.find((viewport) => viewport.width === 1440);

if (!MOBILE_320 || !MOBILE_390 || !TABLET_768 || !DESKTOP_1440) {
  throw new Error("Required responsive verification viewport is missing");
}

const hashUrl = (hash) => `${BASE_URL}/${hash}`;

const gotoRoute = async (page, hash) => {
  await page.goto(hashUrl(hash), { waitUntil: "domcontentloaded" });
  const route = ROUTES.find((candidate) => candidate.hash === hash);

  if (route) {
    await waitForRoutePage(page, route.page);
  }

  await page.evaluate(async () => {
    await document.fonts?.ready;
  });
  await sleep(ROUTE_MINIMUM_SETTLE_MS);
};

const measureViewport = (page, requestedWidth) =>
  page.evaluate((expectedWidth) => ({
    requestedWidth: expectedWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    innerWidth: window.innerWidth,
    visualViewportWidth: window.visualViewport?.width ?? null,
  }), requestedWidth);

const closeToRequestedWidth = (value, requestedWidth) =>
  Math.abs(value - requestedWidth) <= OVERFLOW_TOLERANCE;

const isConvergedViewport = (measurement) =>
  closeToRequestedWidth(measurement.clientWidth, measurement.requestedWidth) &&
  closeToRequestedWidth(measurement.innerWidth, measurement.requestedWidth) &&
  (measurement.visualViewportWidth === null ||
    closeToRequestedWidth(
      measurement.visualViewportWidth,
      measurement.requestedWidth,
    )) &&
  measurement.scrollWidth <=
    measurement.requestedWidth + OVERFLOW_TOLERANCE;

const waitForStableViewport = async (page, requestedWidth) => {
  const startedAt = Date.now();
  let consecutiveSamples = 0;
  let lastMeasurement = await measureViewport(page, requestedWidth);

  while (Date.now() - startedAt < STABLE_VIEWPORT_TIMEOUT_MS) {
    lastMeasurement = await measureViewport(page, requestedWidth);
    consecutiveSamples = isConvergedViewport(lastMeasurement)
      ? consecutiveSamples + 1
      : 0;

    if (consecutiveSamples >= STABLE_SAMPLE_COUNT) {
      return {
        ...lastMeasurement,
        settled: true,
        consecutiveSamples,
        sampleIntervalMs: STABLE_SAMPLE_INTERVAL_MS,
        elapsedMs: Date.now() - startedAt,
      };
    }

    await sleep(STABLE_SAMPLE_INTERVAL_MS);
  }

  return {
    ...lastMeasurement,
    settled: false,
    consecutiveSamples,
    sampleIntervalMs: STABLE_SAMPLE_INTERVAL_MS,
    elapsedMs: Date.now() - startedAt,
  };
};

const runOverflowChecks = async (browserName, browser, viewport, recordCheck, events) => {
  const context = await newContextForViewport(browser, viewport);
  const page = await createHarnessPage(context, viewport, events, { baseUrl: BASE_URL });

  for (const route of ROUTES) {
    await gotoRoute(page, route.hash);
    const measurement = await waitForStableViewport(page, viewport.width);
    recordCheck(
      `${browserName} ${viewport.name} ${route.hash} stable viewport has no horizontal overflow`,
      measurement.settled && isConvergedViewport(measurement),
      measurement,
    );
  }

  await context.close();
};

const runWechatOverflowCheck = async (browserName, browser, viewport, recordCheck, events) => {
  const context = await newContextForViewport(browser, viewport);
  const page = await createHarnessPage(context, viewport, events, { baseUrl: BASE_URL });

  await gotoRoute(page, "#/contact/");

  const closed = await waitForStableViewport(page, viewport.width);
  recordCheck(
    `${browserName} ${viewport.name} contact wechat-card CLOSED no overflow`,
    closed.settled && isConvergedViewport(closed),
    closed,
  );

  await page.evaluate(() => {
    const btn = document.querySelector(".contact-icons .js-wechat-toggle");
    btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await sleep(400);

  const open = await waitForStableViewport(page, viewport.width);
  recordCheck(
    `${browserName} ${viewport.name} contact wechat-card OPEN no overflow`,
    open.settled && isConvergedViewport(open),
    open,
  );

  await context.close();
};

const runAchievementsLayoutCheck = async (
  browserName,
  browser,
  viewport,
  recordCheck,
  events,
) => {
  const context = await newContextForViewport(browser, viewport);
  const page = await createHarnessPage(context, viewport, events, { baseUrl: BASE_URL });

  await gotoRoute(page, "#/achievements/");
  await page.evaluate(() => {
    document.querySelector(".achievements .nominations")?.scrollIntoView();
  });
  await page.waitForFunction(
    () => {
      const items = Array.from(
        document.querySelectorAll(".achievements .nominations li"),
      ).filter((item) => getComputedStyle(item).display !== "none");
      return items.length > 0 && items.every((item) => {
        const title = item.querySelector(".title");
        return item.classList.contains("init") &&
          title &&
          Number(getComputedStyle(title).opacity) > 0.9999;
      });
    },
    undefined,
    { timeout: 8000 },
  );
  await page.evaluate(() => {
    document.querySelector(".achievements .ribbons")?.scrollIntoView();
  });
  await page.waitForFunction(
    () => {
      const items = Array.from(
        document.querySelectorAll(".achievements .ribbons li"),
      );
      return items.length > 0 && items.every((item) => {
        const style = getComputedStyle(item);
        const transform = style.transform;
        const translateY = transform === "none"
          ? 0
          : new DOMMatrixReadOnly(transform).m42;
        return Number(style.opacity) > 0.9999 && Math.abs(translateY) <= 0.05;
      });
    },
    undefined,
    { timeout: 8000 },
  );

  const data = await page.evaluate(() => {
    const visibleElements = (selector) =>
      Array.from(document.querySelectorAll(selector)).filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== "none" && rect.width > 0 && rect.height > 0;
      });
    const rectFor = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: Math.round(rect.left * 10) / 10,
        top: Math.round(rect.top * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
      };
    };
    const groupRows = (rects) => {
      const rows = [];

      rects.forEach((rect) => {
        const row = rows.find(
          (candidate) => Math.abs(candidate[0].top - rect.top) <= 1,
        );

        if (row) {
          row.push(rect);
          return;
        }

        rows.push([rect]);
      });

      return rows.map((row) => row.sort((a, b) => a.left - b.left));
    };
    const followsDomOrder = (rects) => rects.every((rect, index) => {
      if (index === 0) {
        return true;
      }

      const previous = rects[index - 1];
      return rect.top > previous.top + 1 ||
        (Math.abs(rect.top - previous.top) <= 1 && rect.left > previous.left);
    });

    const honorList = document.querySelector(".achievements .nominations ul");
    const allHonors = Array.from(
      document.querySelectorAll(".achievements .nominations li"),
    );
    const honors = visibleElements(".achievements .nominations li");
    const honorRects = honors.map(rectFor);
    const honorText = honors.flatMap((item) =>
      Array.from(item.querySelectorAll(".title, .light")),
    );
    const honorRows = groupRows(honorRects);
    const clippedHonorText = honorText.filter((element) =>
      element.scrollWidth > element.clientWidth + 1 ||
      element.scrollHeight > element.clientHeight + 1,
    ).map((element) => element.textContent?.trim() ?? "");

    const allBadges = Array.from(
      document.querySelectorAll(".achievements .ribbons li"),
    );
    const badges = visibleElements(".achievements .ribbons li");
    const badgeRects = badges.map(rectFor);
    const badgeListRect = rectFor(
      document.querySelector(".achievements .ribbons ul"),
    );
    const badgeRows = groupRows(badgeRects);
    const finalBadgeRow = badgeRows.at(-1) ?? [];
    const finalBadgeRowCenter = finalBadgeRow.length > 0
      ? (
          finalBadgeRow[0].left +
          finalBadgeRow.at(-1).left +
          finalBadgeRow.at(-1).width
        ) / 2
      : null;
    const badgeListCenter = badgeListRect.left + badgeListRect.width / 2;

    return {
      honors: {
        total: allHonors.length,
        visible: honors.length,
        columns: Math.max(0, ...honorRows.map((row) => row.length)),
        rows: honorRows.length,
        first: honorRects[0] ?? null,
        last: honorRects.at(-1) ?? null,
        itemHeight: honorRects[0]?.height ?? null,
        listWidth: honorList ? rectFor(honorList).width : null,
        followsDomOrder: followsDomOrder(honorRects),
        beforeContent: honorList
          ? getComputedStyle(honorList, "::before").content
          : null,
        afterContent: honorList
          ? getComputedStyle(honorList, "::after").content
          : null,
        clippedText: clippedHonorText,
      },
      badges: {
        total: allBadges.length,
        visible: badges.length,
        columns: Math.max(0, ...badgeRows.map((row) => row.length)),
        rows: badgeRows.length,
        rowItemCounts: badgeRows.map((row) => row.length),
        finalRowCenterOffset:
          finalBadgeRowCenter === null
            ? null
            : Math.round(Math.abs(finalBadgeRowCenter - badgeListCenter) * 10) /
              10,
        listWidth: badgeListRect.width,
        firstSize: badgeRects[0]
          ? [badgeRects[0].width, badgeRects[0].height]
          : null,
        square: badgeRects.every(
          (rect) => Math.abs(rect.width - rect.height) <= 1,
        ),
        followsDomOrder: followsDomOrder(badgeRects),
        imagesLoaded: badges.every((item) => {
          const image = item.querySelector("img");
          return image?.complete && image.naturalWidth > 0;
        }),
      },
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });

  if (viewport.width <= 767) {
    recordCheck(
      `${browserName} ${viewport.name} achievements honors are ordered two-column rows`,
      data.honors.total === 12 &&
        data.honors.visible === 12 &&
        data.honors.columns === 2 &&
        data.honors.rows === 6 &&
        data.honors.itemHeight === 104 &&
        data.honors.listWidth <= 532 + OVERFLOW_TOLERANCE &&
        data.honors.followsDomOrder &&
        data.honors.first?.top < data.honors.last?.top &&
        data.honors.beforeContent === "none" &&
        data.honors.afterContent === "none" &&
        data.honors.clippedText.length === 0 &&
        data.overflow <= OVERFLOW_TOLERANCE,
      data.honors,
    );

    const expectedBadgeColumns = viewport.width < 380 ? 4 : 5;
    const expectedBadgeRows = Math.ceil(10 / expectedBadgeColumns);
    recordCheck(
      `${browserName} ${viewport.name} achievements badges use ${expectedBadgeColumns} ordered square columns`,
      data.badges.total === 10 &&
        data.badges.visible === 10 &&
        data.badges.columns === expectedBadgeColumns &&
        data.badges.rows === expectedBadgeRows &&
        data.badges.listWidth <= 532 + OVERFLOW_TOLERANCE &&
        data.badges.firstSize?.[0] <= 100 + OVERFLOW_TOLERANCE &&
        data.badges.square &&
        data.badges.followsDomOrder &&
        data.badges.imagesLoaded &&
        data.badges.finalRowCenterOffset <= OVERFLOW_TOLERANCE &&
        data.overflow <= OVERFLOW_TOLERANCE,
      data.badges,
    );
  } else {
    const expectedHonorCount = viewport.width < 1024 ? 8 : 12;
    const expectedHonorColumns = viewport.width < 1024 ? 4 : 6;
    recordCheck(
      `${browserName} ${viewport.name} achievements non-target baseline is preserved`,
      data.honors.total === 12 &&
        data.honors.visible === expectedHonorCount &&
        data.honors.columns === expectedHonorColumns &&
        data.honors.rows === 2 &&
        data.honors.itemHeight === 150 &&
        data.badges.total === 10 &&
        data.badges.visible === 10 &&
        data.badges.columns === 5 &&
        data.badges.rows === 2 &&
        data.badges.firstSize?.[0] === 100 &&
        data.badges.square &&
        data.badges.imagesLoaded &&
        data.overflow <= OVERFLOW_TOLERANCE,
      data,
    );
  }

  await context.close();
};

const waitForContentPayload = (page) =>
  page.waitForFunction(
    () =>
      window.__homepageRouteLifecycle?.getState?.().contentPayloadReady === true,
    undefined,
    { timeout: 20000 },
  );

const waitForArticleListingVisible = async (page) => {
  await page.evaluate(() => {
    document.querySelector(".achievements .listing")?.scrollIntoView();
  });
  await page.waitForFunction(
    () => {
      const items = Array.from(
        document.querySelectorAll(".achievements .listing li"),
      );
      return items.length > 0 && items.every((item) => {
        const rect = item.getBoundingClientRect();
        const style = getComputedStyle(item);
        return style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0.95 &&
          rect.width > 0 &&
          rect.height > 0;
      });
    },
    undefined,
    { timeout: 8000 },
  );
};

const readArticleListing = (page) =>
  page.evaluate(() => {
    const items = Array.from(
      document.querySelectorAll(".achievements .listing li"),
    );
    const entries = items.map((item) => {
      const link = item.querySelector("a");
      const rect = item.getBoundingClientRect();
      const style = getComputedStyle(item);
      return {
        title: link?.textContent?.trim() ?? "",
        href: link?.getAttribute("href") ?? "",
        opacity: Number(style.opacity),
        visible:
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0.95 &&
          rect.width > 0 &&
          rect.height > 0,
      };
    });

    return {
      total: entries.length,
      visible: entries.filter((entry) => entry.visible).length,
      titlesPresent: entries.every((entry) => entry.title.length > 0),
      hrefsValid: entries.every((entry) =>
        entry.href.startsWith("/#/article/"),
      ),
      entries,
    };
  });

const navigateHash = async (page, hash, expectedPage) => {
  await page.evaluate((nextHash) => {
    window.location.hash = nextHash;
  }, hash);
  await waitForRoutePage(page, expectedPage);
  await sleep(ROUTE_MINIMUM_SETTLE_MS);
};

const articleListingPasses = (data) =>
  data.total === 15 &&
  data.visible === 15 &&
  data.titlesPresent &&
  data.hrefsValid;

const runAchievementsArticleCheck = async (
  browserName,
  browser,
  viewport,
  recordCheck,
  events,
) => {
  const context = await newContextForViewport(browser, viewport);
  const page = await createHarnessPage(context, viewport, events, {
    baseUrl: BASE_URL,
  });

  await gotoRoute(page, "#/achievements/");
  await waitForContentPayload(page);
  await waitForArticleListingVisible(page);
  const direct = await readArticleListing(page);
  recordCheck(
    `${browserName} ${viewport.name} achievements payload articles are visible after direct load`,
    articleListingPasses(direct),
    direct,
  );

  if (viewport.width === 390) {
    await navigateHash(page, "#/about/", "about");
    await navigateHash(page, "#/achievements/", "achievements");
    await waitForArticleListingVisible(page);
    const returned = await readArticleListing(page);
    recordCheck(
      `${browserName} ${viewport.name} achievements payload articles remain visible after route return`,
      articleListingPasses(returned),
      returned,
    );
  }

  await context.close();
};

const runSlowAchievementsArticleCheck = async (
  browserName,
  browser,
  viewport,
  recordCheck,
  events,
) => {
  const context = await newContextForViewport(browser, viewport);
  const page = await createHarnessPage(context, viewport, events, {
    baseUrl: BASE_URL,
    slowApiDelayMs: 1400,
  });

  await page.goto(hashUrl("#/achievements/"), {
    waitUntil: "domcontentloaded",
  });
  await waitForRoutePage(page, "achievements");
  await sleep(500);
  const pending = await page.evaluate(() => ({
    contentPayloadReady:
      window.__homepageRouteLifecycle?.getState?.().contentPayloadReady ?? null,
    currentPage:
      window.__homepageRouteLifecycle?.getState?.().currentPage ?? null,
    sectionVisible:
      getComputedStyle(document.querySelector(".achievements")).display !==
      "none",
    staticIntroPresent: Boolean(
      document.querySelector(".achievements .col-l p"),
    ),
  }));
  recordCheck(
    `${browserName} ${viewport.name} achievements static content is available while payload is pending`,
    pending.contentPayloadReady === false &&
      pending.currentPage === "achievements" &&
      pending.sectionVisible &&
      pending.staticIntroPresent,
    pending,
  );

  await waitForContentPayload(page);
  await waitForArticleListingVisible(page);
  const ready = await readArticleListing(page);
  recordCheck(
    `${browserName} ${viewport.name} achievements payload articles reveal after slow API`,
    articleListingPasses(ready),
    ready,
  );

  await context.close();
};

const runAchievementsListingFailOpenCheck = async (
  browserName,
  browser,
  viewport,
  recordCheck,
  events,
) => {
  const context = await newContextForViewport(browser, viewport);
  const page = await createHarnessPage(context, viewport, events, {
    baseUrl: BASE_URL,
    slowApiDelayMs: 1400,
  });

  await page.goto(hashUrl("#/achievements/"), {
    waitUntil: "domcontentloaded",
  });
  await waitForRoutePage(page, "achievements");
  await page.evaluate(() => {
    document.querySelector(".achievements .listing h2")?.remove();
  });
  await waitForContentPayload(page);

  let visibilityWaitError = null;
  try {
    await waitForArticleListingVisible(page);
  } catch (error) {
    visibilityWaitError = error instanceof Error ? error.message : String(error);
  }

  const listing = await readArticleListing(page);
  const headingPresent = await page.evaluate(() =>
    Boolean(document.querySelector(".achievements .listing h2")),
  );
  recordCheck(
    `${browserName} ${viewport.name} achievements listing fails open when its heading is missing`,
    !headingPresent &&
      visibilityWaitError === null &&
      articleListingPasses(listing),
    { headingPresent, visibilityWaitError, listing },
  );

  await context.close();
};

const readPersistentWatcherCallbackCounts = (page) =>
  page.evaluate(() => {
    const lifecycle = window.__homepageLegacyLifecycle;
    const count = (watcher) => watcher?.callbacks?.enterViewport?.length ?? null;

    return {
      nominations: count(lifecycle?.nominationsWatcher),
      ribbons: count(lifecycle?.ribbonsWatcher),
      listings: count(lifecycle?.listingsWatcher),
      skills: count(lifecycle?.skillsWatcher),
      logos: count(lifecycle?.logosWatcher),
    };
  });

const navigateHashAndMeasure = async (page, hash, expectedPage) => {
  const startedAt = Date.now();
  await page.evaluate((nextHash) => {
    window.location.hash = nextHash;
  }, hash);
  await waitForRoutePage(page, expectedPage);
  return Date.now() - startedAt;
};

const runPersistentWatcherAndAchievementsExitCheck = async (
  browserName,
  browser,
  viewport,
  recordCheck,
  events,
) => {
  const context = await newContextForViewport(browser, viewport);
  const page = await createHarnessPage(context, viewport, events, {
    baseUrl: BASE_URL,
  });

  await gotoRoute(page, "#/achievements/");
  await waitForContentPayload(page);
  const initialCounts = await readPersistentWatcherCallbackCounts(page);
  const cycles = [];

  for (let cycle = 1; cycle <= 5; cycle += 1) {
    const achievementsExitMs = await navigateHashAndMeasure(
      page,
      "#/about/",
      "about",
    );
    const achievementsEnterMs = await navigateHashAndMeasure(
      page,
      "#/achievements/",
      "achievements",
    );
    cycles.push({
      cycle,
      achievementsExitMs,
      achievementsEnterMs,
      callbackCounts: await readPersistentWatcherCallbackCounts(page),
    });
  }

  const finalCounts = cycles.at(-1)?.callbackCounts ?? {};
  const maximumExitMs = Math.max(
    ...cycles.map((cycle) => cycle.achievementsExitMs),
  );
  const maximumEnterMs = Math.max(
    ...cycles.map((cycle) => cycle.achievementsEnterMs),
  );
  const watcherCountsStable =
    initialCounts.nominations === 1 &&
    initialCounts.ribbons === 1 &&
    initialCounts.listings === 1 &&
    cycles.every(
      ({ callbackCounts }) =>
        callbackCounts.nominations === 1 &&
        callbackCounts.ribbons === 1 &&
        callbackCounts.listings === 1 &&
        callbackCounts.skills === 1 &&
        callbackCounts.logos === 1,
    );

  recordCheck(
    `${browserName} ${viewport.name} persistent reveal watcher callbacks stay bounded across five route cycles`,
    watcherCountsStable,
    { initialCounts, finalCounts, cycles },
  );
  recordCheck(
    `${browserName} ${viewport.name} achievements exit remains below 1200ms across five route cycles`,
    maximumExitMs < 1200,
    { maximumExitMs, cycles },
  );
  recordCheck(
    `${browserName} ${viewport.name} achievements entry remains below 1200ms across five route cycles`,
    maximumEnterMs < 1200,
    { maximumEnterMs, cycles },
  );

  await context.close();
};

const runTouchTargetCheck = async (browserName, browser, viewport, recordCheck, events) => {
  const context = await newContextForViewport(browser, viewport);
  const page = await createHarnessPage(context, viewport, events, { baseUrl: BASE_URL });

  await gotoRoute(page, "#/contact/");
  await sleep(1600);

  const boxes = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll(".contact-icons .social-link")).filter(
      (el) => el.getClientRects().length > 0,
    );
    return links.map((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
    });
  });

  const allBigEnough = boxes.length > 0 && boxes.every((b) => b.w >= 44 && b.h >= 44);
  recordCheck(
    `${browserName} ${viewport.name} social hit-boxes >= 44x44`,
    allBigEnough,
    { boxes },
  );

  const tops = boxes.map((b) => b.top);
  const rowTops = [];
  for (const t of tops) {
    if (!rowTops.some((rt) => Math.abs(rt - t) < 8)) {
      rowTops.push(t);
    }
  }
  const rows = rowTops.length;

  const firstRowTop = tops.length ? Math.min(...tops) : 0;
  const firstRowTops = tops.filter((t) => Math.abs(t - firstRowTop) < 8);
  const maxDelta = firstRowTops.length
    ? Math.max(...firstRowTops) - Math.min(...firstRowTops)
    : 0;
  recordCheck(
    `${browserName} ${viewport.name} social icons baseline aligned`,
    maxDelta <= 2,
    { maxDelta, tops },
  );

  recordCheck(
    `${browserName} ${viewport.name} social icons single symmetric row`,
    rows === 1,
    { rows, tops },
  );

  await context.close();
};

const runMenuCheck = async (browserName, browser, viewport, recordCheck, events) => {
  const context = await newContextForViewport(browser, viewport);
  const page = await createHarnessPage(context, viewport, events, { baseUrl: BASE_URL });

  await gotoRoute(page, "#/hello/");
  // Wait for hello reveal to settle; locking mid-animation measures a transient height.
  await sleep(1600);

  await page.evaluate(() => window.scrollTo(0, 300));
  await sleep(200);
  const preScrollY = await page.evaluate(() => Math.round(window.scrollY));

  await page.evaluate(() => {
    const btn = document.querySelector(".header .menu");
    btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await sleep(500);

  const openState = await page.evaluate(() => {
    const btn = document.querySelector(".header .menu");
    const main = document.querySelector("#main");
    return {
      active: btn?.classList.contains("active") ?? false,
      ariaExpanded: btn?.getAttribute("aria-expanded"),
      ariaControls: btn?.getAttribute("aria-controls"),
      bodyPosition: getComputedStyle(document.body).position,
      bodyTop: document.body.style.top,
      menuOpenClass: document.body.classList.contains("menu-open"),
      mainInert: main?.hasAttribute("inert") ?? false,
    };
  });

  const isMobile = viewport.width < 1024;
  recordCheck(
    `${browserName} ${viewport.name} menu open: aria-expanded=true + aria-controls`,
    openState.active &&
      openState.ariaExpanded === "true" &&
      openState.ariaControls === "primary-nav",
    openState,
  );

  if (isMobile) {
    recordCheck(
      `${browserName} ${viewport.name} menu open: body scroll locked (fixed @ negative offset)`,
      openState.bodyPosition === "fixed" &&
        /^-\d+px$/.test(openState.bodyTop) &&
        openState.menuOpenClass,
      { ...openState, preScrollY },
    );
    recordCheck(
      `${browserName} ${viewport.name} menu open: background inert`,
      openState.mainInert === true,
      openState,
    );
  } else {
    recordCheck(
      `${browserName} ${viewport.name} desktop menu does NOT lock scroll/inert`,
      openState.bodyPosition !== "fixed" &&
        !openState.menuOpenClass &&
        openState.mainInert === false,
      openState,
    );
  }

  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await sleep(500);

  const closedState = await page.evaluate(() => {
    const btn = document.querySelector(".header .menu");
    const main = document.querySelector("#main");
    return {
      active: btn?.classList.contains("active") ?? false,
      ariaExpanded: btn?.getAttribute("aria-expanded"),
      bodyPosition: document.body.style.position || getComputedStyle(document.body).position,
      menuOpenClass: document.body.classList.contains("menu-open"),
      mainInert: main?.hasAttribute("inert") ?? false,
      scrollY: window.scrollY,
      focusOnMenu: document.activeElement?.classList.contains("menu") ?? false,
    };
  });

  if (isMobile) {
    // Assert against bodyTop locked at open — pre-open scrollY can differ by a beat.
    const lockedY = Math.abs(Number.parseInt(openState.bodyTop, 10)) || 0;
    recordCheck(
      `${browserName} ${viewport.name} Escape closes + restores scroll to locked offset (${lockedY})`,
      !closedState.active &&
        closedState.ariaExpanded === "false" &&
        !closedState.menuOpenClass &&
        closedState.mainInert === false &&
        Math.abs(closedState.scrollY - lockedY) <= 2,
      { ...closedState, lockedY },
    );
    recordCheck(
      `${browserName} ${viewport.name} Escape returns focus to menu button`,
      closedState.focusOnMenu === true,
      closedState,
    );
  }

  await context.close();
};

const engines = [
  { name: "chromium", launcher: chromium },
  { name: "webkit", launcher: webkit },
];

const writeReport = async (result) => {
  await ensureDir(OUT_DIR);
  await writeJsonFile(path.join(OUT_DIR, "mobile-responsive-verification.json"), result);

  const lines = [
    "# Mobile Responsive Verification",
    "",
    `- Run id: \`${result.runId}\``,
    `- Base URL: \`${result.baseUrl}\``,
    `- Checks passed: ${result.checks.filter((c) => c.passed).length}`,
    `- Checks failed: ${result.failures.length}`,
    `- Engines: ${engines.map((e) => e.name).join(", ")}`,
    `- Console/page errors: ${result.browserErrors}`,
    "",
    "## Failures",
    "",
    ...(result.failures.length
      ? result.failures.map((failure) =>
          `- ${failure.name}: ${JSON.stringify(failure.details)}`,
        )
      : ["- none"]),
    "",
  ];
  await writeTextFile(path.join(OUT_DIR, "mobile-responsive-verification.md"), lines.join("\n"));
};

const main = async () => {
  const { checks, recordCheck } = createCheckRecorder();
  const eventGroups = [];
  let browserErrors = 0;

  for (const engine of engines) {
    const browser = await engine.launcher.launch();
    try {
      for (const viewport of ALL_VIEWPORTS) {
        const events = createBrowserEvents();
        eventGroups.push(events);
        await runOverflowChecks(engine.name, browser, viewport, recordCheck, events);
      }

      for (const viewport of [MOBILE_320, MOBILE_390]) {
        const events = createBrowserEvents();
        eventGroups.push(events);
        await runWechatOverflowCheck(engine.name, browser, viewport, recordCheck, events);
      }

      for (const viewport of [...MOBILE_PORTRAIT, ...ADJACENCY]) {
        const events = createBrowserEvents();
        eventGroups.push(events);
        await runAchievementsLayoutCheck(
          engine.name,
          browser,
          viewport,
          recordCheck,
          events,
        );
      }

      for (const viewport of [MOBILE_390, TABLET_768, DESKTOP_1440]) {
        const events = createBrowserEvents();
        eventGroups.push(events);
        await runAchievementsArticleCheck(
          engine.name,
          browser,
          viewport,
          recordCheck,
          events,
        );
      }

      {
        const events = createBrowserEvents();
        eventGroups.push(events);
        await runSlowAchievementsArticleCheck(
          engine.name,
          browser,
          MOBILE_390,
          recordCheck,
          events,
        );
      }

      {
        const events = createBrowserEvents();
        eventGroups.push(events);
        await runPersistentWatcherAndAchievementsExitCheck(
          engine.name,
          browser,
          MOBILE_390,
          recordCheck,
          events,
        );
      }

      {
        const events = createBrowserEvents();
        eventGroups.push(events);
        await runAchievementsListingFailOpenCheck(
          engine.name,
          browser,
          MOBILE_390,
          recordCheck,
          events,
        );
      }

      for (const viewport of [MOBILE_320, MOBILE_390]) {
        const events = createBrowserEvents();
        eventGroups.push(events);
        await runTouchTargetCheck(engine.name, browser, viewport, recordCheck, events);
      }

      for (const viewport of [MOBILE_320, MOBILE_LANDSCAPE[0], DESKTOP_1440]) {
        const events = createBrowserEvents();
        eventGroups.push(events);
        await runMenuCheck(engine.name, browser, viewport, recordCheck, events);
      }
    } finally {
      await browser.close();
    }
  }

  for (const events of eventGroups) {
    browserErrors +=
      (events.console?.length ?? 0) + (events.pageErrors?.length ?? 0);
  }

  const result = {
    runId: RUN_ID,
    baseUrl: BASE_URL,
    checks,
    failures: checks.filter((c) => !c.passed),
    browserErrors,
  };

  await writeReport(result);

  if (result.failures.length > 0) {
    console.error(`Mobile responsive verification FAILED: ${result.failures.length}`);
    for (const failure of result.failures) {
      console.error(
        `  - ${failure.name}: ${JSON.stringify(failure.details)}`,
      );
    }
    console.error(OUT_DIR);
    process.exitCode = 1;
    return;
  }

  console.log(`Mobile responsive verification passed: ${checks.length} checks`);
  console.log(`Console/page errors: ${browserErrors}`);
  console.log(OUT_DIR);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
