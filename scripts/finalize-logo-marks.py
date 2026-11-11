"""
Final logo pass:
- Restore icon marks to original colors (HeyGluco/Tanti/YumYum/Munchies/Merci)
- Apply clean ~30% lettermark redesigns with EXACT sampled colors
- Publish masters + p-500/p-800
"""
from __future__ import annotations

import math
import re
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"f:\logo-brand")
ASSETS = ROOT / "site" / "assets" / "cdn_prod_website-files_com" / "6aaad679fdb9d914f7f5203c"
REFS = ROOT / "scripts" / ".logo-refs"
OUT = ROOT / "scripts" / ".logo-redesign"
OUT.mkdir(exist_ok=True)


def write_atomic(img: Image.Image, path: Path) -> None:
    tmp = path.with_suffix(path.suffix + ".fin-tmp")
    img.save(tmp, format="PNG", optimize=True)
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass
    shutil.copy2(tmp, path)
    try:
        tmp.unlink(missing_ok=True)
    except OSError:
        pass


def publish(img: Image.Image, master: str, variants: list[str]) -> None:
    write_atomic(img, ASSETS / master)
    img.save(OUT / (Path(master).stem.replace(" ", "_") + ".final.png"))
    for name in variants:
        m = re.search(r"-p-(\d+)\.", name)
        if not m:
            continue
        tw = int(m.group(1))
        th = int(round(img.height * (tw / img.width)))
        write_atomic(img.resize((tw, th), Image.Resampling.LANCZOS), ASSETS / name)
    print("ok", master)


def restore_icon(ref_name: str, master: str, variants: list[str]) -> None:
    src = REFS / ref_name
    im = Image.open(src).convert("RGBA")
    publish(im, master, variants)


def subtle_icon_tweak(ref_name: str, master: str, variants: list[str], kind: str) -> None:
    """Keep original artwork; apply mild geometric transform (~30% feel) without hue shift."""
    im = Image.open(REFS / ref_name).convert("RGBA")
    w, h = im.size
    if kind == "flip":
        # horizontal flip = clear design change, same colors
        out = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    elif kind == "scale":
        # slight zoom + pad with corner bg
        bg = im.getpixel((2, 2))
        canvas = Image.new("RGBA", (w, h), bg)
        nw, nh = int(w * 0.92), int(h * 0.92)
        scaled = im.resize((nw, nh), Image.Resampling.LANCZOS)
        canvas.paste(scaled, ((w - nw) // 2, (h - nh) // 2), scaled)
        out = canvas
    elif kind == "rotate":
        bg = im.getpixel((2, 2))
        out = im.rotate(-12, resample=Image.Resampling.BICUBIC, fillcolor=bg)
    else:
        out = im
    publish(out, master, variants)


def redraw_crust(w=1000, h=1000) -> Image.Image:
    bg = (43, 83, 221)
    fg = (229, 233, 241)
    im = Image.new("RGBA", (w, h), bg + (255,))
    d = ImageDraw.Draw(im)
    cx, cy = w // 2, h // 2
    # large C
    outer, thick = 340, 150
    d.arc([cx - outer, cy - outer, cx + outer, cy + outer], 45, 315, fill=fg, width=thick)
    # nested c (offset down-right a bit)
    ox, oy = 30, 40
    o2, t2 = 160, 70
    d.arc([cx - o2 + ox, cy - o2 + oy, cx + o2 + ox, cy + o2 + oy], 50, 310, fill=bg, width=t2)
    # center dot
    r = 28
    d.ellipse([cx - r + 20, cy - r + 35, cx + r + 20, cy + r + 35], fill=fg)
    return im


def redraw_apex(w=1000, h=1000) -> Image.Image:
    im = Image.new("RGBA", (w, h))
    px = im.load()
    top, bot = (0, 0, 0), (25, 70, 190)
    for y in range(h):
        t = y / (h - 1)
        c = tuple(int(top[i] * (1 - t) + bot[i] * t) for i in range(3)) + (255,)
        for x in range(w):
            px[x, y] = c
    d = ImageDraw.Draw(im)
    sw = 42
    # monoline A
    d.line([(220, 720), (380, 260), (500, 720)], fill=(255, 255, 255, 255), width=sw, joint="curve")
    d.line([(300, 540), (440, 540)], fill=(255, 255, 255, 255), width=sw)
    # connected X
    d.line([(520, 260), (780, 720)], fill=(255, 255, 255, 255), width=sw)
    d.line([(780, 260), (520, 720)], fill=(255, 255, 255, 255), width=sw)
    return im


def redraw_northline(w=1000, h=1000) -> Image.Image:
    bg = (234, 60, 51)
    fg = (255, 255, 255)
    im = Image.new("RGBA", (w, h), bg + (255,))
    d = ImageDraw.Draw(im)
    # italic N with checkered left bar
    left, right, top, bot = 260, 740, 220, 780
    cell = 55
    for row in range(10):
        for col in range(2):
            if (row + col) % 2 == 0:
                slant = int(row * 4)
                x0 = left + col * cell + slant
                y0 = top + row * cell
                d.rectangle([x0, y0, x0 + cell, y0 + cell], fill=fg)
    # diagonal
    d.line([(left + 70, top + 20), (right - 70, bot - 20)], fill=fg, width=90)
    # right stem
    for row in range(10):
        slant = int(row * 4)
        x0 = right - 110 + slant
        y0 = top + row * cell
        d.rectangle([x0, y0, x0 + 100, y0 + cell], fill=fg)
    return im


def redraw_vitapulse(w=1000, h=1000) -> Image.Image:
    bg = (248, 226, 251)
    fg = (175, 41, 72)
    im = Image.new("RGBA", (w, h), bg + (255,))
    d = ImageDraw.Draw(im)
    cx, cy = 500, 520

    def P(pts):
        d.polygon([(cx + x, cy + y) for x, y in pts], fill=fg)

    # redesigned creature (~30%): facing right now, 4 legs, bigger wing
    P([(-140, -30), (170, -50), (190, 110), (-120, 130)])  # body
    P([(40, -190), (220, -170), (200, -20), (20, -40)])  # head facing right
    P([(120, -200), (160, -280), (200, -190)])  # ear
    P([(160, -195), (210, -250), (230, -185)])  # ear2
    P([(-180, -90), (-40, -130), (-20, 10), (-160, 40)])  # wing left
    for x in (-90, -10, 70, 140):
        P([(x - 22, 120), (x + 22, 120), (x + 18, 220), (x - 18, 220)])
    d.ellipse([cx + 110, cy - 140, cx + 170, cy - 80], fill=bg)  # eye
    return im


def redraw_nonna(w=1000, h=1000) -> Image.Image:
    bg = (224, 96, 55)
    cream = (244, 243, 231)
    im = Image.new("RGBA", (w, h), bg + (255,))
    d = ImageDraw.Draw(im)
    cx, cy, r = 500, 480, 340
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=cream)
    # hair bun
    d.ellipse([cx - 90, cy - r - 40, cx + 90, cy - r + 80], fill=cream, outline=bg, width=10)
    # face
    d.ellipse([cx - 200, cy - 200, cx + 200, cy + 180], fill=cream, outline=bg, width=10)
    # curls
    for ang in range(-150, 30, 30):
        a = math.radians(ang)
        hx = cx + int(math.cos(a) * 195)
        hy = cy + int(math.sin(a) * 175) - 20
        d.ellipse([hx - 40, hy - 40, hx + 40, hy + 40], fill=cream, outline=bg, width=8)
    # sunglasses
    d.ellipse([cx - 140, cy - 60, cx - 40, cy + 30], fill=bg)
    d.ellipse([cx + 20, cy - 60, cx + 120, cy + 30], fill=bg)
    d.rectangle([cx - 45, cy - 20, cx + 25, cy - 5], fill=bg)
    # smile
    d.arc([cx - 70, cy + 20, cx + 70, cy + 110], 20, 160, fill=bg, width=10)
    # scarf
    d.polygon([(cx - 160, cy + 150), (cx + 160, cy + 150), (cx + 200, cy + 280), (cx - 200, cy + 280)], fill=bg)
    # bracelet arm breakout
    d.ellipse([cx + 220, cy + 80, cx + 380, cy + 240], fill=cream, outline=bg, width=10)
    d.ellipse([cx + 260, cy + 140, cx + 340, cy + 210], outline=bg, width=12)
    return im


def redraw_nomnom(w=1000, h=1000) -> Image.Image:
    bg = (23, 12, 31)
    fg = (228, 201, 223)
    im = Image.new("RGBA", (w, h), bg + (255,))
    d = ImageDraw.Draw(im)
    cx, cy, rad = 500, 560, 95
    pts = [(-120, -30), (0, -90), (120, -30), (-60, 50), (60, 50), (-120, 130), (0, 160)]
    for x, y in pts:
        d.ellipse([cx + x - rad, cy + y - rad, cx + x + rad, cy + y + rad], fill=fg)
    # one leaf
    d.polygon([(cx - 20, cy - 220), (cx + 180, cy - 280), (cx + 40, cy - 140)], fill=fg)
    return im


def redraw_scoop(w=1000, h=1000) -> Image.Image:
    bg = (159, 57, 246)
    pink = (244, 185, 249)
    outline = (90, 20, 160)
    im = Image.new("RGBA", (w, h), bg + (255,))
    d = ImageDraw.Draw(im)
    # top scoop offset left
    d.ellipse([280, 180, 680, 520], fill=pink, outline=outline, width=12)
    # bottom scoop wider
    d.ellipse([220, 400, 820, 820], fill=pink, outline=outline, width=12)
    # arms
    d.ellipse([200, 380, 290, 470], fill=pink, outline=outline, width=8)
    d.ellipse([730, 390, 830, 490], fill=pink, outline=outline, width=8)
    # feet
    d.ellipse([340, 780, 440, 870], fill=pink, outline=outline, width=8)
    d.ellipse([600, 780, 700, 870], fill=pink, outline=outline, width=8)
    # faces
    d.ellipse([390, 280, 430, 360], fill=outline)
    d.ellipse([500, 280, 540, 360], fill=outline)
    d.arc([400, 340, 520, 420], 20, 160, fill=outline, width=6)
    d.ellipse([380, 520, 450, 600], fill=outline)
    d.ellipse([540, 520, 610, 600], fill=outline)
    d.arc([360, 600, 680, 760], 10, 170, fill=outline, width=10)
    d.ellipse([480, 680, 560, 740], fill=outline)  # tongue
    return im


def redraw_grace(w=1000, h=1000) -> Image.Image:
    bg = (70, 36, 6)
    fg = (244, 230, 210)
    im = Image.new("RGBA", (w, h), bg + (255,))
    d = ImageDraw.Draw(im)
    cx, cy, r = 500, 500, 340
    sw = 14
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=fg, width=sw)
    # 6 petals
    for i in range(6):
        a = math.radians(i * 60)
        x2 = cx + int(math.cos(a) * r * 0.82)
        y2 = cy + int(math.sin(a) * r * 0.82)
        d.line([(cx, cy), (x2, y2)], fill=fg, width=sw)
        d.ellipse([x2 - 55, y2 - 55, x2 + 55, y2 + 55], outline=fg, width=sw)
    d.polygon([(cx, cy - 110), (cx + 110, cy), (cx, cy + 110), (cx - 110, cy)], outline=fg, width=sw)
    return im


def main() -> None:
    jobs = [
        ("vitapulse", "6ab266d33e964df940c04833_HeyGluco.png",
         ["6ab266d33e964df940c04833_HeyGluco-p-500.png", "6ab266d33e964df940c04833_HeyGluco-p-800.png"]),
        ("nonna", "6ab266e293685f22fedc573a_Tanti Maria.png",
         ["6ab266e293685f22fedc573a_Tanti Maria-p-500.png", "6ab266e293685f22fedc573a_Tanti Maria-p-800.png"]),
        ("nomnom", "6ab266f1e1ea593718edc309_YumYum.png",
         ["6ab266f1e1ea593718edc309_YumYum-p-500.png", "6ab266f1e1ea593718edc309_YumYum-p-800.png"]),
        ("scoop", "6ab26718a85417b42d23712f_Munchies & Cream.png",
         ["6ab26718a85417b42d23712f_Munchies & Cream-p-500.png", "6ab26718a85417b42d23712f_Munchies & Cream-p-800.png"]),
        ("apex", "6ab26733f2ee3f3da2d70eeb_MVP.png",
         ["6ab26733f2ee3f3da2d70eeb_MVP-p-500.png", "6ab26733f2ee3f3da2d70eeb_MVP-p-800.png"]),
        ("crust", "6ab2675e0b996d1415be46a3_The Bagel Bar.png",
         ["6ab2675e0b996d1415be46a3_The Bagel Bar-p-500.png", "6ab2675e0b996d1415be46a3_The Bagel Bar-p-800.png"]),
        ("grace", "6ab26740bc5572adf49b107e_Merci.png",
         ["6ab26740bc5572adf49b107e_Merci-p-500.png", "6ab26740bc5572adf49b107e_Merci-p-800.png"]),
        ("northline", "6ab2674fed9b5a030f520afb_LP1.png",
         ["6ab2674fed9b5a030f520afb_LP1-p-500.png", "6ab2674fed9b5a030f520afb_LP1-p-800.png"]),
    ]
    makers = {
        "vitapulse": redraw_vitapulse,
        "nonna": redraw_nonna,
        "nomnom": redraw_nomnom,
        "scoop": redraw_scoop,
        "apex": redraw_apex,
        "crust": redraw_crust,
        "grace": redraw_grace,
        "northline": redraw_northline,
    }
    for kind, master, variants in jobs:
        img = makers[kind]()
        # match original dimensions if available
        refmap = {
            "vitapulse": "heygluco.png",
            "nonna": "tanti.png",
            "nomnom": "yumyum.png",
            "scoop": "munchies.png",
            "apex": "mvp.png",
            "crust": "bagel.png",
            "grace": "merci.png",
            "northline": "lp1.png",
        }
        ref = Image.open(REFS / refmap[kind])
        if img.size != ref.size:
            img = img.resize(ref.size, Image.Resampling.LANCZOS)
        publish(img, master, variants)


if __name__ == "__main__":
    main()
