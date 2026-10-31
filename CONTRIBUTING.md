# 贡献指南

本仓库收集社区里反复用得上、已经跑通的 Agent Skills。一份技能进得来，标准是**别人拿着它也能跑出一致的结果**，不是"我觉得这个提示词挺好"。

## 一个技能长什么样

```text
<分类>/<slug>/
├── SKILL.md       # 必须。触发条件 → 执行流程 → 硬性约束
├── README.md      # 可选。给人看的展示页（效果、流程、设计约定），不写执行规则
├── references/    # 可选。方法论、规范、异常处理，按需加载
├── templates/     # 可选。可直接复制的入参样例
├── scripts/       # 可选。可执行、可自检
└── assets/        # 可选。只放这个技能私有的素材
```

技能级 `README.md` 只放展示内容，规则和安装细节仍写进 `SKILL.md` / `references/`，避免同一件事写两遍。索引统一在仓库根 README。

## 六条约定

**1. 目录名就是技能名。**
`<slug>` 只用小写字母、数字、连字符（`^[a-z0-9]+(-[a-z0-9]+)*$`），且必须与 frontmatter 的 `name` 完全一致。中文名写在 `SKILL.md` 正文第一行标题里，不写进目录名。

**2. 分类不预先定义，但禁止一事一类。**
分类按"产出物"分，不按某次活动、某个项目分。开新分类的条件：能装下两个以上技能，或者明确知道马上就要有第二个。拿不准先放 `通用/`。

**3. frontmatter 只用规范字段。**
遵循 [Agent Skills 规范](https://agentskills.io/specification)，自定义信息一律塞进 `metadata`，不要加顶层键 —— 有些客户端会因此拒绝加载。

```yaml
---
name: iflink-meetup-poster          # 必填，= 目录名，≤64 字符
description: >-                      # 必填，≤1024 字符，写清"做什么 + 什么时候用"
  一句话说清用途，再列出触发词：用户提到 X、Y、Z 时使用。
license: MIT                         # 可选
compatibility: Requires Node 18+, Python 3.10+ with Pillow   # 可选，≤500 字符
metadata:                            # 可选，值必须是字符串
  author: Verayi2007
  maintainer: Verayi2007             # 社区技能必填，写 GitHub 账号
  version: "1.0.0"
  status: beta                       # draft / beta / stable / deprecated
  updated: "2026-10-31"
---
```

`description` 是 agent 判断"要不要用这个技能"的唯一依据，务必把真实触发词写进去。

**4. `SKILL.md` 只放三样：触发条件、执行流程、硬性约束。**
控制在 500 行以内。方法论、完整提示词手册、症状库、安装说明都挪进 `references/`，`SKILL.md` 里留链接。agent 激活技能时会整份读入，长了就是在烧上下文。

**5. 脚本必须能自检。**
依赖写进 `compatibility`；Python 脚本提供 `--help` 或 `doctor`，Node 脚本保证 `node --check` 通过；不要依赖隐式的全局安装。

**6. 新增技能必须同时更新根 `README.md` 索引表。**
索引和目录不一致的 PR 不合并。现在技能少，人工维护成本接近零。

## PR 自查清单

- [ ] 目录名 = `name`，且符合 slug 规则
- [ ] frontmatter 只有规范字段，自定义项在 `metadata` 里
- [ ] `description` 含真实触发词，50–1024 字符
- [ ] `metadata.maintainer` 已填 GitHub 账号，与根 README 的维护人一致
- [ ] `SKILL.md` ≤ 500 行，细节已挪进 `references/`
- [ ] 文中相对链接都能打开（中文路径记得 URL 编码）
- [ ] 脚本能跑：`python -m py_compile` / `node --check`，`doctor.py` 全绿
- [ ] 没有密钥、没有个人隐私，`assets/` 里的品牌素材已确认可分发
- [ ] 根 `README.md` 索引表已加一行

## 评审看什么

1. **可复现**：换一个人、换一台机器，按 `SKILL.md` 走能不能得到同类结果
2. **触发准确**：`description` 会不会被无关任务误触发，或者该触发时不触发
3. **不塞私货**：示例里不能带某一场活动的真实数据当默认值
4. **能维护**：有没有明确的维护人，`metadata.updated` 是否更新

超过 6 个月没动过的 `beta` 技能，维护人需要复审一次并更新 `metadata.updated`。
