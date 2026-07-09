export {
  ARTICLE_BACK_LISTING_CATEGORY,
  ARTICLE_BACK_LISTING_HREF,
  DETAIL_ROUTE_RETRY_CONTRACTS,
  getArticleBackListingCategory,
  getArticleBackListingHref,
  getDetailRouteRetryContract,
  getNextCircularIndex,
  type ActiveNavCategory,
  type CaseStudyCategory,
  type DetailRouteRetryContract,
} from "./routes";

export type ActiveNavApplyResult =
  | {
      ok: true;
      routeName: string;
      activated: boolean;
    }
  | {
      ok: false;
      routeName: string;
      reason: string;
    };

const escapeCssString = (value: string): string =>
  value.replace(/["\\\n\r\f]/g, (character) => {
    const codePoint = character.codePointAt(0);

    return typeof codePoint === "number"
      ? `\\${codePoint.toString(16)} `
      : "\\ ";
  });

export const applyActiveNavState = (
  routeName: string,
): ActiveNavApplyResult => {
  const primaryNav = document.querySelector(".primary-nav");

  if (!primaryNav) {
    return {
      ok: false,
      routeName,
      reason: "primary-nav-missing",
    };
  }

  try {
    primaryNav.querySelectorAll(".active").forEach((element) => {
      element.classList.remove("active");
    });

    const activeElement = primaryNav.querySelector(
      `.element-box[data-name="${escapeCssString(routeName)}"]`,
    );

    activeElement?.classList.add("active");

    return {
      ok: true,
      routeName,
      activated: Boolean(activeElement),
    };
  } catch (error) {
    return {
      ok: false,
      routeName,
      reason:
        error instanceof Error ? `selector-error:${error.message}` : "selector-error",
    };
  }
};
