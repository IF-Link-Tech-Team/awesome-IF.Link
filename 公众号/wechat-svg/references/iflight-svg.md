# 从 IF.Light 复用纯形状 SVG

`scripts/svgasset.py` 源自 [IF.Light 的 wechat-push/src/svgasset.py](https://github.com/IF-Link-Tech-Team/IF.Light/blob/215f5b75bfef91a9fa396c97111db411eb3a94e8/wechat-push/src/svgasset.py)，这里按 MIT 许可维护该 Python 文件。它不是完整 SVG 渲染器，也不是安全消毒器。

## 命令行

在本 Skill 目录运行：

```bash
python3 scripts/svgasset.py logo.svg --output output/logo.svg --color '#242021'
```

输入适合仅有 path、rect、circle、ellipse、polygon、polyline、line 和 g 的图标。输出固定像素尺寸，清除 id/class/defs，压平渐变，并按 viewBox 原点补偿坐标。

## 原有 Python 入口

将 `scripts/` 加入调用方的 Python 模块路径后，可继续使用：

```python
from svgasset import sanitize, place

asset = sanitize("logo.svg", current_color="#242021")
fragment = place(asset, x=120, y=80, size=48)
```

`sanitize` 返回 `w`、`h`、`inner`；`place` 返回居中、等比缩放的 `<g>` 片段。不改调用方原来的文章结构。

## 转换边界

渐变取颜色近似值；文字、图片、use 引用、裁切、滤镜和动画会丢失。嵌套 SVG 和样式表也不在支持范围内。先确认素材是纯形状，再转换并检查外观；完整文章继续按本技能的图文适配流程处理。

IF.Light 的活动成稿、照片、历史设计源和专用素材仍保存在原私有仓库，不作为此脚本的默认输入，也不随本脚本获得 MIT 授权。
