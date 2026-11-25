import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]


def run(command, env=None):
    result = subprocess.run(command, cwd=root, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode:
        raise RuntimeError(f"{command[1] if len(command) > 1 else command[0]} failed:\n{result.stdout[-2000:]}\n{result.stderr[-2000:]}")
    return result.stdout


def main():
    parser = argparse.ArgumentParser(description="Check the IF.Light monthly Bauhaus Skill and optionally build its example.")
    parser.add_argument("--full", action="store_true", help="Render HTML, SVG, SVG parts, and both long images in a temporary directory")
    args = parser.parse_args()
    required = [
        "SKILL.md",
        "content.example.json",
        "templates/monthly.html",
        "assets/brand/iflight-logo.svg",
        "assets/brand/iflink-logo.svg",
        "assets/brand/banner.svg",
        "assets/brand/banner-top.svg",
        "assets/brand/banner-middle.svg",
        "assets/brand/banner-bottom.svg",
        "assets/brand/forum-qr.png",
        "scripts/render-monthly.mjs",
        "scripts/build-wechat-svg.mjs",
        "scripts/export-long-images.mjs",
        "scripts/xiumi-import.mjs",
        "scripts/validate-monthly.py",
        "scripts/render-examples.py",
        "references/style-guide.md",
        "references/configuration.md",
        "references/examples/hero.png",
        "references/examples/panels.png",
        "references/examples/projects.png",
        "references/examples/community.png",
        "references/examples/overview.png",
    ]
    for relative in required:
        if not (root / relative).is_file():
            raise RuntimeError(f"Missing required file: {relative}")

    skill = (root / "SKILL.md").read_text(encoding="utf-8")
    assert re.search(r"^name: iflight-monthly-bauhaus$", skill, re.M)
    assert re.search(r"^description: >-", skill, re.M)
    assert re.search(r"^license: MIT$", skill, re.M)
    assert re.search(r"^compatibility: .+", skill, re.M)
    assert re.search(r"^  maintainer: \S+$", skill, re.M)
    assert len(skill.splitlines()) <= 500
    for link in re.findall(r"\[[^]]+\]\(([^)]+)\)", skill):
        if not (root / link).exists():
            raise RuntimeError(f"Broken Skill link: {link}")
    assert "iflight-monthly-bauhaus" in (root.parents[1] / "README.md").read_text(encoding="utf-8")

    for name in ["render-monthly.mjs", "build-wechat-svg.mjs", "export-long-images.mjs", "xiumi-import.mjs"]:
        run(["node", "--check", str(root / "scripts" / name)])

    content = json.loads((root / "content.example.json").read_text(encoding="utf-8"))
    assert content["example"] is True
    assert content["issue"]["number"] == "SXX"
    assert content["issue"]["year"] == "20XX"
    assert not content["growth"]["events"]
    for project in content["projects"]:
        assert project["id"].startswith("example-")
        assert project["image"] == ""
        assert project["remoteImage"] == ""

    template = (root / "templates/monthly.html").read_text(encoding="utf-8")
    template = re.sub(r"data:image/[^\"')]+", "", template)
    sample = (root / "content.example.json").read_text(encoding="utf-8")
    forbidden = ["S01", "NO.001", "导向标", "SEU Wiki", "Soulwalking", "王怡然", "梁宇凡", "孙欣怡", "孟秋彤", "郝世杰", "知乎黑客松", "BayHack", "地瓜机器人", "Coding Plan Pro", "11.30", "12.06", "2026.12"]
    for value in forbidden:
        assert value not in template, f"Previous issue content in template: {value}"
        assert value not in sample, f"Previous issue content in example: {value}"
    for path in (root / "assets/brand").glob("*.svg"):
        text = path.read_text(encoding="utf-8")
        for name in ["王怡然", "梁宇凡", "孙欣怡", "孟秋彤", "郝世杰"]:
            assert name not in text, f"Previous credit in {path.name}: {name}"

    with tempfile.TemporaryDirectory(prefix="doctor-", dir=root / ".tmp") as temporary:
        output = Path(temporary) / "build"
        run(["node", "scripts/render-monthly.mjs", "--content", "content.example.json", "--allow-example", "--output", str(output)])
        manifest = json.loads((output / "render-manifest.json").read_text(encoding="utf-8"))
        assert manifest["example"] is True
        assert manifest["imageCount"] == 0
        assert manifest["remoteImageCount"] == 0
        if args.full:
            env = os.environ.copy()
            env["MONTHLY_BUILD_DIR"] = str(output)
            env["PYTHON"] = sys.executable
            run(["node", "scripts/build-wechat-svg.mjs"], env)
            run(["node", "scripts/export-long-images.mjs"], env)
            result = run([
                sys.executable,
                "scripts/validate-monthly.py",
                "--html", str(output / "monthly.html"),
                "--svg", str(output / "monthly-wechat.svg"),
                "--parts-dir", str(output / "wechat-parts"),
                "--expect-images", "0",
                "--expect-png", str(output / "monthly-HTML-1080.png"),
                "--expect-png", str(output / "monthly-SVG-1080.png"),
                "--require-text", "示例项目 A",
            ], env)
            assert json.loads(result)["ok"] is True
            previews = Path(temporary) / "previews"
            run([
                sys.executable,
                "scripts/render-examples.py",
                "--input", str(output / "monthly-SVG-1080.png"),
                "--output", str(previews),
            ], env)
            for name in ["hero", "panels", "projects", "community", "overview"]:
                assert (previews / f"{name}.png").is_file()
    print(json.dumps({"ok": True, "full": args.full, "realProjectAssetsInExample": False, "previousIssueContentInTemplate": False}, ensure_ascii=False))


if __name__ == "__main__":
    (root / ".tmp").mkdir(exist_ok=True)
    main()
