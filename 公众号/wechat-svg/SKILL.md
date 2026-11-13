---
name: wechat-svg
description: >-
  WeChat / 微信公众号 SVG constraints and bubbling-group interaction design.
  Use when adapting SVG for WeChat paste, fixing missing arrows or oversized
  diagrams, designing pure-SVG interactions without JS, or working with
  id/class/defs/marker/foreignObject compatibility. Includes inline
  SVG AttributeName whitelist. 也用于把 HTML/设计稿导入公众号（ezDrop、Z0
  插件）、取 mmbiz 图片固定链接、处理掉字与图案错位。
license: WTFPL
metadata:
  author: doocs/md
  maintainer: dawnear
  version: "1.1.0"
  status: beta
  updated: "2026-11-14"
  upstream: https://github.com/doocs/md
---

# WeChat SVG Skill

适用于微信公众号、小程序等强约束 SVG 环境。

## 何时调用

- 用户要把 SVG 粘贴到微信公众号，或排查粘贴后样式/交互失效
- 需要纯 SVG、无 JS、无块级 CSS 的交互动画
- 约束包含：无 `id` / `class` / `defs` / `href` 依赖
- 需要深层 `<g>` 嵌套、透明触发器、事件冒泡组织动画
- 需要接入 `<image>`、文本卡、外部素材，或排查 transform 串层、箭头消失、尺寸异常
- 要把 HTML / 设计稿 / SVG 文件导入公众号编辑器，导入后掉字、图案错位
- 需要公众号图床（`mmbiz.qpic.cn`）的图片固定链接来内联 `<image>`

## SVG AttributeName 白名单

微信生态对 SVG 动画的 **AttributeName** 有白名单。超出白名单的标签、指令或属性名，可能在保存后被平台过滤。

| 元素 | Name | 说明 |
| --- | --- | --- |
| `animate` | `x` | 控制简单几何体 x 轴方向移动 |
| `animate` | `y` | 控制简单几何体 y 轴方向移动 |
| `animate` | `width` | 控制简单几何体宽度变化 |
| `animate` | `height` | 控制简单几何体高度变化 |
| `animate` | `opacity` | 控制透明度变化，数值通常为 0 到 1 |
| `animate` | `d` | 控制贝塞尔曲线补间，表现可能有随机性 |
| `animate` | `points` | 控制多边形补间，表现可能有随机性 |
| `animate` | `stroke-width` | 控制描边宽度 |
| `animate` | `stroke-linecap` | 控制描边端点样式 |
| `animate` | `stroke-dashoffset` | 控制描边偏移，常用于线性遮罩/进度线 |
| `animate` | `fill` | 控制填充色过渡变化 |
| `set` | `visibility` | 控制可见性：`visible` / `hidden` / `collapse` / `inherit` |
| `animateTransform` | `translate` | 控制路径和编组位移 |
| `animateTransform` | `scale` | 控制路径和编组缩放，可用于翻转 |
| `animateTransform` | `rotate` | 控制路径和编组旋转 |
| `animateTransform` | `skewX` | 控制 x 轴倾斜 |
| `animateTransform` | `skewY` | 控制 y 轴倾斜 |
| `animateMotion` | `path` | 复杂轨迹动画，可配合 `rotate` 定义朝向 |

### 禁用边界

在设计或适配 SVG 时，默认遵守：

- 不使用 `id`
- 不使用 `class`
- 不使用 `href` / `xlink:href` 作为样式与结构依赖（含 `url(#id)` 引用）
- 不使用 `defs`
- 不使用 `embed`
- 不使用块级 CSS 与 JS 动画
- 样式尽量以内联属性或 `style=""` 的最小必要形式书写

### 静态图表适配要点（非交互动画）

第三方 SVG（如 Mermaid）粘贴到微信时，常见问题与修法：

| 现象 | 原因 | 修法 |
| --- | --- | --- |
| 箭头消失 | `<defs>` + `<marker>` + `url(#id)` 被过滤 | 将 marker 展开为内联 `<path>` / `<polygon>`，移除 `marker-end` |
| 图表过大 | `width="100%"` 或 CSS `max-width` 被忽略，按 viewBox 1:1 渲染 | 设置显式像素 `width` / `height`（不超过正文栏可用宽度），保留 `viewBox` |
| 文字错位 | `foreignObject` 兼容性差 | 转为 `<text>` / `<tspan>` 或外层 HTML `<section>` |

## 核心使用原则

1. 先判断这是不是「真正的无 ID 冒泡编组问题」
2. 先搭结构，再写动画
3. 区分世界层 / 遭遇层 / 触发层
4. 最深层透明触发器放在整条父子链最底部
5. 每个遭遇物做成闭环模块：施加层 → 姿态层 → 抵消层
6. 先统一交互模式，再统一全链实现

详细原则见 [core-principles.md](./references/core-principles.md)。

## 生产工具链：导入与取图

公众号编辑器不能直接粘贴网页。实际工作流是浏览器插件 + 图床链接：

- **ezDrop**（<https://ezdrop.cn>）：右侧栏，一键 / 局部导入 SVG，提取全文 HTML
- **Z0 公众号编辑插件**（<https://plugin.zer0n.cn>，免费）：导入前检查（≥2048 字符的属性会被编辑器整条删除）、强制固定代码、图片转存、背景图兼容、暂停/重播动效
- 保存前必须打开 Z0 的「强制固定代码」，否则长动画路径会被删
- 保存草稿后用**手机预览**验收，桌面编辑器看不出窄屏错位
- 图片要先上传公众号，再取 `mmbiz.qpic.cn` 固定链接，才能写进 `<image href>`

完整步骤（含两种取图片链接的方法、字与图案的兜底、分段降级）见 [authoring-toolchain.md](./references/authoring-toolchain.md)。

## 已验证的交互写法

```xml
<animateTransform
  begin="click"
  dur="30s"
  fill="freeze"
  restart="never"
  ... />
```

固定要求：

- 所有交互动画统一 `begin="click"`
- 所有交互动画统一 `fill="freeze"`
- 所有交互动画统一 `restart="never"`
- 删除所有旧的 `touchend;mouseup` 回位链
- 不允许一部分层保留旧长按逻辑，一部分层改成 click-only

## 嵌套与变换

### 嵌套规则

- 必须形成连续不间断的绝对父子链，不是「很多 `<g>` 平铺」
- 任何平级断链都会让冒泡和补偿逻辑失效

### 变换规则

- 标准写法：**施加 → 抵消 → 再施加**
- 父层改变参考系，子层拿回局部控制权，更深层通过补偿层回到干净坐标基准

## `<image>` 接入

- `<image>` 不能直接丢到 SVG 根部
- 必须挂在对应对象的局部姿态层或遭遇层内部
- 位移、旋转、出场时机由外层 `<g>` 的 `animateTransform` 控制
- 位置用 `x` / `y`，尺寸用 `width` / `height`，不依赖外部 CSS
- `href` 用公众号素材库的 `mmbiz.qpic.cn` 固定链接；先把图片上传/转存，再取链接，取法见 [authoring-toolchain.md](./references/authoring-toolchain.md)

```xml
<g>
  <animateTransform attributeName="transform" type="translate"
      begin="click" dur="80s"
      values="..."
      keyTimes="..."
      fill="freeze" restart="never" />

  <g>
    <animateTransform attributeName="transform" type="rotate"
        begin="click" dur="80s"
        values="..."
        keyTimes="..."
        fill="freeze" restart="never" />

    <image x="0" y="-800" width="609" height="639" href="..." />
    <image x="0" y="-1500" width="609" height="634" href="..." />
  </g>
</g>
```

详细规则与排错见 [image-integration.md](./references/image-integration.md)。

## 排错顺序

按顺序排查，不要跳步：

1. 是否还是绝对父子链
2. 触发器是否在最深层
3. 补偿层是否成对存在
4. 坐标是否跑出视口
5. `opacity` / `visibility` 是否误伤深层
6. `keyTimes` 与出现窗口
7. （静态 SVG）是否仍依赖 `defs` / `id` / 百分比宽度
8. 掉字 / 图案错位是否该降级成图片：见 [authoring-toolchain.md](./references/authoring-toolchain.md) 第 4 节

## 常见错误与固定修法

| 错误 | 现象 | 修法 |
| --- | --- | --- |
| 平级 `<g>` 当深层结构 | 事件链断 | 回到单一路径父子链 |
| 只施加，不抵消 | 后续对象继承前一层轨迹 | 每个遭遇物补上抵消层 |
| 局部闪烁挂在公共父层 | 深层对象一起透明 | 把 `opacity` 动画缩到最小局部组 |
| 文案/字幕放错逻辑层 | 视觉居中但脱离编组 | 绑对象局部层，或放最深层补偿后的视口坐标层 |
| 交互模式半新半旧 | 部分层仍用旧长按逻辑 | 全链统一 `begin` / `fill` / `restart` |
| marker 箭头依赖 defs | 粘贴后箭头消失 | 内联展开箭头，移除 `marker-end` |
| SVG 使用 width 100% | 粘贴后撑满编辑器 | 写死像素宽高并保留 viewBox |
| 粗体 / 空心 / 异形字用 `<text>` 硬排 | 保存后字消失或错位 | 转成 SVG 路径或小图，再内联进主 SVG |
| `<image href>` 用外链或缩略图地址 | 转存后图片丢失 / 变糊 | 先上传公众号，取 `mmbiz.qpic.cn` 固定链接 |

## 新模块实施顺序

1. 判断属于世界层还是遭遇层
2. 先画静态本体
3. 搭施加层 / 姿态层 / 抵消层骨架
4. 计算时序与 `keyTimes`
5. 再接文本卡、`<image>`、说明层
6. 最后统一检查交互模式、补偿层、最深层触发器

## 延伸阅读

- [core-principles.md](./references/core-principles.md) — 洋葱式嵌套、模块化、局部效果收口
- [image-integration.md](./references/image-integration.md) — `<image>` 接入与典型陷阱
- [authoring-toolchain.md](./references/authoring-toolchain.md) — ezDrop / Z0 插件、HTML 导入、图片固定链接、字与图案兜底

## 来源

内容整理自 [doocs/md](https://github.com/doocs/md)（WTFPL）的公众号 SVG 实践，并按 IF.Link 的使用场景补了排查表。v1.1.0 起补入黄东迩 2026-11-14 演示的插件与素材流水线。
