---
order: 6
title: "baoyu-design 本地设计"
url: "/#/article/baoyu-design-local-agent-design"
---

<p><a href='https://github.com/JimLiu/baoyu-design' target='_blank' rel='noopener' data-text='baoyu-design'>baoyu-design</a> 把 Claude Design 式的设计流程打包成一个可以放进本地代理的 Skill。它关心的不是“生成一张好看的图”，而是让 Cursor、Claude Code、Codex 这类能读写文件的代理，在你的仓库里产出自包含 HTML：高保真界面、可点击原型、线框、落地页、仪表盘和移动端方案。</p>
<img class='article-image--wide' src='/assets/homepage/images/articles/sources/baoyu-design-local-agent-design.svg' alt='baoyu-design 把设计流程、本地代理和 HTML 交付串成一个闭环'>
<p class='-caption'>本地示意图：根据 <a href='https://github.com/JimLiu/baoyu-design' target='_blank' rel='noopener' data-text='baoyu-design README'>baoyu-design README</a> 信息重绘。</p>
<h2>设计网站变成设计引擎</h2>
<p>它的出发点很直接：如果设计结果最终是 HTML，为什么一定要离开编辑器？本地代理已经能读项目、开预览、截屏、修改文件，那么设计 Skill 就可以把方法论、组件脚手架、预览和验证串起来。</p>
<p>这对开发者很有吸引力。设计稿不再是外部截图，而是可以进版本库、可以继续编辑、可以交给浏览器验证的工程产物。</p>
<h2>便携性是重点</h2>
<p>baoyu-design 的结构把核心方法、不同代理的工具映射、内置设计能力和 starter components 分开。这样同一套设计规则可以在不同运行环境里复用，而不是绑定某一个网站或某一个编辑器。</p>
<ul class='article-verdict-list'>
<li class='is-good'>设计产物落在本地目录，便于版本管理和二次修改。</li>
<li class='is-good'>用预览与截图验证结果，而不是只相信模型描述。</li>
<li class='is-bad'>把“设计感”留成一句抽象要求，最后只能得到平均答案。</li>
</ul>
<p>Skill 真正解决的是流程可迁移：同样的高标准设计 brief、同样的交付格式、同样的检查方式，换一个代理也不必从零再教。</p>
<h2>自包含 HTML 很务实</h2>
<p>自包含 HTML 不是最华丽的格式，却是很稳的中间形态。它能在浏览器里直接看，能被代理继续改，也能在必要时导出为其他交付物。对早期产品、内部工具和视觉探索来说，这比一堆散落截图更容易进入下一轮迭代。</p>
<blockquote>好的设计 Skill 不只是会画界面，还要让界面留在可编辑的地方。</blockquote>
<h2>我会怎样用</h2>
<p>我会把它放在“先做真实可看的方向，再进入实现”的阶段。比如做一个复杂设置页，先让 Skill 产出几版 HTML 方向，浏览器里指着细节修，再把确定的结构带回工程代码。</p>
<p>它不替代产品判断，也不替代真实前端实现。但它能缩短从模糊需求到可讨论界面的距离，尤其适合那些需要先看视觉节奏、信息密度和交互动线的工作。</p>
