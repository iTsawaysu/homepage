import { createNativeAnalytics, type NativeAnalytics } from "./analytics";
import {
  createArticleDetailWatcher,
  createCaseStudyDetailWatcher,
  type AggregateScrollWatcher,
} from "./detail-scroll-reveal";
import { initNativeLazyload } from "./lazyload";
import { initNativeLoaderHeaderMenu } from "./menu-header";
import { installNativeModernizr } from "./modernizr";
import { createNativeBaffle, type NativeBaffleInstance } from "./native-baffle";
import {
  createNativeScrollWatcher,
  type NativeScrollWatcher,
} from "./native-scroll-watcher";
import { showNativeToaster } from "./toaster";

type ContentPayload = {
  caseStudies: Array<{
    title: string;
    category: string;
    images: {
      small: string;
      large: {
        url: string;
        padding: number;
      };
    };
    url: {
      local: string;
      live: string | null;
    };
    tldr: string;
    role: string;
    challenges: string[];
    solutions: string[];
    technology: string[];
  }>;
  articles: Array<{
    title: string;
    url: string;
    content: string;
  }>;
};

type NativeLifecycleMethod = (...args: unknown[]) => unknown;

export type NativeLifecycleInstance = {
  currentPage: string;
  syncTime: number;
  caseStudies: ContentPayload["caseStudies"];
  articles: ContentPayload["articles"];
  contentPayloadReady: boolean;
  ind?: number;
  nextInd: number;
  caseStudyItem?: ContentPayload["caseStudies"][number];
  nextCaseStudyItem?: ContentPayload["caseStudies"][number];
  articleItem?: ContentPayload["articles"][number];
  nextArticleItem?: ContentPayload["articles"][number];
  bHello: NativeBaffleInstance;
  bAbout: NativeBaffleInstance;
  bAchievements: NativeBaffleInstance;
  bCoding: NativeBaffleInstance;
  bDesign: NativeBaffleInstance;
  bContact: NativeBaffleInstance;
  bCaseStudy: NativeBaffleInstance;
  bArticle: NativeBaffleInstance;
  bError: NativeBaffleInstance;
  bSkillsLabel: NativeBaffleInstance[];
  skillsWatcher: NativeScrollWatcher;
  logosWatcher: NativeScrollWatcher;
  ribbonsWatcher: NativeScrollWatcher;
  nominationsWatcher: NativeScrollWatcher;
  listingsWatcher: NativeScrollWatcher;
  caseStudyWatcher?: AggregateScrollWatcher;
  articleWatcher?: AggregateScrollWatcher;
  analytics: NativeAnalytics;
  populateData(payload: ContentPayload): void;
  createCaseStudyScrollMonitor(): void;
  destroyCaseStudyScrollMonitor(): void;
  createArticleScrollMonitor(): void;
  destroyArticleScrollMonitor(): void;
  exitCurrentSlide: NativeLifecycleMethod;
  switchSlide: NativeLifecycleMethod;
  resetSlide: NativeLifecycleMethod;
  enterHello: NativeLifecycleMethod;
  enterAbout: NativeLifecycleMethod;
  enterAchievements: NativeLifecycleMethod;
  enterCoding: NativeLifecycleMethod;
  enterDesign: NativeLifecycleMethod;
  enterCaseStudy: NativeLifecycleMethod;
  enterArticle: NativeLifecycleMethod;
  enterContact: NativeLifecycleMethod;
  enterError: NativeLifecycleMethod;
  setActiveNav: NativeLifecycleMethod;
  getCaseStudy: NativeLifecycleMethod;
  getArticle: NativeLifecycleMethod;
};

export type NativeRuntimeHost = {
  isReady(): boolean;
  lifecycle: NativeLifecycleInstance;
};

export const NATIVE_RUNTIME_READY_EVENT =
  "homepage:native-runtime-ready";

declare global {
  interface Window {
    __homepageNativeRuntime?: NativeRuntimeHost;
  }
}

const BAFFLE_OPTIONS = {
  characters: "█▓▒░",
  speed: 40,
} as const;

const noop: NativeLifecycleMethod = () => undefined;

const watcherForSelector = (selector: string): NativeScrollWatcher =>
  createNativeScrollWatcher(document.querySelectorAll(selector), -100);

const populateCards = (
  payload: ContentPayload,
  analytics: NativeAnalytics,
): void => {
  document.querySelectorAll<HTMLElement>(".card-link").forEach((card, index) => {
    const caseStudy = payload.caseStudies[index];

    if (!caseStudy) {
      return;
    }

    card.setAttribute("href", caseStudy.url.local);
    card.querySelectorAll<HTMLElement>(".lazy").forEach((lazy) => {
      lazy.style.backgroundImage = `url(${caseStudy.images.small})`;
      lazy.setAttribute("data-original", caseStudy.images.small);
    });

    const title = card.querySelector<HTMLElement>(".card-title");

    if (title) {
      title.textContent = caseStudy.title;
    }

    card.addEventListener("click", () => {
      analytics.clickEvent("Case Studies", caseStudy.title);
    });
  });
};

const populateArticleListing = (articles: ContentPayload["articles"]): void => {
  const list = document.querySelector<HTMLElement>(".achievements .listing ul");

  if (!list) {
    return;
  }

  list.replaceChildren(
    ...articles.map((article) => {
      const item = document.createElement("li");
      const link = document.createElement("a");

      link.setAttribute("href", article.url);
      link.setAttribute("itemprop", "url");
      link.textContent = article.title;
      item.append(link);

      return item;
    }),
  );
};

const refreshScrollWatchers = (): void => {
  if (typeof window.Event === "function") {
    window.dispatchEvent(new Event("scroll"));
    return;
  }

  const event = document.createEvent("Event");
  const initLegacyEvent = (event as Event & Record<string, unknown>)[
    "init" + "Event"
  ] as (type: string, bubbles: boolean, cancelable: boolean) => void;

  initLegacyEvent.call(event, "scroll", true, true);
  window.dispatchEvent(event);
};

const fetchContentPayload = async (
  lifecycle: NativeLifecycleInstance,
): Promise<void> => {
  try {
    const response = await fetch("/api/content", {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as ContentPayload;
    lifecycle.populateData(payload);
    lifecycle.contentPayloadReady = true;
    refreshScrollWatchers();
  } catch (error) {
    showNativeToaster(
      `Whoops! Something went wrong! Error (${
        error instanceof Error ? error.message : String(error)
      })`,
    );
  }
};

const createLifecycle = (analytics: NativeAnalytics): NativeLifecycleInstance => {
  const lifecycle: NativeLifecycleInstance = {
    currentPage: "hello",
    syncTime: 0.5,
    caseStudies: [],
    articles: [],
    contentPayloadReady: false,
    nextInd: 0,
    bHello: createNativeBaffle(".hello h1 .text", BAFFLE_OPTIONS),
    bAbout: createNativeBaffle(".about h1 .text", BAFFLE_OPTIONS),
    bAchievements: createNativeBaffle(
      ".achievements h1 .text",
      BAFFLE_OPTIONS,
    ),
    bCoding: createNativeBaffle(".coding h1 .text", BAFFLE_OPTIONS),
    bDesign: createNativeBaffle(".design h1 .text", BAFFLE_OPTIONS),
    bContact: createNativeBaffle(".contact h1 .text", BAFFLE_OPTIONS),
    bCaseStudy: createNativeBaffle(".case-study h1 .text", BAFFLE_OPTIONS),
    bArticle: createNativeBaffle(".article h1 .text", BAFFLE_OPTIONS),
    bError: createNativeBaffle(".error h1 .text", BAFFLE_OPTIONS),
    bSkillsLabel: Array.from(
      document.querySelectorAll<HTMLElement>(".skills__bar"),
      (_, index) =>
        createNativeBaffle(
          `.skills__bar:nth-child(${index + 1}) .skills__label`,
          BAFFLE_OPTIONS,
        ),
    ),
    skillsWatcher: watcherForSelector(".skills"),
    logosWatcher: watcherForSelector(".logos"),
    ribbonsWatcher: watcherForSelector(".ribbons"),
    nominationsWatcher: watcherForSelector(".nominations"),
    listingsWatcher: watcherForSelector(".listing"),
    analytics,
    populateData(payload) {
      this.caseStudies = payload.caseStudies;
      this.articles = payload.articles;
      populateCards(payload, analytics);
      populateArticleListing(payload.articles);
    },
    createCaseStudyScrollMonitor() {
      this.destroyCaseStudyScrollMonitor();
      this.caseStudyWatcher = createCaseStudyDetailWatcher();
    },
    destroyCaseStudyScrollMonitor() {
      this.caseStudyWatcher?.destroy();
      this.caseStudyWatcher = undefined;
    },
    createArticleScrollMonitor() {
      this.destroyArticleScrollMonitor();
      this.articleWatcher = createArticleDetailWatcher();
    },
    destroyArticleScrollMonitor() {
      this.articleWatcher?.destroy();
      this.articleWatcher = undefined;
    },
    exitCurrentSlide: noop,
    switchSlide: noop,
    resetSlide: noop,
    enterHello: noop,
    enterAbout: noop,
    enterAchievements: noop,
    enterCoding: noop,
    enterDesign: noop,
    enterCaseStudy: noop,
    enterArticle: noop,
    enterContact: noop,
    enterError: noop,
    setActiveNav: noop,
    getCaseStudy: noop,
    getArticle: noop,
  };

  return lifecycle;
};

export const initNativeRuntimeHost = (): NativeRuntimeHost => {
  if (window.__homepageNativeRuntime) {
    return window.__homepageNativeRuntime;
  }

  installNativeModernizr();

  const analytics = createNativeAnalytics();
  const lifecycle = createLifecycle(analytics);
  const host: NativeRuntimeHost = {
    isReady: () => true,
    lifecycle,
  };

  window.__homepageNativeRuntime = host;
  window.__homepageLegacyLifecycle = lifecycle;
  window.__homepageCaptureLegacyLifecycle?.(lifecycle);
  window.dispatchEvent(new Event(NATIVE_RUNTIME_READY_EVENT));

  analytics.init();
  initNativeLoaderHeaderMenu(analytics);
  initNativeLazyload();
  void fetchContentPayload(lifecycle);

  return host;
};

export const getNativeRuntimeHost = (): NativeRuntimeHost | null =>
  window.__homepageNativeRuntime ?? null;
