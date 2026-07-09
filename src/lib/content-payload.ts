import { getCollection } from "astro:content";

const normalizeBody = (body: string) =>
  body
    .replaceAll("/homepage/assets/", "/assets/")
    .replaceAll("/homepage/#/", "/#/");

const assertUniqueRoutes = <T>(
  items: T[],
  label: string,
  getRoute: (item: T) => string,
) => {
  const seen = new Map<string, number>();

  items.forEach((item, index) => {
    const route = getRoute(item);
    const existingIndex = seen.get(route);

    if (existingIndex !== undefined) {
      throw new Error(
        `${label} route "${route}" is duplicated by items ${existingIndex} and ${index}.`,
      );
    }

    seen.set(route, index);
  });
};

export const getContentPayload = async () => {
  const caseStudies = (await getCollection("caseStudies"))
    .sort((a, b) => a.data.order - b.data.order)
    .map((entry) => {
      const { order: _order, ...data } = entry.data;
      return data;
    });

  const articles = (await getCollection("articles"))
    .sort((a, b) => a.data.order - b.data.order)
    .map((entry) => ({
      title: entry.data.title,
      url: entry.data.url,
      content: normalizeBody(entry.body ?? ""),
    }));

  assertUniqueRoutes(caseStudies, "Case study", (caseStudy) =>
    caseStudy.url.local,
  );
  assertUniqueRoutes(articles, "Article", (article) => article.url);

  return {
    caseStudies,
    articles,
  };
};
