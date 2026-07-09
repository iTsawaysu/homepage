import { renderArticle, type ArticleTemplateData } from "./renderers/article";
import { renderCaseStudy, type CaseStudyTemplateData } from "./renderers/case-study";

type LegacyTemplateRenderer = (data: unknown) => string;
type LegacyTemplateCompiler = (
  template: string,
  settings?: unknown,
  definitions?: unknown,
) => LegacyTemplateRenderer;

type LegacyDoT = {
  template: LegacyTemplateCompiler;
  __typedTemplateAdapterOriginal?: LegacyTemplateCompiler;
};

declare global {
  interface Window {
    doT?: LegacyDoT;
  }
}

const getTemplateSource = (id: string): string | null => {
  const template = document.getElementById(id);

  return template ? template.innerHTML : null;
};

const isSameTemplateSource = (source: string, reference: string | null): boolean =>
  Boolean(reference && (source === reference || source.trim() === reference.trim()));

export const installLegacyTemplateAdapter = (): boolean => {
  const legacyDoT = window.doT;

  if (!legacyDoT?.template) {
    return false;
  }

  if (legacyDoT.__typedTemplateAdapterOriginal) {
    return true;
  }

  const originalTemplate = legacyDoT.template;
  const caseStudyTemplateSource = getTemplateSource("case-study-template");
  const articleTemplateSource = getTemplateSource("article-template");

  legacyDoT.__typedTemplateAdapterOriginal = originalTemplate;
  legacyDoT.template = function templateAdapter(template, settings, definitions) {
    const source = String(template);

    if (isSameTemplateSource(source, caseStudyTemplateSource)) {
      return (data) => renderCaseStudy(data as CaseStudyTemplateData);
    }

    if (isSameTemplateSource(source, articleTemplateSource)) {
      return (data) => renderArticle(data as ArticleTemplateData);
    }

    return originalTemplate.call(this, template, settings, definitions);
  };

  return true;
};
