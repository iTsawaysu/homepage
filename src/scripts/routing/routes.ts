import { LEGACY_ANIMATION_TIMINGS } from "../animation/timings";

export const DEFAULT_HASH_ROUTE = "#/hello/" as const;
export const ERROR_ROUTE_NAME = "error" as const;
export const ARTICLE_BACK_LISTING_CATEGORY = "achievements" as const;
export const ARTICLE_BACK_LISTING_HREF = "/#/achievements/" as const;

const STATIC_ROUTE_CONTRACTS = [
  {
    kind: "static",
    page: "hello",
    hash: "#/hello/",
    activeNav: "hello",
  },
  {
    kind: "static",
    page: "about",
    hash: "#/about/",
    activeNav: "about",
  },
  {
    kind: "static",
    page: "achievements",
    hash: "#/achievements/",
    activeNav: "achievements",
  },
  {
    kind: "static",
    page: "coding",
    hash: "#/coding/",
    activeNav: "coding",
  },
  {
    kind: "static",
    page: "design",
    hash: "#/design/",
    activeNav: "design",
  },
  {
    kind: "static",
    page: "contact",
    hash: "#/contact/",
    activeNav: "contact",
  },
] as const;

export const CASE_STUDY_LEGACY_ALIASES_BY_CURRENT_SLUG = {
  "cc-switch": "elements",
  "open-design": "physical-web",
  kaku: "adelphi-digital",
  "ai-design-workflow": "homepage-beta",
  "design-to-frontend-components": "the-jewel-box",
  "small-design-system": "envirobot",
} as const satisfies Record<string, string>;

// Delay numbers are MotionScale-sourced; structural route fields stay here.
export const DETAIL_ROUTE_RETRY_CONTRACTS = {
  "case-study": {
    kind: "case-study",
    targetPage: "case-study",
    hashPrefix: "#/case-study/",
    collectionKey: "caseStudies",
    itemKey: "caseStudyItem",
    getMethod: "getCaseStudy",
    setMethod: "setCaseStudy",
    routeDispatchDelayMs: LEGACY_ANIMATION_TIMINGS.detailRouteDispatchDelayMs,
    contentPayloadReadyKey: "contentPayloadReady",
    contentRetryDelayMs: LEGACY_ANIMATION_TIMINGS.contentPayloadRetryDelayMs,
    switchSlideRetryDelayMs: LEGACY_ANIMATION_TIMINGS.switchSlideRetryDelayMs,
  },
  article: {
    kind: "article",
    targetPage: "article",
    hashPrefix: "#/article/",
    collectionKey: "articles",
    itemKey: "articleItem",
    getMethod: "getArticle",
    setMethod: "setArticle",
    routeDispatchDelayMs: LEGACY_ANIMATION_TIMINGS.detailRouteDispatchDelayMs,
    contentPayloadReadyKey: "contentPayloadReady",
    contentRetryDelayMs: LEGACY_ANIMATION_TIMINGS.contentPayloadRetryDelayMs,
    switchSlideRetryDelayMs: LEGACY_ANIMATION_TIMINGS.switchSlideRetryDelayMs,
  },
} as const;

type StaticRouteContract = (typeof STATIC_ROUTE_CONTRACTS)[number];
export type StaticRouteName = StaticRouteContract["page"];
export type StaticHashRoute = StaticRouteContract["hash"];
export type CaseStudyCategory = "coding" | "design";
type CaseStudySlug = string;
type ArticleSlug = string;
type ArticleHashRoute = `#/article/${string}`;
type CaseStudyHashRoute = `#/case-study/${string}`;
export type RouteKind = "static" | "case-study" | "article" | "error";
export type DetailRouteKind = "case-study" | "article";
export type ActiveNavCategory = StaticRouteName | CaseStudyCategory;
export type DetailRouteRetryContract =
  (typeof DETAIL_ROUTE_RETRY_CONTRACTS)[DetailRouteKind];


export type StaticRouteTarget = {
  kind: "static";
  hash: StaticHashRoute;
  page: StaticRouteName;
  targetPage: StaticRouteName;
  activeNav: StaticRouteName;
};

type CaseStudyRouteTarget = {
  kind: "case-study";
  hash: CaseStudyHashRoute;
  page: "case-study";
  targetPage: "case-study";
  slug: CaseStudySlug;
  activeNav: null;
  retry: typeof DETAIL_ROUTE_RETRY_CONTRACTS["case-study"];
};

type ArticleRouteTarget = {
  kind: "article";
  hash: ArticleHashRoute;
  page: "article";
  targetPage: "article";
  slug: ArticleSlug;
  activeNav: null;
  backListingCategory: typeof ARTICLE_BACK_LISTING_CATEGORY;
  backListingHref: typeof ARTICLE_BACK_LISTING_HREF;
  retry: typeof DETAIL_ROUTE_RETRY_CONTRACTS["article"];
};

export type ErrorRouteTarget = {
  kind: "error";
  hash: string;
  page: typeof ERROR_ROUTE_NAME;
  targetPage: typeof ERROR_ROUTE_NAME;
  activeNav: null;
  reason: "unknown-hash" | "unknown-case-study" | "unknown-article";
};

export type LegacyHashRouteTarget =
  | StaticRouteTarget
  | CaseStudyRouteTarget
  | ArticleRouteTarget
  | ErrorRouteTarget;


const STATIC_ROUTES_BY_HASH = new Map<string, StaticRouteContract>(
  STATIC_ROUTE_CONTRACTS.map((route) => [route.hash, route]),
);

const DETAIL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isArticleSlug = (value: string): value is ArticleSlug =>
  DETAIL_SLUG_PATTERN.test(value);

const isCaseStudySlug = (value: string): value is CaseStudySlug =>
  DETAIL_SLUG_PATTERN.test(value);

export const isStaticHashRoute = (value: string): value is StaticHashRoute =>
  STATIC_ROUTES_BY_HASH.has(value);

function articleHashFromSlug(slug: ArticleSlug): ArticleHashRoute {
  return `#/article/${slug}`;
}

function caseStudyHashFromSlug(
  slug: CaseStudySlug,
): CaseStudyHashRoute {
  return `#/case-study/${slug}`;
}

export function getNextCircularIndex(
  index: number,
  total: number,
): number | null {
  if (
    !Number.isInteger(index) ||
    !Number.isInteger(total) ||
    total <= 0 ||
    index < 0 ||
    index >= total
  ) {
    return null;
  }

  return index + 1 === total ? 0 : index + 1;
}

export const getArticleBackListingCategory = () => ARTICLE_BACK_LISTING_CATEGORY;

export const getArticleBackListingHref = () => ARTICLE_BACK_LISTING_HREF;

export const getDetailRouteRetryContract = (
  kind: DetailRouteKind,
): DetailRouteRetryContract => DETAIL_ROUTE_RETRY_CONTRACTS[kind];

export const normalizeLegacyHashInput = (input: string): string => {
  const trimmed = input.trim();

  if (trimmed === "" || trimmed === "#" || trimmed === "/") {
    return DEFAULT_HASH_ROUTE;
  }

  try {
    const parsed = new URL(trimmed, "http://local.invalid");

    if (parsed.hash) {
      return parsed.hash;
    }
  } catch {}

  if (trimmed.startsWith("#")) {
    return trimmed;
  }

  if (trimmed.startsWith("/#")) {
    return trimmed.slice(1);
  }

  return `#/${trimmed.replace(/^\/+/, "")}`;
};

export function parseLegacyHashRoute(input: string): LegacyHashRouteTarget {
  const hash = normalizeLegacyHashInput(input);
  const staticRoute = STATIC_ROUTES_BY_HASH.get(hash);

  if (staticRoute) {
    return {
      kind: "static",
      hash: staticRoute.hash,
      page: staticRoute.page,
      targetPage: staticRoute.page,
      activeNav: staticRoute.activeNav,
    };
  }

  const caseStudyMatch = hash.match(/^#\/case-study\/([a-z0-9-]+)$/);

  if (caseStudyMatch) {
    const slug = caseStudyMatch[1];

    if (!isCaseStudySlug(slug)) {
      return {
        kind: "error",
        hash,
        page: ERROR_ROUTE_NAME,
        targetPage: ERROR_ROUTE_NAME,
        activeNav: null,
        reason: "unknown-case-study",
      };
    }

    return {
      kind: "case-study",
      hash: caseStudyHashFromSlug(slug),
      page: "case-study",
      targetPage: "case-study",
      slug,
      activeNav: null,
      retry: DETAIL_ROUTE_RETRY_CONTRACTS["case-study"],
    };
  }

  const articleMatch = hash.match(/^#\/article\/([a-z0-9-]+)$/);

  if (articleMatch) {
    const slug = articleMatch[1];

    if (!isArticleSlug(slug)) {
      return {
        kind: "error",
        hash,
        page: ERROR_ROUTE_NAME,
        targetPage: ERROR_ROUTE_NAME,
        activeNav: null,
        reason: "unknown-article",
      };
    }

    return {
      kind: "article",
      hash: articleHashFromSlug(slug),
      page: "article",
      targetPage: "article",
      slug,
      activeNav: null,
      backListingCategory: ARTICLE_BACK_LISTING_CATEGORY,
      backListingHref: ARTICLE_BACK_LISTING_HREF,
      retry: DETAIL_ROUTE_RETRY_CONTRACTS.article,
    };
  }

  return {
    kind: "error",
    hash,
    page: ERROR_ROUTE_NAME,
    targetPage: ERROR_ROUTE_NAME,
    activeNav: null,
    reason: "unknown-hash",
  };
}
