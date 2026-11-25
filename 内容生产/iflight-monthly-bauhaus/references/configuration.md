# 本期配置说明

## 使用示例而非默认值

`content.example.json` 中的所有姓名、日期、奖项、项目和数字均为占位示例。复制到本期工作目录后替换，并设置 `"example": false`。

`--allow-example` 仅用于本地预览；示例配置不能通过秀米辅助脚本同步。

## 字段

| 字段 | 内容 |
| --- | --- |
| `article.title` | 本期文章标题 |
| `issue` | 届次、卷号、年份与轮次标题 |
| `intro` | 两种参与入口及行动引导 |
| `hero.facts` | 首屏三个重点事实 |
| `growth` | 权益说明、标签、推荐赛事与提示 |
| `awards` | 首屏奖励标记及三张奖项卡 |
| `support` | 四项创作支持 |
| `timeline` | 四个赛程阶段、时间、说明与投票信息 |
| `plaza` | 项目入口、列表说明与行动文案 |
| `projects` | 本期项目卡片数组 |
| `community.stats` | 需要当期复核的社区数据 |
| `credits` | 文案、设计、审核等真实贡献者 |
| `links.forum` | 主要项目入口 |
| `links.note` | 当期公示与免责说明 |

数组数量应遵循模板结构：两个引子卡、三个首屏事实、三张奖项、四项支持、四个赛程、两个参与入口。项目卡可以按本期需要增减。

带 `Html` 后缀的字段允许 `<br>`、`<em>` 等简单排版标签；普通字段会 HTML 转义。不要注入脚本、事件处理器或外部资源。

## 项目图片

```json
{
  "id": "project-slug",
  "name": "本期项目名称",
  "descriptionHtml": "一句话介绍",
  "image": "./images/project.png",
  "remoteImage": "https://mmbiz.qpic.cn/...",
  "recruiting": true
}
```

- `id` 使用小写字母、数字和连字符，且不能重复。
- `image` 是本地图片，路径相对于本期配置文件；支持 PNG、JPG、WebP、SVG。
- `remoteImage` 是上传后取得的 HTTPS 图床地址，供微信 SVG 使用。
- 未提供 `image` 时显示几何占位卡，不需要虚构图片。
- 没有本地图可以先做 HTML 预览；有本地图但没有 `remoteImage` 时，不能导出微信 SVG。
- 不用上一期 `remoteImage` 顶替新图，即使图片内容看起来相同，也应先确认它是本期有效资产。

## 推荐赛事

`growth.events` 默认是空数组，不默认推荐上一期比赛。需要时填写：

```json
{
  "name": "赛事名称",
  "note": "报名或提交说明",
  "prizeHtml": "奖励说明",
  "date": "YYYY.MM.DD—MM.DD",
  "url": "https://官方赛事页面"
}
```

必须核对日期、资格、奖金与官方链接。企业赛道尚在接洽时只能写正在接洽，不能写成已合作。

## 署名与 Banner

`credits` 渲染为末尾署名行，并生成 `build/credits.json`。默认品牌 Banner 为无署名版，不固定任何个人姓名。

需要标准 900×373 署名 Banner 时，使用 [wechat-banner](../../../视觉资产/wechat-banner/SKILL.md)，将角色和姓名交给它生成；不要在此模板中复制 Banner 生成器或沿用上期图片。

## 输出与本地状态

`build/`、`.tmp/` 和根目录 `content.json` 不进入版本控制。需要长期归档的期次配置应去掉敏感或临时信息后单独管理，不要把会话预览链接、浏览器目录或目标草稿 ID 提交到仓库。
