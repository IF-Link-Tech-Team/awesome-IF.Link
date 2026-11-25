---
name: iflight-monthly-bauhaus
description: >-
  制作 IF.Light 月榜赛系列推文，复用包豪斯配色、几何网格、传送带、开箱、折叠面板与领奖台动效。
  当用户要求制作新一期月榜赛推文、替换届次/赛程/奖项/项目/署名、导出同款 HTML、微信 SVG、
  1080px 双长图或同步秀米时使用。不是通用公众号模板，也不处理其他活动的视觉重设计。
license: MIT
compatibility: Requires Node.js 22+, Python 3.10+ with Pillow, and Chrome for rendering. Optional Xiumi sync requires an authorized browser session.
metadata:
  author: IF.Link
  maintainer: IF-Link-Tech-Team
  version: "1.0.0"
  status: beta
  updated: "2026-11-25"
---

# IF.Light 月榜赛包豪斯模板

只维护月榜赛的品牌视觉系统、HTML 模板与专用适配器。通用公众号生产、微信 SVG 基础规范和标准 Banner 不在这里重复维护。

## 先调用已有能力

- 文案、分页与通用视觉检查：[iflink-wechat-content-production](../iflink-wechat-content-production/SKILL.md)。
- 微信 SVG 兼容、图床固定链接与公众号导入排错：[wechat-svg](../wechat-svg/SKILL.md)。
- 标准 900×373 署名或无署名 Banner：[wechat-banner](../../视觉资产/wechat-banner/SKILL.md)。

本 Skill 的 `build-wechat-svg.mjs` 仅适配 `templates/monthly.html` 的结构，不是任意 HTML 的通用转换器。

## 每期必须替换的内容

届次、年份、标题、赛程、投票规则、奖项与权益、推荐赛事、项目与图片、社区数据和署名，均以当期确认信息为准。不得把上一期的数据或图床地址当成默认值。

复制 `content.example.json` 为本期独立配置文件，替换占位内容，并显式设置：

```json
"example": false
```

示例值只能预览，不能同步秀米或发布。字段与图片规则见 [configuration.md](references/configuration.md)。

## 制作流程

### 1. 读取配置并渲染 HTML

在 Skill 根目录执行：

```bash
node scripts/render-monthly.mjs --content path/to/content.json --output build
```

预览虚构示例时，才使用：

```bash
node scripts/render-monthly.mjs --content content.example.json --allow-example
```

渲染器生成 `monthly.html`、`content.json`、`credits.json` 和 `render-manifest.json`。本地项目图复制到输出目录；`image` 相对于配置文件所在目录解析。

### 2. 检查本期内容

- 默认几何项目卡不含真实图片；配置 `image` 后才使用实际项目图。
- 需要微信 SVG 的项目图必须另有本期 `remoteImage`，使用 HTTPS 微信图床固定链接。
- 本地预览可以先不填 `remoteImage`；缺少它时，SVG 导出会明确停止，不复用旧链接。
- 署名通过 `credits` 替换。需要标准署名 Banner 时，把 `build/credits.json` 交给 `wechat-banner`，不要沿用旧 Banner 中的姓名。

### 3. 导出模板专用 SVG 与双长图

```bash
node scripts/build-wechat-svg.mjs
node scripts/export-long-images.mjs
```

输出在 `build/`：

- `monthly-wechat.svg` 与 `monthly-preview.html`；
- `wechat-parts/` 及分段清单；
- `monthly-HTML-1080.png` 与 `monthly-SVG-1080.png`。

非默认输出目录通过 `MONTHLY_BUILD_DIR` 指定。Chrome 不在默认位置时，先设置 `CHROME_PATH`。

### 4. 验收

```bash
python scripts/validate-monthly.py \
  --html build/monthly.html \
  --svg build/monthly-wechat.svg \
  --parts-dir build/wechat-parts \
  --expect-images 0 \
  --expect-png build/monthly-HTML-1080.png \
  --expect-png build/monthly-SVG-1080.png
```

`--expect-images` 按本期实际有图项目数修改。静态检查不能代替画面验收：必须查看开头、折叠面板、项目卡、领奖台、署名与 Banner，并对照 HTML/SVG。

完整自检：

```bash
python scripts/doctor.py --full
```

### 5. 可选秀米同步

先明确是新建草稿还是修改哪一篇。除 `new` 和只读 `inspect` 外，必须显式提供目标 ID：

```bash
node scripts/xiumi-import.mjs inspect
node scripts/xiumi-import.mjs probe --target-id <目标草稿ID>
node scripts/xiumi-import.mjs save --target-id <目标草稿ID>
node scripts/xiumi-import.mjs sync --target-id <目标草稿ID>
```

`new` 只在用户要求新建时使用。脚本不会发布或群发；`sync` 只生成短期预览链接。正式发布与全员群发需另行明确授权。浏览器调试地址用 `XIUMI_CDP_ENDPOINT` 配置，不打包任何登录状态。

## 固定设计边界

- 保留配色、几何、375px 网格、传送带、包裹、折线、折叠面板和领奖台；变量优先走配置，不在各期复制脚本。
- 不把正文挤入窄折线、斜切框或装饰区；文本变长时增加纵向空间，不强行缩小。
- 不把真实项目图、奖项、日期、姓名、社区统计或上一期链接写进模板和示例。
- 不将本模板的标准无署名品牌资源复制成另一套 Banner 生成器；标准 Banner 直接使用已有 Skill。
- 品牌素材遵循仓库许可例外，仅限 IF.Link 内部及经授权场景使用。

详见 [style-guide.md](references/style-guide.md) 和 [虚构示例总览](references/examples/overview.png)。
