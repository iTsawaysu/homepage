---
order: 10
title: "agent-skills 流程"
url: "/#/article/service-workers-on-ios"
---

<p><a href='https://github.com/addyosmani/agent-skills' target='_blank' rel='noopener' data-text='agent-skills'>addyosmani/agent-skills</a> 把 Skills 定位为面向 AI 编码代理的工程工作流。它关注的不是一句“请写高质量代码”，而是从定义、计划、构建、验证、审查到发布的完整生命周期。</p>
<img class='article-image--wide' src='/assets/homepage/images/articles/sources/agent-skills-site.jpg' alt='Addy Osmani agent-skills project visual'>
<p class='-caption'>本地图片来源：<a href='https://addyosmani.com/assets/images/addys-agent-skills.jpg' target='_blank' rel='noopener' data-text='project image'>project image</a></p>
<h2>编码代理需要流程，不只需要能力</h2>
<p>今天的模型已经能写代码、读文件、解释报错、运行命令。问题是它会不会在正确的时机做正确的事。没有流程约束时，代理很容易跳过澄清，直接改代码；或者改完以后只说“完成了”，没有拿测试、构建或浏览器证据证明。</p>
<p>Skills 的作用就是把这些工程纪律放到代理面前，让它知道当前阶段应该做什么，不应该做什么。</p>
<h2>生命周期视角</h2>
<p>这个仓库把工作拆到开发生命周期里，很值得借鉴：</p>
<img src='/assets/homepage/images/articles/addy-agent-lifecycle.svg' alt='agent-skills 覆盖定义、计划、构建、验证、审查和发布'>
<ul>
<li>Define：先弄清楚要解决的问题和验收标准。</li>
<li>Plan：把任务拆成小而可验证的切片。</li>
<li>Build：按切片实现，避免一次性大改。</li>
<li>Verify：用测试、类型检查、构建和运行证据证明结果。</li>
<li>Review：从风险、维护性和遗漏测试角度看改动。</li>
<li>Ship：发布前确认回滚、性能和上线风险。</li>
</ul>
<p>这些词都不新，但把它们写进 Skill 后，代理才更容易持续遵守。</p>
<img src='/assets/homepage/images/articles/addy-agent-quality-gates.svg' alt='每个开发阶段都有对应的质量门槛'>
<h2>好 Skill 要有退出条件</h2>
<p>“检查质量”不是退出条件。“运行 npm run build 并确认通过”才是退出条件。“看一下页面”也不够，应该写成“用浏览器打开指定路由，记录页面错误、控制台错误和同源 404”。越是能被证据验证的步骤，越不容易被模型用自信语气糊弄过去。</p>
<ul class='article-verdict-list'>
<li class='is-good'>退出条件写成命令、路由、计数和错误检查。</li>
<li class='is-good'>让代理说明哪些证据证明任务完成。</li>
<li class='is-bad'>只写“检查一下质量”，然后接受一句完成了。</li>
</ul>
<p>这也是生产级 Skill 和普通提示词的区别。提示词偏向表达意图，Skill 必须能落到动作和证据。</p>
<h2>反自动化漂移</h2>
<p>编码代理会在长任务里逐渐偏离原始目标：多改一点、顺手重构、忽略边界、把失败解释成环境问题。面向代理的 Skill 应该明确防止这种漂移：先读规范，保留用户改动，不做无关重构，失败时缩小问题而不是继续猜。</p>
<p>这些规则看起来像常识，但常识必须写下来。AI 不会自动继承团队的工程文化。</p>
<h2>如何借鉴</h2>
<p>我会把 agent-skills 当成设计参考：一个 Skill 对应一个阶段或一种任务，每个 Skill 都有明确触发、步骤、证据和失败处理。然后根据自己的项目改成本地版本，比如前端项目要加入截图检查，后端项目要加入迁移和回滚检查。</p>
<p>真正的收益不是“代理会更多东西”，而是代理更少忘记关键步骤。工程质量很多时候就差在这些看似普通的步骤上。</p>
