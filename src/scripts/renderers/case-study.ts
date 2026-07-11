import {
  escapeLegacyHtml,
  renderLegacyRaw,
  renderLegacyRawList,
  renderLegacyTemplate,
} from "./html";

type CaseStudyTemplateData = {
  title: unknown;
  image: unknown;
  padding: unknown;
  tldr: unknown;
  url: {
    live: unknown;
  };
  role: unknown;
  challenges: readonly unknown[] | null | undefined;
  solutions: readonly unknown[] | null | undefined;
  technology: readonly unknown[] | null | undefined;
  category: unknown;
  nextItem: {
    url: unknown;
    title: unknown;
  };
};

const renderGlitchImage = (data: CaseStudyTemplateData): string => {
  const image = escapeLegacyHtml(data.image);
  const padding = escapeLegacyHtml(data.padding);
  const title = escapeLegacyHtml(data.title);
  const style = `background-image: url(${image}); padding-bottom:${padding}%;`;
  const imageHtml = renderLegacyTemplate`
              <div style="${style}" title="${title}" class="glitch__img"></div>`;

  return renderLegacyTemplate`
            <div style="${style}" title="${title}" class="glitch__cont">${imageHtml}${imageHtml}${imageHtml}${imageHtml}${imageHtml}
            </div>`;
};

const renderLiveLink = (data: CaseStudyTemplateData): string => {
  if (!data.url.live) {
    return "";
  }

  return renderLegacyTemplate`<a href="${escapeLegacyHtml(
    data.url.live,
  )}" data-text="访问网站" target="_blank" class="cta">访问网站</a>`;
};

const renderTechnologyItems = (data: CaseStudyTemplateData): string =>
  renderLegacyRawList(
    data.technology,
    (value) => renderLegacyTemplate`
                <li>${renderLegacyRaw(value)}</li>`,
  );

const renderChallengeItems = (data: CaseStudyTemplateData): string =>
  renderLegacyRawList(
    data.challenges,
    (value) => renderLegacyTemplate`
        <p>${renderLegacyRaw(value)}</p>`,
  );

const renderSolutionItems = (data: CaseStudyTemplateData): string =>
  renderLegacyRawList(
    data.solutions,
    (value) => renderLegacyTemplate`
        <p>${renderLegacyRaw(value)}</p>`,
  );

const renderChallengeSection = (data: CaseStudyTemplateData): string => {
  if (!data.challenges) {
    return "";
  }

  return renderLegacyTemplate`
      <div class="case-study__section challenges">
        <h2>挑战</h2>
        <hr><i class="pattern"></i>${renderChallengeItems(data)}
        `;
};

const renderSolutionSection = (data: CaseStudyTemplateData): string => {
  if (!data.solutions) {
    return "";
  }

  return renderLegacyTemplate`
      </div>
      <div class="case-study__section solutions">
        <h2>解决方案</h2>
        <hr><i class="pattern"></i>${renderSolutionItems(data)}
      </div>`;
};

const renderNavigation = (data: CaseStudyTemplateData): string =>
  renderLegacyTemplate`
      <div class="case-study__section navigation">
        <div class="wrap">
          <div class="col col-12"><a href="${escapeLegacyHtml(
    data.nextItem.url,
  )}">
              <div class="navigation-label">下一篇：<span>${escapeLegacyHtml(
    data.nextItem.title,
  )}</span></div><i class="line"></i><i class="navigation-shadow"></i>
              <div class="navigation-icon"><i class="icon icon-chevron-right"></i><i class="icon icon-chevron-right"></i></div></a></div>
          <div class="col col-12"><a href="/#/${escapeLegacyHtml(
    data.category,
  )}/" class="js-back-to-listing">
              <div class="navigation-label">返回列表</div><i class="line"></i><i class="navigation-shadow"></i>
              <div class="navigation-icon"><i class="icon icon-chevron-right"></i><i class="icon icon-chevron-right"></i></div></a></div>
        </div>
      </div>`;

export const renderCaseStudy = (data: CaseStudyTemplateData): string =>
  renderLegacyTemplate`
      <div class="case-study__section tldr">
        <div class="wrap">
          <div class="col col-12">${renderGlitchImage(
    data,
  )}
            <h2>摘要</h2>
            <hr><i class="pattern"></i>
            <p>${renderLegacyRaw(
    data.tldr,
  )}</p>${renderLiveLink(
    data,
  )}
          </div>
          <div class="tldr-sub col col-6">
            <div class="case-study__section technology">
              <h3>使用技术</h3>
              <hr><i class="pattern"></i>
              <ul>${renderTechnologyItems(
    data,
  )}
              </ul>
            </div>
          </div>
          <div class="tldr-sub col col-6">
            <div class="case-study__section role">
              <h3>角色</h3>
              <hr><i class="pattern"></i>
              <p>${escapeLegacyHtml(
    data.role,
  )}</p>
            </div>
          </div>
        </div>
      </div>${renderChallengeSection(data)}
        ${renderSolutionSection(
    data,
  )}${renderNavigation(data)}
    `;
