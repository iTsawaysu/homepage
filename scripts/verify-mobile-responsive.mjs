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
  writeJsonFile,
  writeTextFile,
} from "./verify/lib/harness.mjs";

const BASE_URL = process.env.MOBILE_VERIFY_BASE_URL ?? "http://127.0.0.1:5174";
const TASK_DIR = taskDir(".trellis/tasks/07-10-mobile-responsive-adaptation");
const RUN_ID = createRunId();
const OUT_DIR = path.join(TASK_DIR, "research", `mobile-responsive-verification-${RUN_ID}`);

const MOBILE_PORTRAIT = [
  { name: "mobile-320x568", width: 320, height: 568, isMobile: true, hasTouch: true },
  { name: "mobile-360x800", width: 360, height: 800, isMobile: true, hasTouch: true },
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

const hashUrl = (hash) => `${BASE_URL}/${hash}`;

const gotoRoute = async (page, hash) => {
  await page.goto(hashUrl(hash), { waitUntil: "domcontentloaded" });
  await sleep(900);
};

const measureOverflow = (page) =>
  page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

const runOverflowChecks = async (browserName, browser, viewport, recordCheck, events) => {
  const context = await newContextForViewport(browser, viewport);
  const page = await createHarnessPage(context, viewport, events, { baseUrl: BASE_URL });

  for (const route of ROUTES) {
    await gotoRoute(page, route.hash);
    const { scrollWidth, innerWidth } = await measureOverflow(page);
    recordCheck(
      `${browserName} ${viewport.name} ${route.hash} no horizontal overflow`,
      scrollWidth <= innerWidth + OVERFLOW_TOLERANCE,
      { scrollWidth, innerWidth },
    );
  }

  await context.close();
};

const runWechatOverflowCheck = async (browserName, browser, viewport, recordCheck, events) => {
  const context = await newContextForViewport(browser, viewport);
  const page = await createHarnessPage(context, viewport, events, { baseUrl: BASE_URL });

  await gotoRoute(page, "#/contact/");

  const closed = await measureOverflow(page);
  recordCheck(
    `${browserName} ${viewport.name} contact wechat-card CLOSED no overflow`,
    closed.scrollWidth <= closed.innerWidth + OVERFLOW_TOLERANCE,
    closed,
  );

  await page.evaluate(() => {
    const btn = document.querySelector(".contact-icons .js-wechat-toggle");
    btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await sleep(400);

  const open = await measureOverflow(page);
  recordCheck(
    `${browserName} ${viewport.name} contact wechat-card OPEN no overflow`,
    open.scrollWidth <= open.innerWidth + OVERFLOW_TOLERANCE,
    open,
  );

  await context.close();
};

const runAchievementsGridCheck = async (browserName, browser, viewport, recordCheck, events) => {
  const context = await newContextForViewport(browser, viewport);
  const page = await createHarnessPage(context, viewport, events, { baseUrl: BASE_URL });

  await gotoRoute(page, "#/achievements/");
  // Measure after reveal settles; mid-animation frames under-count columns.
  await page.evaluate(() => {
    document.querySelector(".achievements .nominations")?.scrollIntoView();
  });
  await sleep(2600);

  const data = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".achievements .nominations li"));
    const visible = items.filter((li) => {
      const r = li.getBoundingClientRect();
      const s = getComputedStyle(li);
      return s.display !== "none" && r.width > 0;
    });
    // Distinct lefts, not first-row tops: stagger translateY breaks row banding.
    const distinctX = new Set(visible.map((li) => Math.round(li.getBoundingClientRect().left)));
    return { total: items.length, visible: visible.length, cols: distinctX.size };
  });

  if (viewport.target === false) {
    recordCheck(
      `${browserName} ${viewport.name} achievements baseline (cols=${data.cols}, visible=${data.visible}) not two-col-forced`,
      data.cols !== 2 || viewport.width < 768,
      data,
    );
  } else {
    recordCheck(
      `${browserName} ${viewport.name} achievements two columns, all 12 present`,
      data.cols === 2 && data.total === 12 && data.visible === 12,
      data,
    );
  }

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
      ? result.failures.map((f) => `- ${f.label}: ${JSON.stringify(f.detail)}`)
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

      for (const viewport of [MOBILE_PORTRAIT[0], MOBILE_PORTRAIT[2]]) {
        const events = createBrowserEvents();
        eventGroups.push(events);
        await runWechatOverflowCheck(engine.name, browser, viewport, recordCheck, events);
      }

      for (const viewport of [...MOBILE_PORTRAIT, ...ADJACENCY]) {
        const events = createBrowserEvents();
        eventGroups.push(events);
        await runAchievementsGridCheck(engine.name, browser, viewport, recordCheck, events);
      }

      for (const viewport of [MOBILE_PORTRAIT[0], MOBILE_PORTRAIT[2]]) {
        const events = createBrowserEvents();
        eventGroups.push(events);
        await runTouchTargetCheck(engine.name, browser, viewport, recordCheck, events);
      }

      for (const viewport of [MOBILE_PORTRAIT[0], MOBILE_LANDSCAPE[0], DESKTOP[1]]) {
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
      (events.consoleErrors?.length ?? 0) + (events.pageErrors?.length ?? 0);
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
    for (const f of result.failures) {
      console.error(`  - ${f.label}: ${JSON.stringify(f.detail)}`);
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
