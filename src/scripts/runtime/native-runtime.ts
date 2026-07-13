import { runAchievementsListingReveal } from "../animation/enter/enter-achievements";
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
  type PersistentNativeScrollWatcher,
} from "./native-scroll-watcher";
import {
  installRouteLifecycle,
  type RouteLifecycleBag,
} from "./route-lifecycle";
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

type NativeLifecycleInstance = RouteLifecycleBag & {
  caseStudies: ContentPayload["caseStudies"];
  articles: ContentPayload["articles"];
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
  skillsWatcher: PersistentNativeScrollWatcher;
  logosWatcher: PersistentNativeScrollWatcher;
  ribbonsWatcher: PersistentNativeScrollWatcher;
  nominationsWatcher: PersistentNativeScrollWatcher;
  listingsWatcher: PersistentNativeScrollWatcher;
  caseStudyWatcher?: AggregateScrollWatcher;
  articleWatcher?: AggregateScrollWatcher;
  analytics: NativeAnalytics;
  populateData(payload: ContentPayload): void;
  createCaseStudyScrollMonitor(): void;
  destroyCaseStudyScrollMonitor(): void;
  createArticleScrollMonitor(): void;
  destroyArticleScrollMonitor(): void;
};

type NativeRuntimeHost = {
  isReady(): boolean;
  lifecycle: NativeLifecycleInstance;
};

export const NATIVE_RUNTIME_READY_EVENT = "homepage:native-runtime-ready";

declare global {
  interface Window {
    __homepageNativeRuntime?: NativeRuntimeHost;
    /**
     * Test-instrumentation seam — NOT dead code, do not remove.
     * Production must use getRouteLifecycle(); this global exists so verify
     * scripts can (a) read state-bag fields not exposed by getState()
     * (nextCaseStudyItem/nextArticleItem/caseStudyWatcher/articleWatcher) and
     * (b) install a defineProperty setter whose trigger is the assignment
     * below — that setter wraps the bag's methods to record methodCalls/
     * watcherEvents for slide-baseline & detail-retry gate assertions.
     * Removing the assignment silently disables those probes.
     */
    __homepageLegacyLifecycle?: NativeLifecycleInstance;
  }
}

const BAFFLE_OPTIONS = {
  characters: "█▓▒░",
  speed: 40,
} as const;

/** Placeholder until installRouteLifecycle wires real implementations. */
const unboundMethod: NativeLifecycleMethod = () => {
  throw new Error("RouteLifecycle methods not wired yet");
};

const watcherForSelector = (selector: string): PersistentNativeScrollWatcher =>
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

    if (
      lifecycle.currentPage === "achievements" &&
      ["#/achievements", "#/achievements/"].includes(window.location.hash)
    ) {
      runAchievementsListingReveal(lifecycle);
    }

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
    caseStudies: [],
    articles: [],
    contentPayloadReady: false,
    nextInd: 0,
    bHello: createNativeBaffle(".hello h1 .text", BAFFLE_OPTIONS),
    bAbout: createNativeBaffle(".about h1 .text", BAFFLE_OPTIONS),
    bAchievements: createNativeBaffle(".achievements h1 .text", BAFFLE_OPTIONS),
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
    // Bound by installRouteLifecycle before any navigate.
    exitCurrentSlide: unboundMethod,
    switchSlide: unboundMethod,
    resetSlide: unboundMethod,
    enterHello: unboundMethod,
    enterAbout: unboundMethod,
    enterAchievements: unboundMethod,
    enterCoding: unboundMethod,
    enterDesign: unboundMethod,
    enterCaseStudy: unboundMethod,
    enterArticle: unboundMethod,
    enterContact: unboundMethod,
    enterError: unboundMethod,
    setActiveNav: unboundMethod,
    getCaseStudy: unboundMethod,
    getArticle: unboundMethod,
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

  // Wire methods + publish window.__homepageRouteLifecycle before ready.
  installRouteLifecycle(lifecycle);

  const host: NativeRuntimeHost = {
    isReady: () => true,
    lifecycle,
  };

  window.__homepageNativeRuntime = host;
  // Load-bearing test seam: verify-slide-lifecycle-baseline and
  // verify-detail-retry-and-watchers install a defineProperty setter here and
  // use THIS assignment to trigger wrapLifecycle() method-call instrumentation.
  // Do not remove — getState() snapshots cannot carry the live method objects
  // those probes wrap, and item/watcher fields (nextCaseStudyItem, watchers)
  // are not exposed by getState(). See route-lifecycle.getState() for prod reads.
  window.__homepageLegacyLifecycle = lifecycle;
  window.dispatchEvent(new Event(NATIVE_RUNTIME_READY_EVENT));

  analytics.init();
  initNativeLoaderHeaderMenu(analytics);
  initNativeLazyload();
  void fetchContentPayload(lifecycle);

  return host;
};
