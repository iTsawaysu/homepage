---
order: 3
title: "Skills：经验工作流"
url: "/#/article/are-qr-codes-making-a-comeback"
---

<p>很多人把 AI 使用经验保存成一堆提示词。提示词有用，但它只能覆盖“这一轮我要怎么说”。真正能复用的，是一整套工作流：什么时候启动、先读什么、怎么做、如何验证、失败时怎样收束。Skill 就是把这些经验写成 AI 可以执行的操作说明。</p>
<img src='/assets/homepage/images/articles/agent-skills-card.svg' alt='Skill 由触发条件、步骤、检查和验证组成'>
<blockquote>提示词是一次请求，Skill 是一套可重复执行的团队习惯。</blockquote>
<h2>Skill 不是魔法咒语</h2>
<p>一个好的 Skill 不应该只是“你是资深工程师，请认真写代码”。这种话听起来有方向，但没有可执行性。Skill 需要告诉代理 <a href='/#/article/identifying-objects-using-your-browser-with-tensorflowjs' data-text='具体行为'>具体行为</a>：先读哪些文件，哪些命令必须跑，哪些输出算合格，哪些情况应该停下来诊断。</p>
<p>换句话说，提示词更像一次请求，Skill 更像可复用的操作手册。</p>
<h2>为什么需要把经验写下来</h2>
<p>AI 代理最常见的问题不是完全不会做，而是每次都忘一点：忘了读项目规范，忘了查已有工具，忘了跑测试，忘了截图验证，忘了说明限制。人可以靠习惯弥补这些细节，但模型在新会话里不会自动继承你的习惯。</p>
<p>Skill 把这些习惯变成显式上下文。它让模型在合适的任务上获得稳定纪律，而不是靠你每次手动补充一长串提醒。</p>
<h2>一个可用 Skill 的结构</h2>
<ul>
<li><strong>触发条件：</strong> 什么时候应该使用，什么时候不应该使用。</li>
<li><strong>前置检查：</strong> 动手前必须读取哪些文件、确认哪些事实。</li>
<li><strong>执行步骤：</strong> 按什么顺序推进，哪些步骤不能跳过。</li>
<li><strong>质量门槛：</strong> 怎样证明结果正确，而不是看起来正确。</li>
<li><strong>失败处理：</strong> 卡住时如何缩小问题，避免重复猜。</li>
</ul>
<img src='/assets/homepage/images/articles/agent-skills-packaging.svg' alt='把重复经验封装成可安装、可共享的 Skill'>
<h2>什么时候值得写 Skill</h2>
<p>如果同一类任务你已经第三次向 AI 解释，就应该考虑写 Skill。比如代码审查、调试、TDD、UI 打磨、生成发布说明、写 PRD、迁移数据、发布前检查。这些任务都有稳定步骤，也都有容易被忽略的边界。</p>
<ul class='article-verdict-list'>
<li class='is-good'>同一类任务反复解释三次，就把流程写下来。</li>
<li class='is-good'>模型总在同一个位置犯错，就把纠正规则沉淀进去。</li>
<li class='is-bad'>把所有习惯塞进一个巨大 Skill，靠模型自己分辨。</li>
</ul>
<p>另一个信号是“模型总在同一个地方犯错”。不要每次都在聊天里纠正它，把纠正沉淀成 Skill，下一次直接让流程约束它。</p>
<h2>Skill 要保持小</h2>
<p>Skill 不是把整本工程手册塞给模型。越大的说明越容易互相冲突，也越难判断什么时候适用。更好的做法是一个 Skill 解决一类明确问题，并把不可跳过的步骤写清楚。</p>
<p>比如“前端视觉打磨”和“数据库迁移”应该是两个 Skill。它们需要读取的文件、验证方式和失败处理完全不同，强行合并只会让模型混乱。</p>
<h2>它改变的是协作方式</h2>
<p>有了 Skill，你不再只是在问 AI 一个问题，而是在给它一个可执行的团队习惯。它会先读上下文，再按步骤行动，最后用证据证明结果。这种模式比单次提示更慢一点，但适合长期项目，因为它减少了重复解释和低级遗漏。</p>
<p>真正有价值的 Skill 不是写得漂亮，而是能让下一次类似任务少犯同一种错。</p>
