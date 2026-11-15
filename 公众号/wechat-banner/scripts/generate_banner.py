# -*- coding: utf-8 -*-
"""生成 IF.Link 公众号结尾 Banner，支持人员署名、无署名和批量导出。"""
import argparse
import json
import os

try:
    from PIL import Image, ImageDraw, ImageFont, __version__ as pillow_version
except ImportError:
    raise SystemExit('缺少 Pillow，请先运行：python3 -m pip install -r requirements.txt')

SKILL_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_CREDITS = os.path.join(SKILL_ROOT, 'templates', 'credits.example.json')
DEFAULT_OUTPUT_DIR = os.path.join(SKILL_ROOT, 'output')
OUTPUT_NAMES = {
    'credited': 'IF.Link底部Banner-署名版.png',
    'no-attribution': 'IF.Link底部Banner-无署名版.png',
}


def asset(name):
    return os.path.join(SKILL_ROOT, 'assets', 'banner', name)


def font(name):
    return os.path.join(SKILL_ROOT, 'assets', 'fonts', name)


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=['credited', 'no-attribution', 'all'],
                        default='credited', help='生成署名版、无署名版或两者，默认 credited')
    parser.add_argument('--credits', default=DEFAULT_CREDITS,
                        help='署名 JSON 路径，默认使用 templates/credits.example.json')
    parser.add_argument('--output', help='单模式输出 PNG 路径；all 模式请用 --output-dir')
    parser.add_argument('--output-dir', default=DEFAULT_OUTPUT_DIR,
                        help='输出目录，默认写入 Skill 的 output 目录')
    parser.add_argument('--doctor', action='store_true', help='检查依赖、字体和图片素材后退出')
    return parser.parse_args()


def load_credits(path):
    with open(path, encoding='utf-8') as f:
        rows = json.load(f)
    if not isinstance(rows, list) or not rows:
        raise ValueError('署名配置必须是非空数组')
    for row in rows:
        if not isinstance(row.get('role'), str) or not row['role'].strip():
            raise ValueError('每个署名分组都需要非空 role')
        if not isinstance(row.get('lines'), list) or not row['lines']:
            raise ValueError(f"{row['role']} 需要非空 lines 数组")
        if any(not isinstance(line, str) or not line.strip() for line in row['lines']):
            raise ValueError(f"{row['role']} 的署名行不能为空")
    if sum(len(row['lines']) for row in rows) > 4:
        raise ValueError('固定版式最多容纳 4 行人员署名')
    return rows


def doctor():
    required = [asset(name) for name in ['logo.png', 'qr_wechat.png', 'qr_xhs.png']]
    required += [font(name) for name in [
        'GoogleSansFlex.ttf', 'NotoSansCJK-Bold.ttc', 'NotoSansCJK-Regular.ttc']]
    missing = [path for path in required if not os.path.isfile(path)]
    if missing:
        raise ValueError('缺少素材：' + '、'.join(missing))
    for path in required[:3]:
        with Image.open(path) as im:
            im.verify()
    ImageFont.truetype(font('GoogleSansFlex.ttf'), 22).set_variation_by_axes([700])
    ImageFont.truetype(font('NotoSansCJK-Bold.ttc'), 22, index=2)
    ImageFont.truetype(font('NotoSansCJK-Regular.ttc'), 14, index=2)
    print(f'检查通过：Pillow {pillow_version}，3 张图片和 3 套字体均可用。')


def render(rows, out):
    logo_t = Image.open(asset('logo.png'))
    qrA = Image.open(asset('qr_wechat.png'))
    qrB = Image.open(asset('qr_xhs.png'))

    f_lat = ImageFont.truetype(font('GoogleSansFlex.ttf'), 22)
    f_lat.set_variation_by_axes([700])
    f_cjk = ImageFont.truetype(font('NotoSansCJK-Bold.ttc'), 22, index=2)
    f_lab = ImageFont.truetype(font('NotoSansCJK-Bold.ttc'), 21, index=2)
    f_qlab = ImageFont.truetype(font('NotoSansCJK-Regular.ttc'), 14, index=2)
    f_slogan = ImageFont.truetype(font('GoogleSansFlex.ttf'), 20)
    f_slogan.set_variation_by_axes([700])
    f_tag = ImageFont.truetype(font('NotoSansCJK-Bold.ttc'), 24, index=2)

    orange = (206, 102, 62)
    white = (245, 245, 245)
    labels_q = ['微信公众号', '小红书']
    tag1, tag2 = '源自东南大学的', 'AI 创客与科技交流社区'

    W = 900
    x_label, x_val = 52, 118
    qs = 99
    y_qr = 58
    x_q1, x_q2 = 599, 751
    right_edge = 850
    line_h = 32
    logo_w = 193
    logo_h = int(logo_t.height * logo_w / logo_t.width)
    logo_r = logo_t.resize((logo_w, logo_h), Image.LANCZOS)
    logo_x, logo_y = 50, 242
    slogan_y = logo_y + logo_h + 16

    tmp = Image.new('RGB', (W, 500))
    dt = ImageDraw.Draw(tmp)
    sl_b = dt.textbbox((52, slogan_y), 'Link the IFs, connect the Dots.', font=f_slogan)
    tb2 = dt.textbbox((0, 0), tag2, font=f_tag)
    y2 = sl_b[3] - (tb2[3] - tb2[1])
    y1 = y2 - line_h
    H = sl_b[3] + 42
    if H != 373:
        raise ValueError(f'模板高度异常：应为 373，实际为 {H}')

    canvas = Image.new('RGB', (W, H), (0, 0, 0))
    d = ImageDraw.Draw(canvas)

    def draw_mixed_bl(x, ybl, text, fill):
        buf, latin = '', None

        def flush(buf, latin, x):
            if not buf:
                return x
            f = f_lat if latin else f_cjk
            d.text((x, ybl), buf, font=f, fill=fill, anchor='ls')
            return x + d.textlength(buf, font=f)

        for ch in text:
            is_lat = ord(ch) < 128
            if latin is None or is_lat == latin:
                buf += ch
                latin = is_lat
            else:
                x = flush(buf, latin, x)
                buf = ch
                latin = is_lat
        return flush(buf, latin, x)

    if rows is not None:
        y = 55 + 24
        for row in rows:
            lab, vals = row['role'], row['lines']
            bb = d.textbbox((0, 0), lab, font=f_lab)
            d.text((x_label, y - (bb[3] - bb[1])), lab, font=f_lab, fill=orange)
            for v in vals:
                draw_mixed_bl(x_val, y, v, white)
                y += 34
            y += 8

    for x, q, lb in [(x_q1, qrA, labels_q[0]), (x_q2, qrB, labels_q[1])]:
        canvas.paste(q.resize((qs, qs)), (x, y_qr))
        tw = d.textlength(lb, font=f_qlab)
        d.text((x + qs / 2 - tw / 2, y_qr + qs + 12), lb, font=f_qlab, fill=white)

    canvas.paste(logo_r, (logo_x, logo_y), logo_r)
    d.text((52, slogan_y), 'Link the IFs, connect the Dots.', font=f_slogan, fill=white)

    for t, yy in [(tag1, y1), (tag2, y2)]:
        w = d.textlength(t, font=f_tag)
        d.text((right_edge - w, yy), t, font=f_tag, fill=white)

    out = os.path.abspath(out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    canvas.save(out)
    print(f'已生成 {out}（{W}x{H}）')


def main():
    args = parse_args()
    try:
        if args.doctor:
            doctor()
            return
        if args.mode == 'all' and args.output:
            raise ValueError('all 模式请使用 --output-dir，不要同时使用 --output')
        rows = load_credits(args.credits) if args.mode != 'no-attribution' else None
        modes = ['credited', 'no-attribution'] if args.mode == 'all' else [args.mode]
        for mode in modes:
            out = args.output or os.path.join(args.output_dir, OUTPUT_NAMES[mode])
            render(rows if mode == 'credited' else None, out)
    except (OSError, ValueError) as exc:
        raise SystemExit(f'生成失败：{exc}')


if __name__ == '__main__':
    main()
