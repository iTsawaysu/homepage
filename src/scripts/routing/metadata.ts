export const SITE_TITLE = "iTsawaysu" as const;

const setMetaContent = (selector: string, content: string): void => {
  document.querySelector(selector)?.setAttribute("content", content);
};

export const updateStaticRouteMetadata = (): void => {
  document.title = SITE_TITLE;
  setMetaContent('meta[property="og:title"]', SITE_TITLE);
  setMetaContent('meta[name="twitter:title"]', SITE_TITLE);
  setMetaContent('meta[property="og:type"]', "website");
  setMetaContent('meta[property="og:site_name"]', SITE_TITLE);
};
