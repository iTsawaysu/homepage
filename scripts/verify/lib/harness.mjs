import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const createRunId = () => new Date().toISOString().replace(/[:.]/g, "-");

export const taskDir = (fallback) => process.env.TRELLIS_TASK_DIR ?? fallback;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const hashUrl = (baseUrl, hash) => `${baseUrl}/${hash}`;

const normalizeText = (value) => value.replace(/\s+/g, " ").trim();

export const htmlToText = (value) =>
  normalizeText(
    value
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );

export const createCheckRecorder = () => {
  const checks = [];

  const recordCheck = (name, passed, details = {}) => {
    checks.push({
      name,
      passed: Boolean(passed),
      details,
    });
  };

  return { checks, recordCheck };
};

export const createBrowserEvents = () => ({
  console: [],
  pageErrors: [],
  requestFailures: [],
  sameOriginHttpErrors: [],
});

const recordPageError = (events, error, pageErrorShape) => {
  if (pageErrorShape === "message") {
    events.pageErrors.push(error.message);
    return;
  }

  events.pageErrors.push({
    message: error.message,
    stack: error.stack,
  });
};

const attachPageEventCollectors = (
  page,
  events,
  {
    baseUrl,
    includeResponseStatusText = false,
    pageErrorShape = "object",
  } = {},
) => {
  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    events.console.push({
      text: message.text(),
      location: message.location(),
    });
  });

  page.on("pageerror", (error) => {
    recordPageError(events, error, pageErrorShape);
  });

  page.on("requestfailed", (request) => {
    events.requestFailures.push({
      url: request.url(),
      failure: request.failure()?.errorText ?? null,
    });
  });

  page.on("response", (response) => {
    const url = response.url();

    if (baseUrl && !url.startsWith(baseUrl)) {
      return;
    }

    if (response.status() < 400) {
      return;
    }

    const entry = {
      url,
      status: response.status(),
    };

    if (includeResponseStatusText) {
      entry.statusText = response.statusText();
    }

    events.sameOriginHttpErrors.push(entry);
  });
};

export const createHarnessPage = async (
  context,
  viewport,
  events,
  {
    baseUrl,
    initScript,
    initScriptPlacement = "after-events",
    includeResponseStatusText = false,
    pageErrorShape = "object",
    slowApiDelayMs,
    slowApiRoute = "**/api/content",
  } = {},
) => {
  const page = await context.newPage();
  await page.setViewportSize({ width: viewport.width, height: viewport.height });

  if (initScript && initScriptPlacement === "before-events") {
    await page.addInitScript(initScript);
  }

  attachPageEventCollectors(page, events, {
    baseUrl,
    includeResponseStatusText,
    pageErrorShape,
  });

  if (initScript && initScriptPlacement !== "before-events") {
    await page.addInitScript(initScript);
  }

  if (slowApiDelayMs) {
    await page.route(slowApiRoute, async (route) => {
      await sleep(slowApiDelayMs);
      const response = await route.fetch();
      await route.fulfill({ response });
    });
  }

  return page;
};

export const newContextForViewport = (browser, viewport) =>
  browser.newContext({
    isMobile: Boolean(viewport.isMobile),
    hasTouch: Boolean(viewport.hasTouch),
  });

export const ensureDir = (dirPath) => mkdir(dirPath, { recursive: true });

export const writeTextFile = async (filePath, text) => {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, text);
};

export const writeJsonFile = async (
  filePath,
  value,
  { trailingNewline = false } = {},
) => {
  await writeTextFile(
    filePath,
    `${JSON.stringify(value, null, 2)}${trailingNewline ? "\n" : ""}`,
  );
};

export const waitForRoutePage = async (page, expectedPage, timeout = 20000) => {
  await page.waitForFunction(
    (expected) => {
      const mirrorPage = window.__homepageRouteLifecycle?.getState?.()?.currentPage;
      if (mirrorPage === expected) {
        return true;
      }

      return window.__homepageLegacyLifecycle?.currentPage === expected;
    },
    expectedPage,
    { timeout },
  );
};

export const waitForRouteDetailTitle = async (
  page,
  kind,
  expectedTitle,
  timeout = 25000,
) => {
  await page.waitForFunction(
    ({ detailKind, title }) => {
      const state = window.__homepageRouteLifecycle?.getState?.();
      if (state) {
        const actual =
          detailKind === "case-study" ? state.caseStudyTitle : state.articleTitle;
        if (actual === title) {
          return true;
        }
      }

      const lifecycle = window.__homepageLegacyLifecycle;
      const item =
        detailKind === "case-study"
          ? lifecycle?.caseStudyItem
          : lifecycle?.articleItem;
      return item?.title === title;
    },
    { detailKind: kind, title: expectedTitle },
    { timeout },
  );
};
