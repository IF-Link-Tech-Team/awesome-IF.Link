# awesome IF.Link

IF.Link 社区自研、维护的可复用 Agent Skills 合集；个别第三方衍生技能保留来源与许可。每个技能是一个独立目录，包含 `SKILL.md`、参考文档、模板和脚本，可以被 Claude Code / Codex / Kimi Code 等支持 [Agent Skills 标准](https://agentskills.io/specification) 的工具直接加载。

## 技能索引

| 技能 | 什么时候用 | 维护人 | 状态 |
| --- | --- | --- | --- |
| [iflink-meetup-poster](海报/iflink-meetup-poster/SKILL.md) · [展示页](海报/iflink-meetup-poster/README.md) | 做 Meetup / 分享会 / 沙龙海报，或批量出系列活动海报 | @Verayi2007 | beta |
| [wechat-banner](公众号/wechat-banner/SKILL.md) | 一条命令生成 IF.Link 公众号署名或无署名底部 Banner，附素材自检和 HTML/SVG 模板 | @dawnear | beta |
| [iflink-wechat-content-production](公众号/iflink-wechat-content-production/SKILL.md) | 将文稿和素材制作为可编辑公众号 HTML、分页图片和长图 | @Last-emo-boy | beta |
| [create-iflink-xhs](图文/create-iflink-xhs/SKILL.md) | 将教程和素材制作为小红书图文，保留真实配图与可复制步骤 | @Last-emo-boy | beta |
| [iflink-community-radar](图文/iflink-community-radar/SKILL.md) | 将授权群聊整理为社区雷达、飞书文档、转发文案及新人归档 | @Last-emo-boy | beta |
| [wechat-svg](公众号/wechat-svg/SKILL.md) | 往公众号里贴 SVG、把 HTML/设计稿导入公众号、取图片固定链接，排查动效失效、掉字、箭头消失、尺寸异常 | @dawnear | beta |

状态：`draft` 能用但不稳 · `beta` 可日常用 · `stable` 社区验证过 · `deprecated` 不要再用。

## 怎么装

用户级（Codex / Kimi Code / DeepSeek Harness 等读 `~/.agents/skills/`）：

```bash
git clone https://github.com/IF-Link-Tech-Team/awesome-IF.Link.git /tmp/awesome-iflink
mkdir -p ~/.agents/skills
cp -R "/tmp/awesome-iflink/海报/iflink-meetup-poster" ~/.agents/skills/
```

Claude Code 读用户级 `~/.claude/skills/` 或项目级 `.claude/skills/`，把上面的目标路径换掉即可。

不想装也可以：让 agent 直接读 `SKILL.md` 和它引用的 `references/`。

## 配套资料与仓库归并

- [资料目录](资料/README.md)：SEU 生存指南保留为独立授权的内容资料，不伪装成 Skill，不适用根目录 MIT。原阅读站继续可用。
- [来源与迁移清单](SOURCES.md)：列出原仓库、导入提交、当前入口，以及留在私有库的内容。
- IF.Light 的通用 SVG 清洗工具已进入 `wechat-svg`；活动成稿和内部素材不公开导入。

`iflink-wechat-content-production` 负责整篇内容，`wechat-banner` 负责独立文末 Banner，`wechat-svg` 负责公众号 SVG 兼容性；安装时按任务选取，不需要把整个集合放进一个 Skill 目录。

## 贡献一个技能

1. 读 [CONTRIBUTING.md](CONTRIBUTING.md)，按里面的目录结构和 frontmatter 约定建目录
2. 在 `README.md` 的技能索引里加一行
3. 提 PR，按 CONTRIBUTING 末尾的清单自查

## For agents

如果你是 agent，被要求"往这个仓库加/改一个技能"：

1. 先完整读 [CONTRIBUTING.md](CONTRIBUTING.md) —— 目录命名、frontmatter 字段、SKILL.md 长度上限都在里面
2. 读同分类下已有技能的 `SKILL.md`，沿用其结构与语气
3. 新建 `<分类>/<slug>/SKILL.md`，`name` 必须等于 `<slug>`，frontmatter 只用 `name` / `description` / `license` / `compatibility` / `metadata` 这几个字段
4. 细节写进 `references/`，可执行逻辑写进 `scripts/`，样例写进 `templates/`
5. 同步在 `README.md` 索引表加一行，然后按 CONTRIBUTING 末尾的清单自检

## 许可

自研代码 MIT；`wechat-svg` 的原有上游内容保持 WTFPL，详见 Skill 的来源说明与 [LICENSE](LICENSE)。各技能 `assets/` 下的 Logo、slogan、定稿图不随代码许可授权，仅限 IF.Link 内部及经授权场景使用。

`资料/` 的内容、第三方字体和内置第三方写作参考按其各自授权使用；复制到本仓库不改变原授权。
