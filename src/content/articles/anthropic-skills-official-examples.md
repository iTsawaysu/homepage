---
order: 8
title: "Anthropic Skills 官方库"
url: "/#/article/anthropic-skills-official-examples"
---

<p><a href='https://github.com/anthropics/skills' target='_blank' rel='noopener' data-text='anthropics/skills'>anthropics/skills</a> 是理解 Agent Skills 生态的官方样例库。它包含规范、模板、示例 Skill，以及 Claude 文档能力背后的 docx、pdf、pptx、xlsx 等参考实现。对想写 Skill 的人来说，这个仓库的价值不是“直接拿来用”，而是看官方如何组织可重复的代理能力。</p>
<img class='article-image--wide' src='/assets/homepage/images/articles/sources/anthropic-skills-official-examples.svg' alt='Anthropic Skills 官方库包含规范、模板、示例和文档能力'>
<p class='-caption'>本地示意图：根据 <a href='https://github.com/anthropics/skills' target='_blank' rel='noopener' data-text='anthropics/skills README'>anthropics/skills README</a> 信息重绘。</p>
<h2>Skill 是文件夹，不是咒语</h2>
<p>官方定义很朴素：一个 Skill 是包含说明、脚本和资源的文件夹，核心入口通常是 <code>SKILL.md</code>。Claude 会在需要时动态加载它，让模型在某类任务上更稳定地执行专门流程。</p>
<p>这点很重要。Skill 不应该只是“请认真一点”的提示词，而应该把触发条件、步骤、资源、限制和验证方式放在可审查的文件里。</p>
<h2>官方样例展示了边界</h2>
<p>这个仓库的示例横跨创意、设计、开发、企业沟通和文档处理。尤其是文档类 Skill，能看到复杂能力如何拆成说明、模板、脚手架和实际文件操作。它们不只是演示格式，也是在展示“什么适合沉淀成 Skill”。</p>
<ul class='article-verdict-list'>
<li class='is-good'>把重复任务写成结构化说明，而不是每次重新口述。</li>
<li class='is-good'>把模板和资源随 Skill 一起放，减少上下文漂移。</li>
<li class='is-bad'>把一次性偏好包装成通用 Skill，反而增加噪音。</li>
</ul>
<h2>模板给了最低可行形态</h2>
<p>一个基础 Skill 至少需要名字、描述和正文说明。描述不是装饰，它决定模型什么时候应该加载这个能力。正文也不应该堆满漂亮话，而要告诉代理具体怎么做、什么时候停、失败时如何处理。</p>
<blockquote>好的 Skill 描述，是一个触发器；好的 Skill 正文，是一条可复查的操作路径。</blockquote>
<h2>我会从这里学什么</h2>
<p>第一是格式纪律：每个 Skill 自包含，入口清楚，资源路径明确。第二是范围纪律：一个 Skill 只覆盖一类任务，不把所有偏好塞进同一个文件。第三是验证纪律：复杂输出必须有可观察的结果，而不是只返回一段自信解释。</p>
<p>如果要给团队写自己的 Skill，我会先从官方模板开始，再把本项目真实流程、命令、禁区和验收证据填进去。这样写出的不是“提示词收藏夹”，而是能被下一次代理稳定读取的工作协议。</p>
