---
name: wechat-banner
description: >-
  制作 IF.Link 微信公众号底部 Banner、结尾 Banner、人员署名或无署名 Banner。
  用户提到公众号底部图、文末二维码、文案/排版/设计/审核人员署名、贡献者名字、
  无署名版本、900×373 Banner、Banner SVG 模板，或要求复用 IF.Link 固定底部模板时使用。
  提供一条命令导出 PNG、素材自检、署名 JSON、HTML/SVG 模板和完整品牌素材。
license: MIT
compatibility: Requires Python 3 with Pillow for PNG export; a modern browser for HTML/SVG preview.
metadata:
  author: IF.Link
  maintainer: dawnear
  version: "1.2.0"
  status: beta
  updated: "2026-11-15"
---

# IF.Link 公众号底部 Banner

使用固定模板生成 900×373 px 的公众号文末图片，不重新设计版式。

**署名指文案、排版、设计、审核等贡献者的姓名。** 右下角“源自东南大学的 AI 创客与科技交流社区”是固定社区介绍，不属于人员署名，两个版本都保留。

## 开箱即用

在 Skill 根目录执行：

```bash
python3 -m pip install -r requirements.txt
python3 scripts/generate_banner.py --doctor
python3 scripts/generate_banner.py --mode all
```

第三条命令会在 `output/` 同时生成署名版和无署名版 PNG。署名版默认使用 `templates/credits.example.json` 中的示例姓名，仅用于预览；正式使用时必须替换。

`--doctor` 会检查 Pillow、3 张图片和 3 套字体，缺素材或依赖时会给出明确错误，不需要手动排查路径。

## 正式署名流程

1. 向用户确认角色与姓名，不编造或遗漏贡献者。角色可按实际贡献写“文案”“排版”“设计”“审核”等。
2. 将 [templates/credits.example.json](./templates/credits.example.json) 复制到本次任务的输出目录，修改 `role` 和 `lines`，不要覆盖示例文件。
3. `lines` 中每个字符串是一行；多人同一行放在一个字符串中，需要换行时拆成多个字符串。保留 `组织@姓名` 前缀。
4. 在 Skill 根目录运行：

```bash
python3 scripts/generate_banner.py --mode credited --credits <署名配置.json>
```

5. 固定版式最多容纳 4 行人员署名；超出时先与用户确认精简或换行方式，不压缩字体或覆盖 Logo。

## 生成命令

| 需求 | 命令 |
| --- | --- |
| 检查依赖与素材 | `python3 scripts/generate_banner.py --doctor` |
| 生成署名版 | `python3 scripts/generate_banner.py --mode credited --credits <配置.json>` |
| 生成无署名版 | `python3 scripts/generate_banner.py --mode no-attribution` |
| 一次生成两张 | `python3 scripts/generate_banner.py --mode all --credits <配置.json>` |
| 自定义单张路径 | 增加 `--output <文件.png>` |
| 自定义批量目录 | 增加 `--output-dir <目录>` |

PNG 导出只依赖 Python 和 Pillow，不需要 Chrome、Node 或手动截图。

## 模板与预览

| 类型 | 署名版 | 无署名版 |
| --- | --- | --- |
| SVG 可编辑模板 | [credited.svg](./templates/credited.svg) | [no-attribution.svg](./templates/no-attribution.svg) |
| HTML 模板 | 使用 Python 生成器 | [no-attribution.html](./templates/no-attribution.html) |
| PNG 预览 | [credited.png](./assets/preview/credited.png) | [no-attribution.png](./assets/preview/no-attribution.png) |

SVG 中的署名是示例文本，直接编辑 `<text>` 即可修改；JSON 配置只驱动 Python 生成器，不会自动改写静态 SVG。

SVG 模板遵循固定尺寸和静态结构约束：显式 `width="900"`、`height="373"` 与 `viewBox`，不使用 `id`、`class`、`defs`、JS 或 `foreignObject`，文本样式内联。`<style>` 仅用于加载包内字体及字体回退，`<image href>` 使用包内相对路径。

**SVG 默认用于编辑和导出 PNG，不直接粘贴公众号。** 若必须直接粘贴 SVG，先按 `wechat-svg` 将文字转路径，并把图片替换为公众号 `mmbiz.qpic.cn` 固定链接。

## 硬性约束

- 成品必须恰好为 **900×373 px**，黑色背景，无白边、滚动条、缩放或裁切。
- 左侧署名起点为 `x=52`；二维码和社区介绍的右边缘为 `x=850`，即左右边距分别约 52px 和 50px。
- 所有字体、Logo、二维码均使用本 Skill 的 `assets/`；不得依赖原生成包或外部绝对路径。
- 署名区在左上角，角色为橙色、姓名为白色；二维码在右上，Logo 在左下，社区介绍在右下。
- 不将二维码缩糊、拉伸或截断，不自行换成其他账号的二维码。
- 未指定输出位置时写入 `output/`，不覆盖 `assets/preview/` 中的参考图。
- 公众号正文插入导出的 PNG，不直接粘贴 HTML/SVG 源码。
- `assets/` 中的 IF.Link 品牌素材不随 MIT 许可授权，仅限 IF.Link 内部及经授权场景使用；第三方字体按其各自许可使用。

## 验收

- 先运行 `--doctor`，再实际生成需要的模式；不能只做语法检查。
- 图片尺寸、背景、字体和相对位置与对应预览一致，右侧不得出现异常的宽黑边。
- 人员角色、姓名、组织前缀和换行与用户确认的信息一致。
- 微信公众号与小红书二维码及标签完整清晰，英文 slogan 为 `Link the IFs, connect the Dots.`。
- 两个版本都保留社区介绍；只有人员署名版出现贡献者名单。
