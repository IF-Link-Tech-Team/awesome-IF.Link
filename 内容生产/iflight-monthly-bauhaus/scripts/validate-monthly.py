import argparse
import json
import re
import struct
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"


class AssetParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.assets = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag in {"img", "script", "source", "video", "audio"} and attributes.get("src"):
            self.assets.append(attributes["src"])
        if tag == "link" and attributes.get("href") and attributes.get("rel") in {"stylesheet", "icon"}:
            self.assets.append(attributes["href"])


def style_map(element):
    result = {}
    for declaration in element.attrib.get("style", "").split(";"):
        if ":" in declaration:
            key, value = declaration.split(":", 1)
            result[key.strip()] = value.strip()
    return result


def text_is_visible(element):
    style = style_map(element)
    display = style.get("display", element.attrib.get("display", ""))
    visibility = style.get("visibility", element.attrib.get("visibility", ""))
    opacity = style.get("opacity", element.attrib.get("opacity", "1"))
    try:
        opacity = float(opacity)
    except ValueError:
        opacity = 1
    return display != "none" and visibility != "hidden" and opacity > 0


def inspect_svg(path, errors, require_dual_href=True):
    try:
        root = ET.parse(path).getroot()
    except (ET.ParseError, OSError) as error:
        errors.append(f"{path.name}: {error}")
        return {"text": 0, "visibleText": 0, "images": 0}

    if root.tag != f"{{{SVG_NS}}}svg":
        errors.append(f"{path.name}: root element is not SVG")
    if root.findall(f".//{{{SVG_NS}}}svg"):
        errors.append(f"{path.name}: nested SVG viewport found")
    for tag in ("script", "foreignObject"):
        if root.findall(f".//{{{SVG_NS}}}{tag}"):
            errors.append(f"{path.name}: unsupported {tag} found")
    ids = [element.attrib["id"] for element in root.iter() if "id" in element.attrib]
    if len(ids) != len(set(ids)):
        errors.append(f"{path.name}: duplicate id found")
    known_ids = set(ids)
    for element in root.iter():
        for value in element.attrib.values():
            for reference in re.findall(r"url\(#([^)]+)\)", value):
                if reference not in known_ids:
                    errors.append(f"{path.name}: unresolved url(#...) reference: {reference}")

    texts = [element for element in root.iter(f"{{{SVG_NS}}}text") if "".join(element.itertext()).strip()]
    visible_texts = [element for element in texts if text_is_visible(element)]
    for element in visible_texts:
        if "font-family" not in style_map(element):
            errors.append(f"{path.name}: text lacks inline font-family: {''.join(element.itertext())[:60]}")

    images = list(root.iter(f"{{{SVG_NS}}}image"))
    for image in images:
        href = image.attrib.get("href")
        xlink = image.attrib.get(f"{{{XLINK_NS}}}href")
        if not href:
            errors.append(f"{path.name}: image lacks SVG2 href")
        elif not href.startswith("https://"):
            errors.append(f"{path.name}: image is not hosted over HTTPS")
        if require_dual_href and xlink != href:
            errors.append(f"{path.name}: image href and xlink:href differ")

    return {
        "text": len(texts),
        "visibleText": len(visible_texts),
        "images": len(images),
        "textContent": "".join(root.itertext()),
    }


def inspect_html(path, errors):
    if not path.is_file():
        errors.append(f"HTML not found: {path}")
        return 0
    parser = AssetParser()
    parser.feed(path.read_text(encoding="utf-8"))
    checked = 0
    for asset in parser.assets:
        parts = urlsplit(asset)
        if parts.scheme or asset.startswith("//") or asset.startswith("data:"):
            continue
        local_path = path.parent / unquote(parts.path)
        checked += 1
        if not local_path.is_file():
            errors.append(f"Missing local asset: {asset}")
    return checked


def inspect_png(path, errors):
    try:
        with path.open("rb") as file:
            header = file.read(24)
        if header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
            raise ValueError("invalid PNG header")
        width, height = struct.unpack(">II", header[16:24])
        if width != 1080 or height <= 0:
            errors.append(f"Unexpected PNG dimensions: {path.name} {width}x{height}")
        return {"file": str(path), "width": width, "height": height}
    except (OSError, ValueError) as error:
        errors.append(f"{path}: {error}")
        return None


def main():
    parser = argparse.ArgumentParser(description="Validate the IF.Light monthly Bauhaus template, its SVG parts, and exported PNG files.")
    parser.add_argument("--html", type=Path)
    parser.add_argument("--svg", type=Path, required=True)
    parser.add_argument("--parts-dir", type=Path, required=True)
    parser.add_argument("--expect-images", type=int)
    parser.add_argument("--expect-png", type=Path, action="append", default=[])
    parser.add_argument("--require-text", action="append", default=[])
    parser.add_argument("--max-part-bytes", type=int, default=30000)
    args = parser.parse_args()
    errors = []
    result = {"ok": True, "errors": errors}

    if args.html:
        result["localAssets"] = inspect_html(args.html, errors)
    svg = inspect_svg(args.svg, errors)
    result["svg"] = {key: value for key, value in svg.items() if key != "textContent"}
    if args.expect_images is not None and svg["images"] != args.expect_images:
        errors.append(f"Expected {args.expect_images} images, found {svg['images']}")
    normalized_svg_text = re.sub(r"\s+", "", svg["textContent"])
    for required in args.require_text:
        if re.sub(r"\s+", "", required) not in normalized_svg_text:
            errors.append(f"Required SVG text not found: {required}")

    part_paths = sorted(args.parts_dir.glob("*.svg")) if args.parts_dir.is_dir() else []
    if not part_paths:
        errors.append(f"No SVG parts found in {args.parts_dir}")
    parts = []
    for path in part_paths:
        size = path.stat().st_size
        part = inspect_svg(path, errors)
        parts.append({"file": path.name, "bytes": size, **{key: value for key, value in part.items() if key != "textContent"}})
        if size >= args.max_part_bytes:
            errors.append(f"Part is not below {args.max_part_bytes} bytes: {path.name} ({size})")
    result["parts"] = {"count": len(parts), "maxBytes": max((part["bytes"] for part in parts), default=0)}
    if sum(part["text"] for part in parts) != svg["text"]:
        errors.append("Text count differs between full SVG and its parts")
    if sum(part["images"] for part in parts) != svg["images"]:
        errors.append("Image count differs between full SVG and its parts")

    manifest_path = args.parts_dir / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest_files = sorted(part["file"] for part in manifest["parts"])
        if manifest_files != [path.name for path in part_paths]:
            errors.append("Manifest files differ from SVG parts on disk")
        for part in manifest["parts"]:
            path = args.parts_dir / part["file"]
            if path.is_file() and part.get("bytes") != path.stat().st_size:
                errors.append(f"Manifest byte count differs: {part['file']}")
    except (OSError, ValueError, KeyError, TypeError) as error:
        errors.append(f"Invalid parts manifest: {error}")

    result["png"] = [item for item in (inspect_png(path, errors) for path in args.expect_png) if item]
    result["ok"] = not errors
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
