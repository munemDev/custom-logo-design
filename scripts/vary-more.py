"""Vary additional homepage project/testimonial images (~30%)."""
from __future__ import annotations

import colorsys
import hashlib
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps, ImageFilter

ROOT = Path(r"f:\logo-brand\site")
ASSETS = ROOT / "assets"

TARGETS = [
    # project logos/thumbs used on home
    "cdn_prod_website-files_com/6aaad679fdb9d914f7f5203c/6ab266d33e964df940c04833_HeyGluco.png",
    "cdn_prod_website-files_com/6aaad679fdb9d914f7f5203c/6ab26733f2ee3f3da2d70eeb_MVP.png",
    "cdn_prod_website-files_com/6aaad679fdb9d914f7f5203c/6ab266f1e1ea593718edc309_YumYum.png",
    "cdn_prod_website-files_com/6aaad679fdb9d914f7f5203c/6ab2675e0b996d1415be46a3_The Bagel Bar-p-800.png",
    "cdn_prod_website-files_com/6aaad679fdb9d914f7f5203c/6ab266e293685f22fedc573a_Tanti Maria.png",
    "cdn_prod_website-files_com/6aaad679fdb9d914f7f5203c/6ab26718a85417b42d23712f_Munchies & Cream.png",
    # testimonials
    "cdn_prod_website-files_com/6aaad679fdb9d914f7f5203c/6ab3d538dbdbc6a5f1d1d3f4_Rux.jpg",
    "cdn_prod_website-files_com/6aaad679fdb9d914f7f5203c/6ab3d1f99d28cf11d2e8f501_luiza.jpg",
    "cdn_prod_website-files_com/6aaad679fdb9d914f7f5203c/6ab3d5ec9cfd634776e95758_Vlad.jpg",
    "cdn_prod_website-files_com/6aaad679fdb9d914f7f5203c/6ab3d72a667c6ab560a03d5b_Ionut.jpg",
    "cdn_prod_website-files_com/6aaad679fdb9d914f7f5203c/6ab3d7f19cfd634776eaf212_Monica.jpg",
]


def params_for(path: Path):
    h = int(hashlib.md5(path.name.encode()).hexdigest()[:6], 16)
    return {
        "hue": (h % 70) - 35,
        "sat": 1.1 + (h % 20) / 100,
        "contrast": 1.08 + (h % 15) / 100,
        "brightness": 0.96 + (h % 12) / 100,
        "mirror": (h % 2 == 0),
        "crop": 0.04 + (h % 5) / 100,
    }


def shift_hue(img: Image.Image, degrees: float) -> Image.Image:
    base = img.convert("RGBA")
    r, g, b, a = base.split()
    rgb = Image.merge("RGB", (r, g, b))
    data = list(rgb.getdata())
    amount = (degrees % 360) / 360.0
    out = []
    for pr, pg, pb in data:
        hh, s, v = colorsys.rgb_to_hsv(pr / 255.0, pg / 255.0, pb / 255.0)
        hh = (hh + amount) % 1.0
        nr, ng, nb = colorsys.hsv_to_rgb(hh, s, v)
        out.append((int(nr * 255), int(ng * 255), int(nb * 255)))
    rgb.putdata(out)
    res = rgb.convert("RGBA")
    res.putalpha(a)
    return res


def vary_file(path: Path):
    if not path.exists():
        print("missing", path)
        return False
    p = params_for(path)
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    c = p["crop"]
    img = img.crop((int(w * c), int(h * c), int(w * (1 - c)), int(h * (1 - c)))).resize(
        (w, h), Image.Resampling.LANCZOS
    )
    if p["mirror"]:
        img = ImageOps.mirror(img)
    img = shift_hue(img, p["hue"])
    rgb = img.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(p["sat"])
    rgb = ImageEnhance.Contrast(rgb).enhance(p["contrast"])
    rgb = ImageEnhance.Brightness(rgb).enhance(p["brightness"])
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.0, percent=70, threshold=2))

    if path.suffix.lower() == ".png":
        rgb.convert("RGBA").save(path, optimize=True)
    else:
        rgb.convert("RGB").save(path, quality=90, optimize=True)

    # also overwrite -p-* siblings with same stem prefix before extension variants
    stem = path.name
    # find base before -p-
    base = stem
    for marker in ["-p-500", "-p-800", "-p-1080", "-p-1600", "-p-2000", "-p-2600"]:
        if marker in base:
            base = base.split(marker)[0]
            break
    else:
        # strip extension for prefix match
        base = path.stem

    prefix = base
    folder = path.parent
    for f in folder.iterdir():
        if not f.is_file() or f == path:
            continue
        if not f.name.startswith(prefix):
            continue
        if f.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        try:
            with Image.open(f) as ex:
                size = ex.size
            resized = rgb.resize(size, Image.Resampling.LANCZOS)
            if f.suffix.lower() == ".png":
                resized.convert("RGBA").save(f, optimize=True)
            else:
                resized.convert("RGB").save(f, quality=88, optimize=True)
            print("  sibling", f.name)
        except Exception as e:
            print("  skip", f.name, e)
    print("ok", path.name, p)
    return True


def main():
    n = 0
    for rel in TARGETS:
        p = ASSETS / rel
        # try fuzzy if exact missing (spaces)
        if not p.exists():
            matches = list(p.parent.glob(p.name.split("_")[0] + "*")) if p.parent.exists() else []
            # better: glob by id prefix
            idpart = Path(rel).name.split("_")[0]
            matches = list(p.parent.glob(idpart + "*")) if p.parent.exists() else []
            # prefer exact-ish without -p-
            candidates = [m for m in matches if "-p-" not in m.name and m.suffix.lower() in {".png", ".jpg", ".jpeg"}]
            if candidates:
                p = candidates[0]
                print("resolved", rel, "->", p.name)
            else:
                print("MISSING", rel)
                continue
        if vary_file(p):
            n += 1
    print("DONE", n)


if __name__ == "__main__":
    main()
