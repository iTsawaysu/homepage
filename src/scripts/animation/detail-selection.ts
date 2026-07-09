import { renderArticle } from "../renderers/article";
import { renderCaseStudy } from "../renderers/case-study";
import { applyActiveNavState } from "../routing/nav-state";
import {
  CASE_STUDY_LEGACY_ALIASES_BY_CURRENT_SLUG,
  DETAIL_ROUTE_RETRY_CONTRACTS,
  getNextCircularIndex,
} from "../routing/routes";

type DetailSelectionResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: string;
    };

type DetailSelectionFailure = Extract<DetailSelectionResult, { ok: false }>;

type CaseStudyPayloadItem = {
  title?: unknown;
  category?: unknown;
  tldr?: unknown;
  role?: unknown;
  challenges?: readonly unknown[] | null;
  solutions?: readonly unknown[] | null;
  technology?: readonly unknown[] | null;
  images?: {
    large?: {
      url?: unknown;
      padding?: unknown;
    };
  };
  url?: {
    live?: unknown;
    local?: unknown;
  };
};

type ArticlePayloadItem = {
  title?: unknown;
  url?: unknown;
  content?: unknown;
};

type DetailSelectionLegacyState = {
  ind?: unknown;
  nextInd?: unknown;
  contentPayloadReady?: unknown;
  caseStudies?: unknown;
  articles?: unknown;
  caseStudyItem?: unknown;
  nextCaseStudyItem?: unknown;
  articleItem?: unknown;
  nextArticleItem?: unknown;
};

const redirectToLegacyErrorRoute = (): void => {
  window.location.href = "#/error";
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  (typeof value === "object" && value !== null) || typeof value === "function";

const isCaseStudyPayloadItem = (
  value: unknown,
): value is CaseStudyPayloadItem => isObjectRecord(value);

const isArticlePayloadItem = (value: unknown): value is ArticlePayloadItem =>
  isObjectRecord(value);

const getCaseStudies = (
  legacyState: DetailSelectionLegacyState,
): CaseStudyPayloadItem[] | DetailSelectionFailure => {
  if (!Array.isArray(legacyState.caseStudies)) {
    return {
      ok: false,
      reason: "case-studies-missing",
    };
  }

  return legacyState.caseStudies;
};

const getArticles = (
  legacyState: DetailSelectionLegacyState,
): ArticlePayloadItem[] | DetailSelectionFailure => {
  if (!Array.isArray(legacyState.articles)) {
    return {
      ok: false,
      reason: "articles-missing",
    };
  }

  return legacyState.articles;
};

const getLegacyCaseStudyAlias = (currentSlug: string): string | undefined =>
  (CASE_STUDY_LEGACY_ALIASES_BY_CURRENT_SLUG as Record<string, string>)[
    currentSlug
  ];

const getContentRouteSlug = (
  url: unknown,
  kind: "article" | "case-study",
): string | null => {
  if (typeof url !== "string") {
    return null;
  }

  const match = url.match(
    new RegExp(`^/#/${kind}/([a-z0-9]+(?:-[a-z0-9]+)*)$`),
  );

  return match?.[1] ?? null;
};

const getCaseStudyIndexByPayloadSlug = (
  caseStudies: readonly CaseStudyPayloadItem[],
  slug: string,
): number =>
  caseStudies.findIndex((caseStudy) => {
    const currentSlug = getContentRouteSlug(caseStudy.url?.local, "case-study");

    if (!currentSlug) {
      return false;
    }

    return currentSlug === slug || getLegacyCaseStudyAlias(currentSlug) === slug;
  });

const getArticleIndexByPayloadSlug = (
  articles: readonly ArticlePayloadItem[],
  slug: string,
): number =>
  articles.findIndex(
    (article) => getContentRouteSlug(article.url, "article") === slug,
  );

const isFailure = <T>(
  value: T | DetailSelectionFailure,
): value is DetailSelectionFailure =>
  isObjectRecord(value) && value.ok === false;

const getWrapElement = (
  selector: string,
): Element | DetailSelectionFailure => {
  const element = document.querySelector(selector);

  if (!element) {
    return {
      ok: false,
      reason: `dom-missing:${selector}`,
    };
  }

  return element;
};

const retryWhenPayloadNotReady = (
  callback: () => void,
  delayMs: number,
): void => {
  window.setTimeout(function retryDetailSelectionPayload() {
    callback();
  }, delayMs);
};

const setCaseStudyByIndex = (
  legacyState: DetailSelectionLegacyState,
  index: number,
): DetailSelectionResult => {
  const caseStudies = getCaseStudies(legacyState);

  if (isFailure(caseStudies)) {
    return caseStudies;
  }

  const caseStudyItem = caseStudies[index];

  if (!isCaseStudyPayloadItem(caseStudyItem)) {
    if (legacyState.contentPayloadReady) {
      redirectToLegacyErrorRoute();
    } else {
      retryWhenPayloadNotReady(
        () => {
          setCaseStudyByIndex(legacyState, index);
        },
        DETAIL_ROUTE_RETRY_CONTRACTS["case-study"].contentRetryDelayMs,
      );
    }

    return {
      ok: true,
    };
  }

  const nextIndex = getNextCircularIndex(index, caseStudies.length);

  if (nextIndex === null) {
    return {
      ok: false,
      reason: "case-study-next-index-invalid",
    };
  }

  const nextCaseStudyItem = caseStudies[nextIndex];

  if (!isCaseStudyPayloadItem(nextCaseStudyItem)) {
    return {
      ok: false,
      reason: "case-study-next-item-missing",
    };
  }

  const wrap = getWrapElement(".case-study__wrap");

  if (isFailure(wrap)) {
    return wrap;
  }

  legacyState.ind = index;
  legacyState.nextInd = nextIndex;
  legacyState.caseStudyItem = caseStudyItem;
  legacyState.nextCaseStudyItem = nextCaseStudyItem;

  applyActiveNavState(String(caseStudyItem.category));

  wrap.innerHTML = renderCaseStudy({
    title: caseStudyItem.title,
    image: caseStudyItem.images?.large?.url,
    padding: caseStudyItem.images?.large?.padding,
    tldr: caseStudyItem.tldr,
    url: {
      live: caseStudyItem.url?.live,
    },
    role: caseStudyItem.role,
    challenges: caseStudyItem.challenges,
    solutions: caseStudyItem.solutions,
    technology: caseStudyItem.technology,
    category: caseStudyItem.category,
    nextItem: {
      url: nextCaseStudyItem.url?.local,
      title: nextCaseStudyItem.title,
    },
  });

  return {
    ok: true,
  };
};

const setArticleByIndex = (
  legacyState: DetailSelectionLegacyState,
  index: number,
): DetailSelectionResult => {
  const articles = getArticles(legacyState);

  if (isFailure(articles)) {
    return articles;
  }

  const articleItem = articles[index];

  if (!isArticlePayloadItem(articleItem)) {
    if (legacyState.contentPayloadReady) {
      redirectToLegacyErrorRoute();
    } else {
      retryWhenPayloadNotReady(
        () => {
          setArticleByIndex(legacyState, index);
        },
        DETAIL_ROUTE_RETRY_CONTRACTS.article.contentRetryDelayMs,
      );
    }

    return {
      ok: true,
    };
  }

  const nextIndex = getNextCircularIndex(index, articles.length);

  if (nextIndex === null) {
    return {
      ok: false,
      reason: "article-next-index-invalid",
    };
  }

  const nextArticleItem = articles[nextIndex];

  if (!isArticlePayloadItem(nextArticleItem)) {
    return {
      ok: false,
      reason: "article-next-item-missing",
    };
  }

  const wrap = getWrapElement(".article__wrap");

  if (isFailure(wrap)) {
    return wrap;
  }

  legacyState.ind = index;
  legacyState.nextInd = nextIndex;
  legacyState.articleItem = articleItem;
  legacyState.nextArticleItem = nextArticleItem;

  wrap.innerHTML = renderArticle({
    content: articleItem.content,
    nextItem: {
      url: nextArticleItem.url,
      title: nextArticleItem.title,
    },
  });

  return {
    ok: true,
  };
};

export const runGetCaseStudySelection = (
  legacyState: DetailSelectionLegacyState,
  slug: string,
): DetailSelectionResult => {
  const caseStudies = getCaseStudies(legacyState);

  if (isFailure(caseStudies)) {
    if (!legacyState.contentPayloadReady) {
      retryWhenPayloadNotReady(
        () => {
          runGetCaseStudySelection(legacyState, slug);
        },
        DETAIL_ROUTE_RETRY_CONTRACTS["case-study"].contentRetryDelayMs,
      );
      return {
        ok: true,
      };
    }

    return caseStudies;
  }

  const index = getCaseStudyIndexByPayloadSlug(caseStudies, slug);

  if (index === -1) {
    if (legacyState.contentPayloadReady) {
      redirectToLegacyErrorRoute();
    } else {
      retryWhenPayloadNotReady(
        () => {
          runGetCaseStudySelection(legacyState, slug);
        },
        DETAIL_ROUTE_RETRY_CONTRACTS["case-study"].contentRetryDelayMs,
      );
    }

    return {
      ok: true,
    };
  }

  return setCaseStudyByIndex(legacyState, index);
};

export const runGetArticleSelection = (
  legacyState: DetailSelectionLegacyState,
  slug: string,
): DetailSelectionResult => {
  const articles = getArticles(legacyState);

  if (isFailure(articles)) {
    if (!legacyState.contentPayloadReady) {
      retryWhenPayloadNotReady(
        () => {
          runGetArticleSelection(legacyState, slug);
        },
        DETAIL_ROUTE_RETRY_CONTRACTS.article.contentRetryDelayMs,
      );
      return {
        ok: true,
      };
    }

    return articles;
  }

  const index = getArticleIndexByPayloadSlug(articles, slug);

  if (index === -1) {
    if (legacyState.contentPayloadReady) {
      redirectToLegacyErrorRoute();
    } else {
      retryWhenPayloadNotReady(
        () => {
          runGetArticleSelection(legacyState, slug);
        },
        DETAIL_ROUTE_RETRY_CONTRACTS.article.contentRetryDelayMs,
      );
    }

    return {
      ok: true,
    };
  }

  return setArticleByIndex(legacyState, index);
};
