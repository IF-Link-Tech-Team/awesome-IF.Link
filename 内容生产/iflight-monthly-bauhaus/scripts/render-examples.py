import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description="Create a contact sheet from the unmodified fictional example")
parser.add_argument("--input", type=Path, default=root / "build/monthly-SVG-1080.png")
parser.add_argument("--output", type=Path, default=root / "references/examples")
args = parser.parse_args()
content = json.loads((args.input.parent / "content.json").read_text(encoding="utf-8"))
if content.get("example") is not True:
    raise RuntimeError("Example previews must come from content.example.json, not a real issue")
scale = 1080 / 375
example = json.loads((args.input.parent / "example-sections.json").read_text(encoding="utf-8"))
sections = example["sections"]
args.output.mkdir(parents=True, exist_ok=True)
with Image.open(args.input) as source:
    if source.width != 1080 or source.height != round(example["designHeight"] * scale):
        raise RuntimeError("Example image dimensions do not match example-sections.json; export the unmodified example again")
    cards = []
    for name, (top, bottom) in sections.items():
        image = source.crop((0, round(top * scale), source.width, round(bottom * scale)))
        image = image.resize((375, round(image.height * 375 / source.width)), Image.Resampling.LANCZOS)
        image.save(args.output / f"{name}.png", optimize=True)
        cards.append((name, image))

width = 1040
label_height = 48
gap = 16
heights = [round(image.height * 240 / 375) for _, image in cards]
canvas = Image.new("RGB", (width, max(heights) + label_height + gap * 2), "#f2f0e8")
draw = ImageDraw.Draw(canvas)
draw.text((gap, 12), "IF.LIGHT MONTHLY / FICTIONAL EXAMPLE / NOT FOR PUBLISH", fill="#151515")
for index, ((name, image), height) in enumerate(zip(cards, heights)):
    x = gap + index * (240 + gap)
    y = label_height + gap
    draw.rectangle((x - 2, y - 2, x + 242, y + height + 2), outline="#151515", width=2)
    draw.text((x, y + 8), name.upper(), fill="#151515")
    image = image.resize((240, height), Image.Resampling.LANCZOS)
    canvas.paste(image, (x, y + 28))
canvas.save(args.output / "overview.png", optimize=True)
print(args.output / "overview.png")
