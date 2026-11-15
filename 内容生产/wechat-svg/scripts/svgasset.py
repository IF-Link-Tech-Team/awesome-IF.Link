# SPDX-License-Identifier: MIT
# Extracted from IF-Link-Tech-Team/IF.Light; see references/iflight-svg.md.
"""Sanitize source SVGs into WeChat-safe inline SVG fragments.

Constraints (from wechat-svg skill):
  * no id / class / defs / href / url(#...) / filter / mask / clipPath
  * only plain shapes and <g transform> wrappers
  * brand gradients are flattened to a representative solid colour
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET

ALLOWED = {"svg", "g", "path", "rect", "circle", "ellipse", "polygon", "polyline", "line"}
DROP_ATTRS = {
    "id", "class", "style", "clip-path", "clip-rule", "filter", "mask",
    "href", "data-name", "name", "customframe", "version", "enable-background",
}
KEEP_ATTRS = {
    "d", "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width",
    "stroke-linecap", "stroke-linejoin", "stroke-opacity", "opacity",
    "transform", "x", "y", "width", "height", "rx", "ry", "cx", "cy", "r",
    "points",
}


def _strip_ns(tag: str) -> str:
    return tag.split("}")[-1].lower()


def _split_attr(key: str) -> str:
    return key.split("}")[-1]


def _color_from_gradient(stop_colors: list[str]) -> str:
    rgb = []
    for c in stop_colors:
        c = c.strip()
        m = re.fullmatch(r"#([0-9a-fA-F]{6})", c)
        if m:
            v = m.group(1)
            rgb.append(tuple(int(v[i:i + 2], 16) for i in (0, 2, 4)))
            continue
        m = re.fullmatch(r"#([0-9a-fA-F]{3})", c)
        if m:
            v = "".join(ch * 2 for ch in m.group(1))
            rgb.append(tuple(int(v[i:i + 2], 16) for i in (0, 2, 4)))
    if not rgb:
        return "#111111"
    if len(rgb) == 1:
        return "#%02X%02X%02X" % rgb[0]
    r = round(sum(c[0] for c in rgb) / len(rgb))
    g = round(sum(c[1] for c in rgb) / len(rgb))
    b = round(sum(c[2] for c in rgb) / len(rgb))
    return "#%02X%02X%02X" % (r, g, b)


def _collect_gradients(root) -> dict[str, str]:
    grads: dict[str, str] = {}
    for el in root.iter():
        tag = _strip_ns(el.tag)
        if tag in ("lineargradient", "radialgradient"):
            gid = el.get("id")
            if not gid:
                continue
            stops = [st.get("stop-color", "") for st in el.iter()
                     if _strip_ns(st.tag) == "stop" and st.get("stop-color")]
            grads[gid] = _color_from_gradient(stops)
    return grads


def _norm_color(value: str, grads: dict[str, str], current: str) -> str:
    if not value:
        return value
    value = value.strip()
    low = value.lower()
    if low in ("none", "transparent"):
        return value
    if low == "currentcolor":
        return current
    m = re.fullmatch(r"url\(#([^)]+)\)", value)
    if m:
        return grads.get(m.group(1), current)
    m = re.fullmatch(r"rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)", low)
    if m:
        return "#%02X%02X%02X" % tuple(int(m.group(i)) for i in (1, 2, 3))
    return value


SKIP = {"defs", "title", "desc", "style", "lineargradient", "radialgradient",
        "filter", "mask", "clippath", "metadata", "pattern"}


def _emit(el, grads, current, out, rule=None):
    tag = _strip_ns(el.tag)
    if tag in SKIP:
        return
    if tag not in ALLOWED:
        for ch in el:
            _emit(ch, grads, current, out, rule)
        return

    attrs = []
    for k, v in el.attrib.items():
        key = _split_attr(k)
        if key.lower() in DROP_ATTRS:
            continue
        if key in ("fill", "stroke"):
            v = _norm_color(v, grads, current)
        if key in ("fill", "stroke") and v.lower() == "currentcolor":
            v = current
        if key not in KEEP_ATTRS:
            continue
        attrs.append((key, v))

    if tag == "g":
        new_rule = el.get("fill-rule") or rule
        if new_rule and not any(a[0] == "fill-rule" for a in attrs):
            attrs.append(("fill-rule", new_rule))
        out.append("<g" + "".join(f' {k}="{v}"' for k, v in attrs) + ">")
        for ch in el:
            _emit(ch, grads, current, out, new_rule)
        out.append("</g>")
        return

    if tag in ("path", "polygon", "polyline") and rule and not any(a[0] == "fill-rule" for a in attrs):
        attrs.append(("fill-rule", rule))
    if tag in ALLOWED:
        out.append("<" + tag + "".join(f' {k}="{v}"' for k, v in attrs) + "/>")
        return
    for ch in el:
        _emit(ch, grads, current, out, rule)


def sanitize(path: str, current_color: str = "#000000") -> dict:
    with open(path, encoding="utf-8") as source:
        text = source.read()
    text = re.sub(r"<!DOCTYPE[^>]*>", "", text)
    root = ET.fromstring(text)
    vb = root.get("viewBox")
    if vb:
        vx, vy, vw, vh = [float(p) for p in re.split(r"[ ,]+", vb.strip())]
    else:
        vw = float(re.sub(r"[^0-9.]", "", root.get("width", "24")) or 24)
        vh = float(re.sub(r"[^0-9.]", "", root.get("height", "24")) or 24)
        vx = vy = 0.0

    grads = _collect_gradients(root)
    out: list[str] = []
    for ch in root:
        _emit(ch, grads, current_color, out, None)
    inner = "".join(out)
    if vx or vy:
        inner = f'<g transform="translate({-vx:g} {-vy:g})">{inner}</g>'
    inner = re.sub(r"\s+>", ">", inner)
    return {"w": vw, "h": vh, "inner": inner}


def place(asset: dict, x: float, y: float, size: float) -> str:
    """Wrap asset so its viewBox fits a `size` box centred on (x, y)."""
    w, h = asset["w"], asset["h"]
    s = size / max(w, h)
    tx = x - w * s / 2
    ty = y - h * s / 2
    return (f'<g transform="translate({tx:.2f} {ty:.2f}) scale({s:.5f})">'
            f'{asset["inner"]}</g>')


def main() -> None:
    """Convert shape-only SVG artwork for an inline WeChat layout."""
    import argparse
    from pathlib import Path

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--color", default="#000000", help="Replacement for currentColor")
    args = parser.parse_args()
    asset = sanitize(str(args.input), args.color)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{asset["w"]:g}" '
           f'height="{asset["h"]:g}" viewBox="0 0 {asset["w"]:g} {asset["h"]:g}">'
           f'{asset["inner"]}</svg>')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(svg, encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
