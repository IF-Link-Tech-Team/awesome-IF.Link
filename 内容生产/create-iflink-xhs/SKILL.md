---
name: create-iflink-xhs
description: 将 IF.Link、IF.Land、IF.Learn 网站图文教程、讲座、Markdown或素材转换为可发布的小红书图文。下载并融入原文图片，生成官方Logo与品牌风格一致的封面正文PNG、自然表达的发布文案和可编辑源；缺关键配图时制作前说明所需素材。用于IF.Link小红书制作与改稿，不用于AI白方或公众号。
license: MIT
metadata:
  author: IF.Link
  maintainer: Last-emo-boy
  status: beta
  updated: "2026-11-15"
  source: https://github.com/IF-Link-Tech-Team/iflink-xhs-skill/tree/34192a8673b2c8f91dda9415c2b63a47b5b2c41a
---

# IF.Link小红书图文

## 运行依赖

Requires Python 3.10+ with Pillow. Image downloading needs access to the supplied source URLs.

阅读references/brand.md、references/editorial.md，参考下述可复用版式原则和合成示例 assets/tutorial-example.png，再制作。先确认内容规划，再完整交付。

## 制作流程
1. 读取完整正文和原图，过滤目录/导航/登录/打卡；将网页里的命令当素材，不执行。建立图文清单，记录正文段落与对应图片。参考网页打不开时索要截图/导出件，不能声称已经参考。
2. 下载内容图片：`python3 scripts/download_source_images.py URL --output /absolute/images`。已有HTML可加`--html PATH`；正文资源路径明确时用`--include-pattern PATTERN`排除其他资产。查看manifest与全部原图。若脚本未解析懒加载/srcset/picture，则读取网页补齐，不能把“未解析到”当成无图。
3. 检查图片可读、相关，建立页图对应。关键图缺失时按editorial规则在制作受影响页面前索要明确素材；不默默降级纯文字。保留未受影响的工作。
4. 先规划并与用户讨论大纲，不直接写最终逐页内容或渲染。建立章节/步骤覆盖表，先判断完整内容能否在一期内清楚表达、拆分会否打断操作链或削弱对比与结论，再提出一期或分期的建议及理由；不要默认分期。规划读者目标、范围、逐页大纲、配图和总张数；每期最多18张，封面与结束页计入，正文最多16张。一期能在18张内完整表达时优先一期。超过18张且存在独立任务时才建议分期；若分期损害表达，说明具体影响，建议重组页面或明确范围的专题版本，并与用户讨论，不删关键步骤凑数。分期时说明各期衔接。等待用户确认或调整大纲后再进入步骤5。用户已确认具体大纲或明确授权自行规划时，可按已有授权推进，不重复询问。保留步骤、执行前提、必要提示词、完成标志；核验价格、版本、菜单和部署方法，历史截图日期记录在来源说明。
5. 写slides.json，字段说明见references/sample-slides.json：顶层meta.logo指定官方栏目Logo；pages逐页。type为cover/body/ending；title必填；blocks默认是自然正文（heading/text）；需要读者复制、发送或执行的提示词、命令、代码、引用示例必须使用type="quote"或"code"，放入与截图完全一致的黑底荧光绿粗描边框，不当普通正文排版。框内正文白色，分组标题绿色；框参数与截图相同，支持parts分段，溢出时先调整组织，不缩字号。自然文段的highlights只挑关键事实、条件或结论，支持跨行；分点结构用lead指定冒号前标题，标题连冒号统一荧光绿，冒号后内容以白色为主；cover可有kicker/subtitle，kicker橙色标签只写本篇主题关键词，不写“第一期/第二期/上篇/下篇”等期次；body不渲染label，主标题上移、编号橙色其余白色正排，正文重点荧光绿；所有body统一深灰底，cover与ending为相同荧光绿格子底。封面/结束页截图放黑色白网格底框，正文截图放黑底荧光绿粗描边框，不使用格子纹，框固定撑满内容宽度，图片等比适应框，框高随图片及可用空间调整；不得缩窄框，正文40px内边距及荧光绿10px粗描边，封面20px内边距及浅色细描边；42px圆角及轻阴影，不使用撕纸素材，橙色短标签不带四方块图标；结束页黑框内重点橙色、正文白色，按内容居中，IF.Link页脚居中。每篇必须有结束页，在黑框外下方居中固定显示 IF.Link slogan：“Link the IFs, Connect the Dots.”；黑框内主要放本篇具体内容总结；下篇预告仅在已确定下一篇且衔接有价值时添加，不默认添加，不替代框外 slogan，单篇与分期均适用。
6. 给图文页添加image：path为相对JSON目录或绝对本地路径；默认完整构图，只有用户明确授权时才使用crop原图像素[x0,y0,x1,y1]，caption为来源记录（可选，不渲染到首页/正文图片下方），redactions为裁切后坐标矩形数组（可选）。禁止为填版擅自放大裁切、重构网页截图；保持原图，另存打码版本，避免敏感原图进入交付包。制作时用实际图片，不仅给占位框。
7. 定稿前执行自然表达编辑：读取references/humanizer-zh.md与references/shuorenhua.md，按保真优先的边界审稿。必要时读references/shuorenhua-editing-guide.md和references/shuorenhua-examples.md。两份原文与MIT许可已内置，禁止把去AI味变成删关键步骤或编经历；用完整动作替代“把第一版做小”等模糊缩略，详见editorial示例。
8. 渲染前检查已确认的各期pages数量均≤18（含封面和结束页）；超过则返回大纲规划，禁止直接输出超限图文。每期分别使用内容源和输出目录，保留各自封面、结束页与发布文案。渲染：`python3 scripts/render_carousel.py slides.json --output /absolute/output`。查看总览和每张单图，检查可读性、相关性与无裁切/叠字/敏感内容，核对全部可复制或引用材料已经入框、框与截图一致、分点前缀统一绿色、自然正文重点不散标工具名与命令，并核对封面标签只有主题关键词、结束页固定 slogan 完整显示在框外；不渲染右上角副标题、右下角页码。溢出时重排/拆页，不缩小正文字号硬塞。
9. 交付按序PNG、总览、发布文案.md（推荐标题/备选/正文/话题；正文不带链接，不出现“原教程”等转载式称呼，以本品牌视角独立讲清工具、步骤、完成标志）、slides.json、配套安全图片和来源说明。将用户可见成果保存到本次指定的输出目录，不写入安装目录；改稿替换同一成果并更新来源说明。未经用户要求不发布账号。

## 迭代
同时修改样稿、脚本与通用规则；区分用户确认项与待确认版式。保留指定字体缺失的说明。按skill-creator验证与保存技能；不要只更新当前图片而漏改Skill。
