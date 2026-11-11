"""
Clean ~30% logo-mark redraws with Pillow (exact original palettes).
Restores any muddy AI outputs first, then overwrites masters + -p-500/-p-800.
"""
from __future__ import annotations

import math
import re
import shutil
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(r"f:\logo-brand")
ASSETS = ROOT / "site" / "assets" / "cdn_prod_website-files_com" / "6aaad679fdb9d914f7f5203c"
BAK = ROOT / "scripts" / ".logo-redesign"
PREV = ROOT / "scripts" / ".logo-refs"


def write_atomic(img: Image.Image, path: Path) -> None:
    tmp = path.with_suffix(path.suffix + ".redraw-tmp")
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


def publish(img: Image.Image, master_name: str, variants: list[str]) -> None:
    master = ASSETS / master_name
    write_atomic(img, master)
    preview = BAK / (Path(master_name).stem.replace(" ", "_") + ".redraw.png")
    img.save(preview)
    for name in variants:
        m = re.search(r"-p-(\d+)\.", name)
        if not m:
            continue
        tw = int(m.group(1))
        th = int(round(img.height * (tw / img.width)))
        write_atomic(img.resize((tw, th), Image.Resampling.LANCZOS), ASSETS / name)
    print("ok", master_name)


def sample_corners_and_center(path: Path):
    im = Image.open(path).convert("RGB")
    px = im.load()
    w, h = im.size
    bg = px[2, 2]
    # find a non-bg accent near center by scanning
    accent = None
    for y in range(h // 4, 3 * h // 4, 8):
        for x in range(w // 4, 3 * w // 4, 8):
            c = px[x, y]
            if sum(abs(c[i] - bg[i]) for i in range(3)) > 40:
                accent = c
                break
        if accent:
            break
    return im.size, bg, accent or (0, 0, 0)


def restore_from_bak_or_ref():
    """Put originals back for any AI-ruined masters before redraw."""
    mapping = {
        "6ab266d33e964df940c04833_HeyGluco.png": "heygluco.png",
        "6ab266e293685f22fedc573a_Tanti Maria.png": "tanti.png",
        "6ab266f1e1ea593718edc309_YumYum.png": "yumyum.png",
        "6ab26718a85417b42d23712f_Munchies & Cream.png": "munchies.png",
        "6ab26733f2ee3f3da2d70eeb_MVP.png": "mvp.png",
        "6ab2675e0b996d1415be46a3_The Bagel Bar.png": "bagel.png",
        "6ab26740bc5572adf49b107e_Merci.png": "merci.png",
        "6ab2674fed9b5a030f520afb_LP1.png": "lp1.png",
    }
    for master, ref in mapping.items():
        src = PREV / ref
        if src.exists():
            shutil.copy2(src, ASSETS / master)
            # rebuild simple variants from ref
            im = Image.open(src).convert("RGBA")
            stem = master.rsplit(".", 1)[0]
            for w in (500, 800):
                vp = ASSETS / f"{stem}-p-{w}.png"
                if vp.exists() or True:
                    th = int(round(im.height * (w / im.width)))
                    write_atomic(im.resize((w, th), Image.Resampling.LANCZOS).convert("RGBA"), vp)
    print("restored refs")


# ---------- redraws ----------

def redraw_vitapulse(size, bg, fg):
    """Creature mark ~30% different silhouette, same colors."""
    w, h = size
    im = Image.new("RGB", size, bg)
    d = ImageDraw.Draw(im)
    cx, cy = w // 2, h // 2
    s = min(w, h) / 1000

    def poly(pts):
        d.polygon([(cx + x * s, cy + y * s) for x, y in pts], fill=fg)

    # body (blockier / taller)
    poly([(-160, -40), (140, -60), (160, 120), (-140, 140)])
    # head
    poly([(-200, -180), (-40, -200), (20, -80), (-180, -40)])
    # ear triangles (one taller)
    poly([(-170, -200), (-130, -280), (-90, -190)])
    poly([(-100, -210), (-50, -250), (-20, -195)])
    # wing (single larger scallop)
    poly([(40, -100), (220, -140), (240, -20), (60, 20)])
    # legs (four stubby)
    for x in (-120, -40, 40, 110):
        poly([(x - 25, 120), (x + 25, 120), (x + 20, 220), (x - 20, 220)])
    # eye cutout
    d.ellipse([cx - 130 * s, cy - 150 * s, cx - 70 * s, cy - 90 * s], fill=bg)
    # collar negative arc strip
    d.arc([cx - 160 * s, cy - 60 * s, cx + 40 * s, cy + 80 * s], 200, 340, fill=bg, width=int(18 * s))
    return im


def redraw_nonna(size, bg, cream):
    w, h = size
    im = Image.new("RGB", size, bg)
    d = ImageDraw.Draw(im)
    cx, cy = w // 2, int(h * 0.48)
    r = int(min(w, h) * 0.36)
    # cream circle
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=cream)
    # orange ring
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=bg, width=max(8, r // 18))
    # hair bun (new)
    d.ellipse([cx - r // 3, cy - r - r // 5, cx + r // 3, cy - r + r // 6], fill=cream, outline=bg, width=6)
    # head
    face_r = int(r * 0.55)
    d.ellipse([cx - face_r, cy - face_r - r // 10, cx + face_r, cy + face_r - r // 10], fill=cream, outline=bg, width=6)
    # curly hair scallops
    for i, ang in enumerate(range(-140, 40, 28)):
        a = math.radians(ang)
        hx = cx + int(math.cos(a) * face_r * 0.95)
        hy = cy - r // 10 + int(math.sin(a) * face_r * 0.95)
        d.ellipse([hx - 28, hy - 28, hx + 28, hy + 28], fill=cream, outline=bg, width=5)
    # sunglasses (slightly larger round)
    for sx in (-face_r // 2, face_r // 5):
        d.ellipse([cx + sx - 32, cy - 35, cx + sx + 32, cy + 20], fill=bg)
    d.rectangle([cx - 12, cy - 12, cx + 8, cy - 2], fill=bg)
    # smile
    d.arc([cx - 40, cy + 10, cx + 40, cy + 70], 20, 160, fill=bg, width=6)
    # scarf band (new detail)
    d.rectangle([cx - face_r // 2, cy + face_r // 2, cx + face_r // 2, cy + face_r // 2 + 28], fill=bg)
    # shoulders
    d.pieslice([cx - r, cy + face_r // 3, cx + r, cy + r + 40], 0, 180, fill=bg)
    # bracelet arm pop-out
    d.ellipse([cx + r - 40, cy + 40, cx + r + 70, cy + 150], fill=cream, outline=bg, width=6)
    d.ellipse([cx + r + 5, cy + 90, cx + r + 55, cy + 135], outline=bg, width=8)
    return im


def redraw_nomnom(size, bg, fg):
    w, h = size
    im = Image.new("RGB", size, bg)
    d = ImageDraw.Draw(im)
    cx, cy = w // 2, int(h * 0.55)
    s = min(w, h) / 1000
    rad = int(95 * s)
    # 7 grapes new arrangement (was 6)
    positions = [
        (-110, -40), (0, -70), (110, -40),
        (-55, 40), (55, 40),
        (-110, 120), (0, 150),
    ]
    for x, y in positions:
        d.ellipse([cx + x * s - rad, cy + y * s - rad, cx + x * s + rad, cy + y * s + rad], fill=fg)
    # single asymmetric leaf
    leaf = [
        (cx - 40 * s, cy - 200 * s),
        (cx + 160 * s, cy - 260 * s),
        (cx + 40 * s, cy - 120 * s),
    ]
    d.polygon(leaf, fill=fg)
    return im


def redraw_scoop(size, bg, pink, outline):
    w, h = size
    im = Image.new("RGB", size, bg)
    d = ImageDraw.Draw(im)
    cx, cy = w // 2, h // 2
    s = min(w, h) / 1000

    def blob(cx0, cy0, rw, rh):
        d.ellipse([cx0 - rw, cy0 - rh, cx0 + rw, cy0 + rh], fill=pink, outline=outline, width=max(6, int(10 * s)))

    # top scoop (slightly smaller / offset)
    blob(cx - 20 * s, cy - 160 * s, 170 * s, 150 * s)
    # bottom scoop (wider)
    blob(cx + 10 * s, cy + 80 * s, 210 * s, 180 * s)
    # arms
    for sx in (-200, 160):
        d.ellipse([cx + sx * s - 35 * s, cy - 40 * s, cx + sx * s + 35 * s, cy + 40 * s], fill=pink, outline=outline, width=6)
    # feet
    for sx in (-90, 90):
        d.ellipse([cx + sx * s - 40 * s, cy + 220 * s, cx + sx * s + 40 * s, cy + 280 * s], fill=pink, outline=outline, width=6)
    # top face — oval eyes
    for sx in (-50, 40):
        d.ellipse([cx + (sx - 18) * s - 20 * s, cy - 200 * s, cx + (sx + 18) * s - 20 * s, cy - 120 * s], fill=outline)
    d.arc([cx - 40 * s, cy - 140 * s, cx + 20 * s, cy - 90 * s], 20, 160, fill=outline, width=5)
    # bottom face — gloopy smile + tongue
    for sx in (-60, 40):
        d.ellipse([cx + sx * s - 28 * s, cy + 20 * s, cx + sx * s + 28 * s, cy + 90 * s], fill=outline)
    d.arc([cx - 80 * s, cy + 80 * s, cx + 80 * s, cy + 180 * s], 10, 170, fill=outline, width=8)
    d.ellipse([cx - 10 * s, cy + 130 * s, cx + 50 * s, cy + 175 * s], fill=outline)
    return im


def redraw_apex(size):
    """AX monoline on dark→blue gradient (sampled feel)."""
    w, h = size
    im = Image.new("RGB", size)
    px = im.load()
    top = (5, 8, 18)
    bot = (20, 55, 170)
    for y in range(h):
        t = y / max(h - 1, 1)
        c = tuple(int(top[i] * (1 - t) + bot[i] * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    d = ImageDraw.Draw(im)
    stroke = max(18, w // 28)
    # A
    ax = [
        (int(w * 0.22), int(h * 0.72)),
        (int(w * 0.38), int(h * 0.28)),
        (int(w * 0.48), int(h * 0.72)),
    ]
    d.line(ax, fill=(255, 255, 255), width=stroke, joint="curve")
    d.line([(int(w * 0.30), int(h * 0.55)), (int(w * 0.42), int(h * 0.55))], fill=(255, 255, 255), width=stroke)
    # X connected
    d.line([(int(w * 0.52), int(h * 0.28)), (int(w * 0.78), int(h * 0.72))], fill=(255, 255, 255), width=stroke)
    d.line([(int(w * 0.78), int(h * 0.28)), (int(w * 0.52), int(h * 0.72))], fill=(255, 255, 255), width=stroke)
    return im


def redraw_crust(size, bg, fg):
    """C with nested c (was B/b)."""
    w, h = size
    im = Image.new("RGB", size, bg)
    d = ImageDraw.Draw(im)
    cx, cy = w // 2, h // 2
    # big C
    outer = int(min(w, h) * 0.34)
    thick = int(min(w, h) * 0.14)
    d.arc([cx - outer, cy - outer, cx + outer, cy + outer], 40, 320, fill=fg, width=thick)
    # nested small c
    inner = int(outer * 0.48)
    thick2 = int(thick * 0.55)
    d.arc([cx - inner + 10, cy - inner + 30, cx + inner + 10, cy + inner + 30], 50, 310, fill=bg, width=thick2)
    # center dot
    r = int(min(w, h) * 0.035)
    d.ellipse([cx - r + 8, cy - r + 25, cx + r + 8, cy + r + 25], fill=fg)
    return im


def redraw_grace(size, bg, fg):
    """Geometric crest ~30% different petals."""
    w, h = size
    im = Image.new("RGB", size, bg)
    d = ImageDraw.Draw(im)
    cx, cy = w // 2, h // 2
    r = int(min(w, h) * 0.34)
    stroke = max(4, r // 22)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=fg, width=stroke)
    # 6 petal loops instead of 4
    for i in range(6):
        ang = math.radians(i * 60)
        x2 = cx + int(math.cos(ang) * r * 0.85)
        y2 = cy + int(math.sin(ang) * r * 0.85)
        d.ellipse([min(cx, x2) - 8, min(cy, y2) - 8, max(cx, x2) + 8, max(cy, y2) + 8], outline=fg, width=stroke)
    # center diamond
    diamond = [(cx, cy - r // 3), (cx + r // 3, cy), (cx, cy + r // 3), (cx - r // 3, cy)]
    d.polygon(diamond, outline=fg)
    d.line([(cx, cy - r), (cx, cy + r)], fill=fg, width=stroke)
    return im


def redraw_northline(size, bg, fg):
    """Italic N with checkered left stem (was P)."""
    w, h = size
    im = Image.new("RGB", size, bg)
    d = ImageDraw.Draw(im)
    # italic shear approx via polygon N
    slant = int(w * 0.06)
    left = int(w * 0.28)
    right = int(w * 0.72)
    top = int(h * 0.22)
    bot = int(h * 0.78)
    thick = int(w * 0.11)
    # checkered left stem
    cell = thick // 2
    cols = 2
    rows = 6
    for row in range(rows):
        for col in range(cols):
            if (row + col) % 2 == 0:
                x0 = left + col * cell + int((row / rows) * slant)
                y0 = top + row * ((bot - top) // rows)
                d.rectangle([x0, y0, x0 + cell, y0 + (bot - top) // rows], fill=fg)
    # diagonal
    d.line([(left + thick // 2 + slant // 2, top), (right - thick // 2 - slant // 2, bot)], fill=fg, width=thick)
    # right stem solid
    d.polygon([
        (right - thick + slant, top),
        (right + slant, top),
        (right - slant, bot),
        (right - thick - slant, bot),
    ], fill=fg)
    return im


def main():
    restore_from_bak_or_ref()

    jobs = [
        ("6ab266d33e964df940c04833_HeyGluco.png",
         ["6ab266d33e964df940c04833_HeyGluco-p-500.png", "6ab266d33e964df940c04833_HeyGluco-p-800.png"],
         "vitapulse"),
        ("6ab266e293685f22fedc573a_Tanti Maria.png",
         ["6ab266e293685f22fedc573a_Tanti Maria-p-500.png", "6ab266e293685f22fedc573a_Tanti Maria-p-800.png"],
         "nonna"),
        ("6ab266f1e1ea593718edc309_YumYum.png",
         ["6ab266f1e1ea593718edc309_YumYum-p-500.png", "6ab266f1e1ea593718edc309_YumYum-p-800.png"],
         "nomnom"),
        ("6ab26718a85417b42d23712f_Munchies & Cream.png",
         ["6ab26718a85417b42d23712f_Munchies & Cream-p-500.png", "6ab26718a85417b42d23712f_Munchies & Cream-p-800.png"],
         "scoop"),
        ("6ab26733f2ee3f3da2d70eeb_MVP.png",
         ["6ab26733f2ee3f3da2d70eeb_MVP-p-500.png", "6ab26733f2ee3f3da2d70eeb_MVP-p-800.png"],
         "apex"),
        ("6ab2675e0b996d1415be46a3_The Bagel Bar.png",
         ["6ab2675e0b996d1415be46a3_The Bagel Bar-p-500.png", "6ab2675e0b996d1415be46a3_The Bagel Bar-p-800.png"],
         "crust"),
        ("6ab26740bc5572adf49b107e_Merci.png",
         ["6ab26740bc5572adf49b107e_Merci-p-500.png", "6ab26740bc5572adf49b107e_Merci-p-800.png"],
         "grace"),
        ("6ab2674fed9b5a030f520afb_LP1.png",
         ["6ab2674fed9b5a030f520afb_LP1-p-500.png", "6ab2674fed9b5a030f520afb_LP1-p-800.png"],
         "northline"),
    ]

    for master, variants, kind in jobs:
        ref = {
            "vitapulse": "heygluco.png",
            "nonna": "tanti.png",
            "nomnom": "yumyum.png",
            "scoop": "munchies.png",
            "apex": "mvp.png",
            "crust": "bagel.png",
            "grace": "merci.png",
            "northline": "lp1.png",
        }[kind]
        size, bg, accent = sample_corners_and_center(PREV / ref)
        # also sample second accent for scoop
        im0 = Image.open(PREV / ref).convert("RGB")
        if kind == "vitapulse":
            img = redraw_vitapulse(size, bg, accent)
        elif kind == "nonna":
            img = redraw_nonna(size, bg, accent)
        elif kind == "nomnom":
            img = redraw_nomnom(size, bg, accent)
        elif kind == "scoop":
            # pink body + dark outline from original
            px = im0.load()
            pink = accent
            outline = bg
            # find lighter pink
            for y in range(size[1] // 3, 2 * size[1] // 3, 10):
                for x in range(size[0] // 3, 2 * size[0] // 3, 10):
                    c = px[x, y]
                    if c[0] > 180 and c[2] > 150:
                        pink = c
                        break
            img = redraw_scoop(size, bg, pink, outline)
        elif kind == "apex":
            img = redraw_apex(size)
        elif kind == "crust":
            img = redraw_crust(size, bg, accent)
        elif kind == "grace":
            img = redraw_grace(size, bg, accent)
        else:
            img = redraw_northline(size, bg, accent)
        publish(img.convert("RGBA"), master, variants)


if __name__ == "__main__":
    main()
