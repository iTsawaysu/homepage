---
order: 12
title: "Karpathy Skills 规则"
url: "/#/article/an-app-but-not-progressive-web-apps"
---

<p><a href='https://github.com/multica-ai/andrej-karpathy-skills' target='_blank' rel='noopener' data-text='Karpathy Skills'>multica-ai/andrej-karpathy-skills</a> 做了一件很有意思的事：把 Andrej Karpathy 对 LLM 编码问题的观察，整理成代理可以遵守的指导文件和 Skill。它提醒我们，学习 AI 协作不是收集更多提示词，而是把失败模式变成可执行规则。</p>
<img class='article-image--wide' src='/assets/homepage/images/articles/sources/karpathy-skills-og.png' alt='andrej-karpathy-skills GitHub 仓库预览图'>
<p class='-caption'>本地图片来源：<a href='https://github.com/multica-ai/andrej-karpathy-skills' target='_blank' rel='noopener' data-text='GitHub repo'>GitHub repo</a></p>
<h2>先承认模型会犯哪类错</h2>
<p>很多代理问题不是语法错误，而是行为错误：在不确定时继续假设，遇到矛盾不提出来，范围越改越大，设计过度复杂，写完不验证。这些问题如果只靠每次聊天提醒，很快会重复出现。</p>
<p>把它们写成规则，才会变成稳定的协作基础。例如“不确定时先暴露困惑”“优先做最小可验证改动”“不要顺手重构无关文件”“用成功标准驱动循环”。</p>
<h2>成功标准比命令更有用</h2>
<p>项目里强调的一个思路很适合 AI 代理：不要只告诉模型每一步怎么做，而要给它清晰的目标和验证条件。命令式步骤太细时，容易和真实代码冲突；成功标准更能让代理在边界内自己寻找路径。</p>
<img src='/assets/homepage/images/articles/karpathy-goal-loop.svg' alt='从失败观察到成功标准再到验证循环'>
<p>比如“优化这个页面”很空。“桌面和移动端没有文本溢出；主要 CTA 可见；构建通过；指定路由无控制台错误”就是更好的目标。模型可以尝试不同实现，但必须满足这些条件。</p>
<img src='/assets/homepage/images/articles/karpathy-guardrails.svg' alt='代理协作中的澄清、最小改动、验证和范围控制'>
<h2>把学习变成规则</h2>
<p>人类学习靠复盘，代理协作也一样。一次任务失败后，不要只改当前代码，还要问：这是偶发错误，还是一类可预防的失败？如果是后者，就应该把预防机制写进项目规则或 Skill。</p>
<ul class='article-verdict-list'>
<li class='is-good'>把可重复的失败模式写成规则。</li>
<li class='is-good'>让成功标准决定循环是否结束。</li>
<li class='is-bad'>每次只在聊天里提醒，然后期待下次不会忘。</li>
</ul>
<ul>
<li>经常漏跑测试：把测试命令写进完成标准。</li>
<li>经常扩大范围：把禁止无关重构写进工作规则。</li>
<li>经常误解需求：把澄清问题和推荐答案写进规划流程。</li>
<li>经常过度设计：把最小实现和复用检查写进实现流程。</li>
</ul>
<h2>渐进增强 AI 工作方式</h2>
<p>不需要一开始就搭复杂系统。可以先从一份本地规则开始，记录项目不能违反的边界；然后给常见任务补成功标准；再把重复流程沉淀成 Skill；最后再考虑任务系统、记忆和自动化验证。</p>
<p>这条路径像渐进增强：先有可用基础，再逐步增加能力。每一步都应该解决一个真实失败模式，而不是为了显得“更 agentic”。</p>
<h2>我最看重的部分</h2>
<p>这个项目提醒我：AI 协作的核心不是让模型更听话，而是让它更会处理不确定性。会提问、会暴露权衡、会控制范围、会用证据验证，比一次写出大量代码重要得多。</p>
<p>当这些习惯被写进项目，代理才会从“聪明但飘”变成更可靠的工程协作者。</p>
