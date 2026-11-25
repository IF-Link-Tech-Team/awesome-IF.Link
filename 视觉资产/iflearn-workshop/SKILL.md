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
  version: "1.0.0"
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
- 精确视觉规则见 `references/style-guide.md`；微信文案结构见 `references/copy-guide.md`。

## 工作流程

1. 收集活动主题、主办方、时间、地点、报名方式、课程收获和原始文案。缺少二维码或合作方 Logo 时不得伪造；可保留占位并明确告知用户。
2. 查看 `references/examples/` 中至少一张成品，并阅读 `references/style-guide.md`。主题插画应与课程内容直接相关，优先重新绘制内联 SVG，不使用无关联装饰图。
3. 将 `content.example.json` 复制到任务目录并填写。`ILLUSTRATION` 可填内置名称；也可用 `ILLUSTRATION_FILE` 指定自定义 SVG / PNG。`QR_IMAGE` 和 `ORGANIZER_LOGO` 支持相对配置文件的路径或绝对路径。
4. 微信文案遵循 `references/copy-guide.md`：保留原始文案的亲和力，活动时间与地点集中成独立段落，报名开放时间、名额、入群方式不得含糊。
5. 运行生成命令：

```sh
node "<skill目录>/scripts/generate.mjs" "<任务目录>/content.json" "<任务目录>/out"
```

6. 生成器会输出：
   - `horizontal.html`、`horizontal.png`、`horizontal@2x.png`
   - `rollup.html`、`rollup.png`、`rollup@2x.png`
   - `banner.html`、`banner.png`、`banner@2x.png`
   - `wechat-forward.txt`
7. 必须用图片查看工具检查三张实际 PNG：标题不溢出、Logo 不变形、二维码清晰、底部不裁切、中英文没有回退成异常字体。检查微信文案中的日期、星期、24 小时制时间、地点、名额和报名路径。
8. 交付时链接输出目录、三张高清图和微信文案。若仍有占位素材或未能验证的内容，明确列出，不将半成品描述为完成。

## 核心约束

- 浅灰底、橙黑标题块、强对比无衬线字体、右上角或右侧主题插画，是系列识别核心。
- Logo 必须调用官方矢量文件，不能用文字模拟，不能自行改变比例。
- 标题长度变化时调整字号，不通过拉伸文字或压缩 Logo 解决。
- 插画使用橙、黑、灰和少量功能色；结构线条简洁，转角与端点平滑。
- 不把长篇课程介绍全部塞上海报；海报保留行动所需信息，细节进入微信转发文案。
- 默认使用本机 Chrome 和 Node.js，不引入第三方运行依赖。
