---
order: 7
title: "huashu-design 设计交付"
url: "/#/article/huashu-design-agent-design-workflow"
---

<p><a href='https://github.com/alchaincyf/huashu-design' target='_blank' rel='noopener' data-text='huashu-design'>huashu-design</a> 更像一套面向交付物的设计工作台：一句需求进入代理，输出可以是可点击 App 原型、产品发布动画、信息图、HTML deck、PPTX 或设计评审。它强调跨代理可用，也强调最终结果要经过浏览器和 Playwright 检查。</p>
<img class='article-image--wide' src='/assets/homepage/images/articles/sources/huashu-design-agent-design-workflow.svg' alt='huashu-design 从一句需求到多种设计交付物'>
<p class='-caption'>本地示意图：根据 <a href='https://github.com/alchaincyf/huashu-design' target='_blank' rel='noopener' data-text='huashu-design README'>huashu-design README</a> 信息重绘。</p>
<h2>它把“设计”拆得很细</h2>
<p>很多设计提示词只是在描述风格。huashu-design 更像流程系统：先拿品牌资产，必要时给方向备选，再做真实视觉，随后用 Tweaks、导出、评审和验证收尾。它不是要求模型“高级一点”，而是规定模型必须先收集上下文、展示假设、尽早给用户看，再迭代。</p>
<p>这种拆分很适合 AI。模型擅长生成，但容易一口气生成到最后才发现方向错了。把流程拆短，错误就能更早暴露。</p>
<h2>反 AI slop 是硬规则</h2>
<p>这个仓库最有价值的部分之一，是把常见模板感写成明确禁区：紫色渐变、emoji 图标、圆角加左边框、随手画的装饰图、拿 Inter 当万能 display 字体。它还要求真实素材、真实品牌资产和可验证的视觉结果。</p>
<ul>
<li>模糊需求时，先给多个方向，而不是直接套一个默认风格。</li>
<li>涉及品牌时，先找 logo、产品图、界面截图、颜色和字体。</li>
<li>交付前用浏览器过一遍，而不是只交文件。</li>
</ul>
<h2>更像 junior designer，而不是魔法按钮</h2>
<p>README 里反复出现的工作方式很有意思：先写 assumptions、placeholder 和 reasoning，早一点 show 给用户看。这个设定降低了“一次出神作”的幻觉，也更贴近真实设计协作。</p>
<blockquote>越早把方向摆上屏幕，越早知道自己理解错了哪里。</blockquote>
<p>对代理来说，这是一条很实用的限制：不要闷头做完整方案，先让人看到轮廓，再填内容、做变体和调参数。</p>
<h2>交付范围很宽，但核心是一致的</h2>
<p>App 原型、动画、信息图和 deck 看起来是不同产物，底层却是同一件事：把设计过程变成一组可运行、可预览、可导出的 HTML 工作流。HTML 不是终点，而是一个能承载状态、动效、布局和验证的中间层。</p>
<p>我会把它当成“设计前置验证”的工具：在真实实现前，用它快速找到风格方向、动效节奏和信息层级。真正落地时，再把确认过的方案迁回项目代码。</p>
