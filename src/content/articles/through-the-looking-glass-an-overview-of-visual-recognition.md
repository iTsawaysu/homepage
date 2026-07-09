---
order: 11
title: "Trellis 项目记忆"
url: "/#/article/through-the-looking-glass-an-overview-of-visual-recognition"
---

<p>长期 AI 项目最难的不是让模型写一次代码，而是让它在第十次、第十五次会话里仍然理解同一套规则。<a href='https://github.com/mindfold-ai/Trellis' target='_blank' rel='noopener' data-text='Trellis'>Trellis</a> 解决的是这个长期协作问题：把规范、任务、上下文和项目记忆放进仓库，让 AI 工作有可延续的结构。</p>
<img class='article-image--wide' src='/assets/homepage/images/articles/sources/trellis-og.png' alt='Trellis GitHub 仓库预览图'>
<p class='-caption'>本地图片来源：<a href='https://github.com/mindfold-ai/Trellis' target='_blank' rel='noopener' data-text='GitHub repo'>GitHub repo</a></p>
<h2>一次聊天不是项目管理</h2>
<p>AI 很擅长在一个会话里处理上下文，但项目的真实信息分散在代码、文档、规范、任务记录、历史决策和验证命令里。如果这些信息没有被组织起来，每次新会话都像重新入职。模型会重复问、重复猜，也重复犯错。</p>
<p>Trellis 的思路是把这些知识变成仓库结构，而不是靠人每次手动粘贴。</p>
<h2>规范是可执行的工作边界</h2>
<p><code>.trellis/spec/</code> 里保存项目规范：目录结构、路径规则、验证方式、禁止模式、常见坑。它们不是摆设。开发前读取相关规范，可以让代理知道本项目的真实约定，而不是套用通用经验。</p>
<img src='/assets/homepage/images/articles/trellis-project-memory.svg' alt='Trellis 用规范、任务和工作区记忆组织项目上下文'>
<p>比如一个静态站可能要求资源路径必须是根相对，某个旧版运行时不能重写，浏览器验证必须检查同源 404。只有这些规则进入上下文，代理才不会做出“看起来合理但本项目错误”的改动。</p>
<h2>任务让范围可审查</h2>
<p><code>.trellis/tasks/</code> 让每个任务有自己的 PRD、设计、实现计划和状态。任务从 planning 到 in_progress，再到 finish，不只是流程标签，而是告诉代理：本次工作要解决什么，哪些不该碰，完成后用什么证据验收。</p>
<blockquote>任务目录把“这次只做什么”写清楚。</blockquote>
<img src='/assets/homepage/images/articles/trellis-task-loop.svg' alt='Trellis 任务从规划到实现、验证和归档的循环'>
<p>这对 AI 尤其重要。没有任务边界，模型很容易顺手重构、扩大范围或改掉用户已有变更。任务目录把“这次只做什么”写清楚。</p>
<h2>记忆不是神秘能力</h2>
<p>长期记忆不应该依赖模型自己记得你。更可靠的方式是把有价值的发现写回项目：一次调试的根因、一个路径规则、一个验证脚本、一条容易踩的坑。下一次会话通过规范和工作日志读取这些信息。</p>
<p>Trellis 的工作区和任务记录就承担这个角色。它让上下文能被人审查、被版本管理、被下一次代理读取。</p>
<h2>我会怎样使用</h2>
<ul>
<li>新功能先写 PRD，明确目标和不做什么。</li>
<li>复杂改动补设计和实现计划，降低边做边猜。</li>
<li>写代码前读取相关 spec，而不是只看当前文件。</li>
<li>完成后把新发现沉淀回规范或任务记录。</li>
<li>验证不只跑命令，还要检查跨层契约是否仍然成立。</li>
</ul>
<p>这套流程会增加一点前置成本，但它换来的是连续性。对长期项目来说，连续性比单次速度更重要。</p>
