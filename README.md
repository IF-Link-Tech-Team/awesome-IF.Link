# awesome IF.Link

IF.Link 团队的**可复用技能库**。每个目录是一份能直接交给 agent 执行的生产规范：带 SKILL.md、参考资料、脚本和验收标准。

## 目录

| 场景 | 技能 | 说明 |
| --- | --- | --- |
| 公众号 | [公众号 SVG 约束](公众号/公众号%20SVG%20约束/SKILL.md) | 公众号文章里 SVG 动效与图片的约束 |
| 海报 | [IF.Link Meetup 海报](海报/IF.Link%20Meetup%20海报/SKILL.md) | 输入活动信息 → 生成投喂包 → 交给图像模型出图 → 贴牌验色 |

## 结构约定

```text
<场景>/<技能名>/
├── SKILL.md          # 主控：触发条件、执行流程、硬性约束
├── README.md         # 工程说明
├── references/       # 方法论、规范、异常处理
├── assets/           # 模板与品牌素材
├── templates/        # 入参样例
└── scripts/          # 校验 / 生成 / 质检脚本
```

## 使用

- **在 DeepSeek Harness 里**：把 `<场景>/<技能名>/` 复制到项目的 `.dsh/skills/<技能名>/`，或用户级 `~/.dsh/skills/`。
- **在其它 agent 里**：把 SKILL.md 连同 references/ 一起投喂，按里面的流程执行。

## 许可

代码部分 MIT。`assets/` 与 `logo` 相关的**品牌素材不在授权范围**，仅限 IF.Link 内部及经许可的场景使用。