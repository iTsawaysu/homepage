---
order: 5
title: "taste-skill UI 打磨"
url: "/#/article/the-art-of-minimalism-with-ux"
---

<p>AI 生成前端最常见的问题不是不能跑，而是看起来像模板：大标题、渐变背景、圆角卡片、三列卖点、按钮都很亮。<a href='https://github.com/Leonxlnx/taste-skill' target='_blank' rel='noopener' data-text='taste-skill'>taste-skill</a> 针对的正是这个问题。它把“更有品味”拆成布局、字体、动效、密度和预检查这些可执行规则。</p>
<img class='article-image--wide' src='/assets/homepage/images/articles/sources/taste-skill-banner.webp' alt='taste-skill README banner'>
<p class='-caption'>本地图片来源：<a href='https://github.com/Leonxlnx/taste-skill/blob/main/assets/readme-banner.webp' target='_blank' rel='noopener' data-text='README banner'>README banner</a></p>
<h2>模板感从哪里来</h2>
<p>当提示词只说“做一个现代漂亮页面”，模型会选择训练数据里最安全、最常见的组合。它不是故意偷懒，而是在缺少产品语境时用平均答案补空。平均答案通常能看，但很难有领域感。</p>
<ul class='article-verdict-list'>
<li class='is-good'>让页面的密度、字体和动效服务具体产品场景。</li>
<li class='is-good'>用截图检查重叠、溢出和移动端阅读节奏。</li>
<li class='is-bad'>默认渐变、圆角卡片、三列卖点和夸张按钮。</li>
</ul>
<p>一个运维后台不应该像营销落地页，一个小游戏不应该像 SaaS 仪表盘，一个个人博客也不需要满屏转化按钮。视觉质量首先来自对场景的判断。</p>
<h2>把审美变成检查项</h2>
<p>taste-skill 的价值在于把抽象审美翻译成可执行约束。比如：布局不要永远左右分栏，字体层级要匹配容器，动效要解释状态变化，卡片不要嵌套卡片，移动端文字不能溢出。这些规则比“高级一点”有用得多。</p>
<img src='/assets/homepage/images/articles/taste-skill-layout.svg' alt='taste-skill 用布局、字体、动效和密度约束界面'>
<ul>
<li>布局：根据内容选择密度和节奏，而不是默认三列卡片。</li>
<li>字体：标题、面板、按钮、表格要有不同尺度。</li>
<li>颜色：服务层级和状态，不靠单一色相撑完整站。</li>
<li>动效：表达进入、反馈和状态变化，不做无意义装饰。</li>
<li>验证：用截图检查重叠、溢出、空白和响应式。</li>
</ul>
<img src='/assets/homepage/images/articles/taste-skill-polish.svg' alt='从截图检查文本溢出、层级、颜色和交互反馈'>
<h2>先判断产品类型</h2>
<p>让 AI 写界面前，我会先补一句：“这是一个给开发者反复使用的工具，不是营销页。”这句话会影响很多选择：信息密度要高一些，装饰要少一些，控件要更稳定，状态反馈要更明确。</p>
<p>如果是作品集或品牌页，策略又不同。那时图像、叙事和第一屏记忆点更重要。Skill 的意义不是强行套一种风格，而是逼模型先识别语境。</p>
<h2>动效不能替代结构</h2>
<p>AI 很容易用动效掩盖层级混乱。真正好的动效通常很克制：进入时帮助用户建立空间关系，点击后给出反馈，加载时解释等待。动效不能让一个信息结构混乱的页面变好，它只能让清楚的结构更顺。</p>
<p>在旧项目里做视觉升级时更要谨慎。不能为了“高级感”破坏已有路由、加载动画、焦点状态和内容可读性。</p>
<h2>一套实用提法</h2>
<code>按运营工具处理，不要做营销落地页。使用紧凑但清晰的信息层级；按钮只用于真实命令；不要使用装饰性渐变光斑；完成后用桌面和移动截图检查文本溢出、元素重叠和状态可读性。</code>
<p>这类提示比“参考 Linear 风格”更稳，因为它描述的是约束和验证，而不是模糊模仿某个品牌。</p>
<h2>最后还是要看屏幕</h2>
<p>视觉 Skill 能显著提高默认质量，但不能替代截图检查。页面是否拥挤、按钮是否可点、文字是否压住图像、移动端是否换行失败，这些都要在浏览器里看。AI 能生成界面，人仍然要判断界面是否适合这个产品。</p>
