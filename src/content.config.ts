import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const caseStudies = defineCollection({
  loader: glob({
    base: "./src/content/case-studies",
    pattern: "**/*.json",
  }),
  schema: z.object({
    order: z.number().int().nonnegative(),
    title: z.string(),
    category: z.enum(["coding", "design"]),
    tldr: z.string(),
    role: z.string(),
    challenges: z.array(z.string()),
    solutions: z.array(z.string()),
    technology: z.array(z.string()),
    images: z.object({
      large: z.object({
        url: z.string(),
        padding: z.number(),
      }),
      small: z.string(),
    }),
    url: z.object({
      live: z.string().nullable(),
      local: z.string(),
    }),
  }),
});

const articles = defineCollection({
  loader: glob({
    base: "./src/content/articles",
    pattern: "**/*.md",
  }),
  schema: z.object({
    order: z.number().int().nonnegative(),
    title: z.string(),
    url: z.string(),
  }),
});

export const collections = {
  articles,
  caseStudies,
};
