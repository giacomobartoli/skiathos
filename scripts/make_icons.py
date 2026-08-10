#!/usr/bin/env python3
"""Genera le icone PWA (sole dorato su onde) in icons/."""
import math
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
OUT.mkdir(exist_ok=True)

SEA_DEEP = (13, 66, 102)
SEA_MID = (36, 155, 196)
SEA_LIGHT = (130, 214, 226)
GOLD = (230, 178, 74)
GOLD_LIGHT = (245, 205, 122)
WHITE = (255, 255, 255)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make_icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGB", (size, size), SEA_DEEP)
    draw = ImageDraw.Draw(img)

    for y in range(size):
        t = y / size
        draw.line([(0, y), (size, y)], fill=lerp(SEA_DEEP, SEA_MID, t))

    pad = size * (0.16 if maskable else 0.0)

    # sun with soft glow rings
    sun_cx, sun_cy = size * 0.5, size * (0.4 if not maskable else 0.44)
    for i, r in enumerate([0.30, 0.24, 0.19]):
        rr = size * r
        color = [ (60,120,150), lerp(SEA_MID, GOLD, 0.4), GOLD ][i]
        draw.ellipse([sun_cx - rr, sun_cy - rr, sun_cx + rr, sun_cy + rr], fill=color)
    rr = size * 0.155
    draw.ellipse([sun_cx - rr, sun_cy - rr, sun_cx + rr, sun_cy + rr], fill=GOLD_LIGHT)

    # three stacked wave bands near the bottom
    band_specs = [
        (0.66, 0.10, lerp(SEA_LIGHT, WHITE, 0.15), 0.9),
        (0.80, 0.11, lerp(SEA_MID, SEA_LIGHT, 0.5), 0.95),
        (0.94, 0.14, WHITE, 1.0),
    ]
    for base_t, amp_t, color, width_scale in band_specs:
        base_y = size * base_t
        amp = size * amp_t
        pts = []
        steps = 60
        for i in range(steps + 1):
            x = -pad + (size + 2 * pad) * (i / steps) * width_scale + (size * (1 - width_scale) / 2)
            phase = (i / steps) * math.pi * 2
            y = base_y + math.sin(phase) * amp * 0.35
            pts.append((x, y))
        pts.append((size + pad, size + pad))
        pts.append((-pad, size + pad))
        draw.polygon(pts, fill=color)

    return img


for size, name, maskable in [(192, "icon-192.png", False), (512, "icon-512.png", False), (512, "icon-512-maskable.png", True)]:
    make_icon(size, maskable).save(OUT / name)
    print("wrote", name)
