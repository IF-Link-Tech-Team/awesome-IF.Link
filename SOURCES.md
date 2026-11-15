# 来源与迁移清单

本次迁移采用内容快照，不改写原仓库或目标仓库历史。下表中的提交固定本次输入；原仓库继续保存完整历史。复用代码进入对应 Skill，独立授权的正文进入资料目录，未获公开许可的内容保留在原私有库。

| 原仓库 | 导入提交 | 当前入口 | 处理范围 |
| --- | --- | --- | --- |
| [iflink-community-radar](https://github.com/IF-Link-Tech-Team/iflink-community-radar) | `a083c18d0862f79ae0ea244633e607e15a6f58b9` | [内容生产/iflink-community-radar](内容生产/iflink-community-radar/SKILL.md) | 工作流、参考、UI 元数据；运行时传入内部 Base/Wiki 地址，不附聊天或成员记录 |
| [iflink-wechat-content-production](https://github.com/IF-Link-Tech-Team/iflink-wechat-content-production) | `23263e49267c4ab7ed80e60d38dfdfc93e757076` | [内容生产/iflink-wechat-content-production](内容生产/iflink-wechat-content-production/SKILL.md) | 工作流、脚本、模板、品牌素材与字体；补齐字体许可、示例署名改为占位姓名 |
| [iflink-xhs-skill](https://github.com/IF-Link-Tech-Team/iflink-xhs-skill) | `34192a8673b2c8f91dda9415c2b63a47b5b2c41a` | [内容生产/create-iflink-xhs](内容生产/create-iflink-xhs/SKILL.md) | 工作流、渲染/下载脚本、品牌素材、内置写作参考及其 MIT 许可；私人截图/品牌书不公开导入，示例截图改为合成素材 |
| [IF.Light](https://github.com/IF-Link-Tech-Team/IF.Light) | `215f5b75bfef91a9fa396c97111db411eb3a94e8` | [wechat-svg 的清洗脚本](内容生产/wechat-svg/references/iflight-svg.md) · [资料登记](资料/IF.Light.md) | 提取两处相同的 `svgasset.py`，保留 `sanitize`/`place` 接口并增加 CLI 和测试；原仓库已归档，活动成稿、照片、字体和设计源保留私有 |
| [seu-survival-guide-2.0](https://github.com/IF-Link-Tech-Team/seu-survival-guide-2.0) | `3c56b4b57c46ffa7bc9d50e80acf7b0eb4459e73` | [资料快照](资料/seu-survival-guide-2.0/README.md) | 原文、图片、致谢、阅读器完整保留；按原非商业转载授权，不适用本仓库 MIT；原仓库与阅读站继续维护 |

## 后续维护

三份迁入 Skill 的新修改在本仓库提交，安装时复制索引中的完整 Skill 目录。旧仓库不是运行时依赖；如已有安装或引用仍指向旧仓库，可逐步更新，原历史不删除。

IF.Light 仍负责内部活动生产素材；本仓库只维护提取的通用能力。SEU 生存指南的正文由原内容仓维护，更新快照时同时保留 README、致谢和授权边界，不能把资料授权改成代码许可证。
