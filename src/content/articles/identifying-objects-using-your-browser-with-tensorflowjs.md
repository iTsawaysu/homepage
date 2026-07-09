---
order: 4
title: "mattpocock/skills 实战"
url: "/#/article/identifying-objects-using-your-browser-with-tensorflowjs"
---

<p><a href='https://github.com/mattpocock/skills' target='_blank' rel='noopener' data-text='mattpocock/skills'>mattpocock/skills</a> 的核心吸引力不在于某一句提示词，而在于它把真实工程里的重复经验拆成小的、可组合的 Skill。它的 README 把这些技能定位为日常工程中使用的工作流，重点是适应真实应用开发，而不是一次性生成漂亮答案。</p>
<img class='article-image--wide' src='/assets/homepage/images/articles/sources/mattpocock-skills-banner.png' alt='mattpocock skills README banner'>
<p class='-caption'>本地图片来源：<a href='https://github.com/mattpocock/skills' target='_blank' rel='noopener' data-text='README banner'>README banner</a></p>
<h2>先承认工程不是一次回答</h2>
<p>真实开发很少是“给我写一个功能”这么简单。你要澄清需求、理解领域语言、设计模块、写测试、诊断问题、审查改动、控制范围。每一步都有不同的判断标准。把这些全部塞进一个全局提示，只会让模型在复杂任务里抓不住重点。</p>
<p>Skill 的价值在这里出现：让每类任务有自己的流程。需要澄清需求时用澄清流程，需要调试时用诊断流程，需要评审时用评审流程。模型不必在一个巨大提示里猜当前应该遵守哪一段。</p>
<h2>小而可组合</h2>
<p>这个仓库强调的一个方向是小、可适配、可组合。对工程师来说，这比“万能代理提示词”更现实。小 Skill 更容易读懂，也更容易按项目习惯修改。团队可以先从一个痛点开始，而不是一次性导入一整套沉重流程。</p>
<img src='/assets/homepage/images/articles/mattpocock-skills-flow.svg' alt='mattpocock skills 把工程经验拆成多个可组合流程'>
<ul>
<li>调试 Skill 负责复现、缩小范围、提出假设、验证修复。</li>
<li>审查 Skill 负责从风险和缺失测试出发，而不是重写代码。</li>
<li>原型 Skill 负责快速回答设计问题，而不是直接承诺生产实现。</li>
<li>领域建模 Skill 负责统一词汇，减少反复解释。</li>
</ul>
<img src='/assets/homepage/images/articles/mattpocock-quality-loops.svg' alt='需求、实现、测试、评审形成可复用质量回路'>
<h2>Skill 应该保留人的控制权</h2>
<p>我喜欢这种 Skill 思路的原因，是它没有把流程黑箱化。一个好的 Skill 应该让你看见代理准备怎么做、它读了什么、它用什么证据判断完成。这样你可以调整流程，而不是只能在结果不对时抱怨模型。</p>
<p>这对长期项目很关键。越是自动化，越要让边界可见。Skill 不是让代理自由发挥更多，而是让它在更清楚的工作轨道里行动。</p>
<h2>如何把自己的经验沉淀进去</h2>
<p>我会从一个经常重复的任务开始，比如“修一个线上报错”。先写下自己真实会做的步骤：读取错误日志，定位复现路径，找最近改动，写最小复现，修复，补回归验证。然后把每一步的退出条件写清楚。</p>
<p>第一次写不用追求完美。用几次之后，记录模型仍然犯错的地方，再把这些教训补进 Skill。Skill 的质量来自实际使用，不来自一次写完。</p>
<h2>适合团队共享的知识形态</h2>
<p>文档经常写给人看，提示词经常写给一次对话用。Skill 介于两者之间：它既能被人审阅，也能被代理执行。工程团队真正需要的是这种可运行的经验载体。</p>
<p>当一个项目开始沉淀自己的调试方式、测试偏好、UI 验收标准和发布检查，AI 协作会明显稳定。不是因为模型突然更聪明，而是它终于拿到了更像团队成员会遵守的工作说明。</p>
