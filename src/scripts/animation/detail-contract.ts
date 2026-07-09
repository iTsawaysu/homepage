import { LEGACY_ANIMATION_TIMINGS } from "./timings";

type DetailContractOwner =
  | "legacy"
  | "legacy-reused"
  | "ts-observed"
  | "ts-owned";
type DetailVisibleAnimationOwner = "legacy" | "ts-owned" | "mixed";

type DetailLifecycleMethodContract = {
  method:
    | "enterCaseStudy"
    | "enterArticle"
    | "getCaseStudy"
    | "getArticle"
    | "exitCurrentSlide"
    | "switchSlide"
    | "resetSlide";
  owner: DetailContractOwner;
  visibleAnimationOwner: "legacy" | "ts-owned";
  notes: string;
};

type DetailSelectorContract = {
  section: string;
  wrap: string;
  template: string;
  titleText: string;
  titleIcon: string;
  bar: string;
  sections: string;
  navigation: string;
  nextLink: string;
  backListingLink: string;
  revealTargets: readonly string[];
};

type DetailPayloadReadyContract = {
  contentEndpoint: "/api/content";
  contentReadyKey: "contentPayloadReady";
  routeDispatchDelayMs: number;
  contentRetryDelayMs: number;
  switchSlideRetryDelayMs: number;
  unknownSlugRedirect: "#/error";
};

type DetailScrollRevealContract = {
  owner: "ts-owned";
  scrollMonitorOwner: "ts-owned";
  thresholdPx: -100;
  caseStudyCreateMethod: "createCaseStudyScrollMonitor";
  caseStudyDestroyMethod: "destroyCaseStudyScrollMonitor";
  articleCreateMethod: "createArticleScrollMonitor";
  articleDestroyMethod: "destroyArticleScrollMonitor";
  recalculateAfterTitleReveal: true;
  revealTweenSeconds: 0.5;
};

type DetailLazyloadContract = {
  owner: "ts-owned";
  initializer: "native IntersectionObserver lazyload";
  dataAttribute: "data-original";
  effect: "fadeIn";
};

type DetailNavigationContract = {
  caseStudyBackListingByCategory: true;
  articleBackListingHref: "/#/achievements/";
  nextItemStrategy: "circular-next-index";
  caseStudyActiveNavSource: "caseStudyItem.category";
  articleActiveNavSource: "none";
};

export type DetailLifecycleContractState = {
  lifecycleMethods: readonly DetailLifecycleMethodContract[];
  payloadReady: DetailPayloadReadyContract;
  selectors: {
    caseStudy: DetailSelectorContract;
    article: DetailSelectorContract;
  };
  navigation: DetailNavigationContract;
  scrollReveal: DetailScrollRevealContract;
  lazyload: DetailLazyloadContract;
  detailSlugSource: "content-payload-url";
  visibleAnimationOwner: DetailVisibleAnimationOwner;
  caseStudyVisibleAnimationOwner: "ts-owned";
  articleVisibleAnimationOwner: "ts-owned";
  titleBaffleOwner: "ts-owned";
};

const lifecycleMethods: readonly DetailLifecycleMethodContract[] = [
  {
    method: "enterCaseStudy",
    owner: "ts-owned",
    visibleAnimationOwner: "ts-owned",
    notes:
      "TypeScript owns only the case-study route-enter visible animation; it still reuses legacy bCaseStudy, createCaseStudyScrollMonitor, and caseStudyWatcher.recalculateLocation.",
  },
  {
    method: "enterArticle",
    owner: "ts-owned",
    visibleAnimationOwner: "ts-owned",
    notes:
      "TypeScript owns only the article route-enter visible animation; it still reuses legacy bArticle, createArticleScrollMonitor, and articleWatcher.recalculateLocation.",
  },
  {
    method: "getCaseStudy",
    owner: "ts-owned",
    visibleAnimationOwner: "legacy",
    notes:
      "TypeScript maps current slugs and aliases from the content payload to sorted payload indexes, owns payload-ready retry, computes circular next/listing data, and renders through the verified detail renderer.",
  },
  {
    method: "getArticle",
    owner: "ts-owned",
    visibleAnimationOwner: "legacy",
    notes:
      "TypeScript maps article URL slugs from the content payload to sorted payload indexes, owns payload-ready retry, computes circular next/listing data, and renders through the verified detail renderer.",
  },
  {
    method: "exitCurrentSlide",
    owner: "ts-owned",
    visibleAnimationOwner: "ts-owned",
    notes:
      "TypeScript owns outgoing route animation, detail watcher destruction dispatch, article metadata restoration, and switchSlide handoff while preserving legacy timing and quirks.",
  },
  {
    method: "switchSlide",
    owner: "ts-owned",
    visibleAnimationOwner: "legacy",
    notes:
      "TypeScript owns item-ready retry, section visibility, scroll-to-top, resetSlide dispatch, and target enter lifecycle dispatch; exit handoff is TypeScript-owned as of the slide-exit checkpoint.",
  },
  {
    method: "resetSlide",
    owner: "ts-owned",
    visibleAnimationOwner: "legacy",
    notes:
      "TypeScript owns pre-enter opacity, transform, width, glitch, and case-study detail reveal target reset while preserving legacy no-op selector behavior.",
  },
];

const caseStudySelectors: DetailSelectorContract = {
  section: ".case-study",
  wrap: ".case-study__wrap",
  template: "#case-study-template",
  titleText: ".case-study h1 .text",
  titleIcon: ".case-study h1 .icon",
  bar: ".case-study .bar",
  sections: ".case-study__section",
  navigation: ".case-study__wrap .navigation",
  nextLink: ".case-study__wrap .navigation a:not(.js-back-to-listing)",
  backListingLink: ".case-study__wrap .navigation a.js-back-to-listing",
  revealTargets: [
    ".case-study__section h2",
    ".case-study__section h3",
    ".case-study__section .col",
    ".case-study__section hr",
    ".case-study__section .pattern",
    ".case-study__section p",
    ".case-study__section li",
    ".case-study__section .cta",
  ],
};

const articleSelectors: DetailSelectorContract = {
  section: ".article",
  wrap: ".article__wrap",
  template: "#article-template",
  titleText: ".article h1 .text",
  titleIcon: ".article h1 .icon",
  bar: ".article .bar",
  sections: ".article__section",
  navigation: ".article__wrap .navigation",
  nextLink: ".article__wrap .navigation a:not(.js-back-to-listing)",
  backListingLink: ".article__wrap .navigation a.js-back-to-listing",
  revealTargets: [
    ".article__section h2",
    ".article__section h3",
    ".article__section .col",
    ".article__section hr",
    ".article__section .pattern",
    ".article__section p",
    ".article__section code",
    ".article__section li",
    ".article__section img",
    ".article__section .cta",
  ],
};

export const getDetailLifecycleContractState =
  (): DetailLifecycleContractState => ({
    lifecycleMethods,
    payloadReady: {
      contentEndpoint: "/api/content",
      contentReadyKey: "contentPayloadReady",
      routeDispatchDelayMs: LEGACY_ANIMATION_TIMINGS.detailRouteDispatchDelayMs,
      contentRetryDelayMs: LEGACY_ANIMATION_TIMINGS.contentPayloadRetryDelayMs,
      switchSlideRetryDelayMs: LEGACY_ANIMATION_TIMINGS.switchSlideRetryDelayMs,
      unknownSlugRedirect: "#/error",
    },
    selectors: {
      caseStudy: caseStudySelectors,
      article: articleSelectors,
    },
    navigation: {
      caseStudyBackListingByCategory: true,
      articleBackListingHref: "/#/achievements/",
      nextItemStrategy: "circular-next-index",
      caseStudyActiveNavSource: "caseStudyItem.category",
      articleActiveNavSource: "none",
    },
    scrollReveal: {
      owner: "ts-owned",
      scrollMonitorOwner: "ts-owned",
      thresholdPx: -100,
      caseStudyCreateMethod: "createCaseStudyScrollMonitor",
      caseStudyDestroyMethod: "destroyCaseStudyScrollMonitor",
      articleCreateMethod: "createArticleScrollMonitor",
      articleDestroyMethod: "destroyArticleScrollMonitor",
      recalculateAfterTitleReveal: true,
      revealTweenSeconds: 0.5,
    },
    lazyload: {
      owner: "ts-owned",
      initializer: "native IntersectionObserver lazyload",
      dataAttribute: "data-original",
      effect: "fadeIn",
    },
    detailSlugSource: "content-payload-url",
    visibleAnimationOwner: "ts-owned",
    caseStudyVisibleAnimationOwner: "ts-owned",
    articleVisibleAnimationOwner: "ts-owned",
    titleBaffleOwner: "ts-owned",
  });
