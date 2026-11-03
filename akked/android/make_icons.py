"""Generates the launcher icons (green rounded square + white check) as PNGs. Run once: python3 make_icons.py"""
import os, math
from PIL import Image, ImageDraw
SIZES = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
for name, px in SIZES.items():
    S = px * 4                                   # supersample for smooth edges
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=(15, 157, 88, 255))
    w = int(S * 0.11)
    pts = [(S * 0.26, S * 0.53), (S * 0.43, S * 0.70), (S * 0.75, S * 0.33)]
    d.line(pts, fill=(255, 255, 255, 255), width=w, joint='curve')
    for x, y in (pts[0], pts[2]): d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=(255, 255, 255, 255))
    out = f'res/mipmap-{name}'; os.makedirs(out, exist_ok=True)
    im.resize((px, px), Image.LANCZOS).save(f'{out}/ic_launcher.png')
print('icons ok')
