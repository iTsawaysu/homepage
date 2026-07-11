import { escapeLegacyHtml, renderLegacyRaw, renderLegacyTemplate } from "./html";

type ArticleTemplateData = {
  content: unknown;
  nextItem: {
    url: unknown;
    title: unknown;
  };
};

export const renderArticle = (data: ArticleTemplateData): string =>
  renderLegacyTemplate`
      <div class="article__section">${renderLegacyRaw(
    data.content,
  )}</div>
      <div class="article__section navigation">
        <div class="wrap">
          <div class="col col-12"><a href="${escapeLegacyHtml(
    data.nextItem.url,
  )}">
              <div class="navigation-label">下一篇：<span>${escapeLegacyHtml(
    data.nextItem.title,
  )}</span></div><i class="line"></i><i class="navigation-shadow"></i>
              <div class="navigation-icon"><i class="icon icon-chevron-right"></i><i class="icon icon-chevron-right"></i></div></a></div>
          <div class="col col-12"><a href="/#/achievements/" class="js-back-to-listing">
              <div class="navigation-label">返回列表</div><i class="line"></i><i class="navigation-shadow"></i>
              <div class="navigation-icon"><i class="icon icon-chevron-right"></i><i class="icon icon-chevron-right"></i></div></a></div>
        </div>
      </div>
    `;
