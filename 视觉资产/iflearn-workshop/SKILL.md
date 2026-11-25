---
name: iflearn-workshop
description: >-
  为 IF.Learn 系列课程生成统一橙黑视觉的横版海报、易拉宝、现场横幅和微信转发文案。
  用户提到 IF.Learn、IF.Link 二课、Workshop 宣传物料、系列课程海报、活动招募文案，
  或延续 AI Coding / AI Hardware / 3D 打印海报风格时使用。
license: MIT
compatibility: Requires macOS with Google Chrome and Node.js 22+; zero npm dependencies. Brand assets are IF.Link internal only and not covered by MIT.
metadata:
  author: IF.Link
  maintainer: YunfanGoForIt
  version: "1.2.0"
  status: beta
  updated: "2026-11-25"
---

# IF.Learn Workshop 视觉生成

用同一份活动配置生成完整宣传包：横版海报、易拉宝、横幅、微信转发文案及对应 PNG。所有产出放在用户指定的任务目录，不修改 Skill 内置模板和参考成品。

## 内置资源

- 官方 IF.Link / IF.Learn 深浅底矢量 Logo，位于 `assets/logos/`。
- Inter Variable 与思源黑体，位于 `assets/fonts/`。
- 内置插画：`cube`、`hardware`、`3d-print`、`content`，位于 `assets/illustrations/`。
- 近期横版成品与 AI Coding 原版易拉宝、横幅位于 `references/examples/`，生成前用图片查看工具对照风格。
- `references/examples/aigc-video/` 是 AIGC 视频创作课的**历史成品配置**，只用来跑通/对照版式：
  `node scripts/generate.mjs references/examples/aigc-video/content.json <输出目录>`。
  内含某一场活动的真实报名二维码与名额，**不得把这些活动信息复用到新场次**。
- 精确视觉规则见 `references/style-guide.md`；微信文案结构见 `references/copy-guide.md`。

## 工作流程

1. **先主动问，不要替用户假设。** 每场活动的时间、地点、名额、报名二维码、署名、"不能提的内容"都是这次才成立的，必须当场向用户采集：打开 `references/intake.md`，把里面的提问清单整段发给用户（可让用户填空或口述），再逐项映射到 `content.json` 字段。用户没给的项留占位并写进交付说明；二维码、Logo 一律不得伪造。
   若用户已经在需求里说全了（时间/地点/名额/二维码都在），跳过提问直接进入第 2 步，但仍要确认"有没有不能对外提的内容"。
2. 查看 `references/examples/` 中至少一张成品，并阅读 `references/style-guide.md`。主题插画应与课程内容直接相关，优先重新绘制内联 SVG，不使用无关联装饰图。
3. 将 `content.example.json` 复制到任务目录并填写（`references/examples/aigc-video/content.json` 是填好的完整参考）。`ILLUSTRATION` 可填内置名称；也可用 `ILLUSTRATION_FILE` 指定自定义 SVG / PNG。`QR_IMAGE` 和 `ORGANIZER_LOGO` 支持相对配置文件的路径或绝对路径。
4. 微信文案遵循 `references/copy-guide.md`：保留原始文案的亲和力，活动时间与地点集中成独立段落，报名开放时间、名额、入群方式不得含糊。
5. 运行生成命令：

```sh
node "<skill目录>/scripts/generate.mjs" "<任务目录>/content.json" "<任务目录>/out"
```

6. 生成器会用无头 Chrome **实测**橙色/黑色标题块的字号：先按启发式给一个初始值，放不下就二分缩到刚好贴合（只缩不放，不会为了填满而放大），并在终端打印实测结果，如 `字号实测: title-orange=86px title-black=41px`。生成器输出：
   - `horizontal.html`、`horizontal.png`、`horizontal@2x.png`
   - `rollup.html`、`rollup.png`、`rollup@2x.png`
   - `banner.html`、`banner.png`、`banner@2x.png`
   - `wechat-forward.txt`
7. 必须用图片查看工具检查三张实际 PNG：标题不溢出、Logo 不变形、二维码清晰、底部不裁切、中英文没有回退成异常字体。检查微信文案中的日期、星期、24 小时制时间、地点、名额和报名路径。
8. 交付时链接输出目录、三张高清图和微信文案。**在聊天/网页里预览时引用 `@2x` 文件**（视网膜屏上 1x 图会被浏览器放大约 2 倍，看着发虚）；印刷、投影、大屏一律用 `@2x`。若仍有占位素材或未能验证的内容，明确列出，不将半成品描述为完成。

## 信息采集纪律（v1.2）

- **一场活动一份信息。** 不复用 `references/examples/aigc-video/` 里的日期、名额、报名二维码、署名，也不复用上一场"不要提 H3／不要写主办"之类的口径——那都是当场的决定，要重新问。
- **禁止项要主动问。** 每次都问一句"有没有不能对外提的内容/工具/合作方"，拿到答案后按 `references/intake.md` 的自检清单核对产物。
- **不确定就留占位。** 报名时间、名额、二维码、联办名称没确认时用"待补充"占位，并在交付说明里单列，不猜测、不编造。
- 用户说"你看着办"的部分才可自行决定，且要在交付说明里标明哪些是替代方案。

## 版式字段（v1.1 新增）

| 字段 | 作用 |
| --- | --- |
| `TOP_LINE` | 横版标题块上方的一行定位语，如 `0 基础 · 120 分钟 · 现场做出成片`；缺省由 `DURATION` 拼出 |
| `STEP1_TITLE` / `STEP1_DESC` | 横版左下的三步介绍（01/02/03）；缺省取 `SCHEDULE` 前三项 |
| `ORGANIZER_STYLE` | `logo-only`（默认，页头只放 IF.Link Logo）\| `text`（Logo 后加"主办/名称"）\| `none` |
| `BANNER_ORGANIZER` | 横幅左下角显示的署名，缺省用 `ORGANIZER` |

页头默认**不写"主办"字样**、IF.Link 只出现一次；需要联办署名时再开 `ORGANIZER_STYLE: "text"`。

## 核心约束

- 浅灰底、橙黑标题块、强对比无衬线字体、右上角或右侧主题插画，是系列识别核心。
- Logo 必须调用官方矢量文件，不能用文字模拟，不能自行改变比例。
- 标题长度变化时调整字号，不通过拉伸文字或压缩 Logo 解决。
- 插画使用橙、黑、灰和少量功能色；结构线条简洁，转角与端点平滑。
- 不把长篇课程介绍全部塞上海报；海报保留行动所需信息，细节进入微信转发文案。
- 默认使用本机 Chrome 和 Node.js，不引入第三方运行依赖。
