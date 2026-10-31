# awesome IF.Link

IF.Link 社区的可复用 Agent Skills 合集。每个技能是一个独立目录，包含 `SKILL.md`、参考文档、模板和脚本，可以被 Claude Code / Codex / Kimi Code 等支持 [Agent Skills 标准](https://agentskills.io/specification) 的工具直接加载。

## 技能索引

| 技能 | 什么时候用 | 维护人 | 状态 |
| --- | --- | --- | --- |
| [iflink-meetup-poster](海报/iflink-meetup-poster/SKILL.md) | 做 Meetup / 分享会 / 沙龙海报，或批量出系列活动海报 | @Verayi2007 | beta |
| [wechat-svg](公众号/wechat-svg/SKILL.md) | 往公众号里贴 SVG，排查动效失效、箭头消失、尺寸异常 | 待认领 | beta |

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

代码 MIT，见 [LICENSE](LICENSE)。各技能 `assets/` 下的 Logo、slogan、定稿图不随代码许可授权，仅限 IF.Link 内部及经授权场景使用。
