"""Create ~30% visually varied versions of images and overwrite targets + size variants."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps, ImageFilter
import colorsys

ROOT = Path(r"f:\logo-brand\site\assets")
OUT_DIR = ROOT / "generated"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Homepage showcase masters + their resized siblings to overwrite
JOBS = [
    {
        "src": ROOT
        / "cdn_prod_website-files_com"
        / "6aaad679fdb9d914f7f52049"
        / "6ab263498b14a38a7a109afc_Shot 2.jpg",
        "glob_prefix": "6ab263498b14a38a7a109afc_Shot 2",
        "hue": 28,
        "sat": 1.18,
        "contrast": 1.12,
        "brightness": 1.05,
        "mirror": False,
        "crop": 0.06,
    },
    {
        "src": ROOT
        / "cdn_prod_website-files_com"
        / "6aaad679fdb9d914f7f52049"
        / "6ab2633da8fa39ec5216880b_Shot 4.jpg",
        "glob_prefix": "6ab2633da8fa39ec5216880b_Shot 4",
        "hue": -22,
        "sat": 1.22,
        "contrast": 1.15,
        "brightness": 1.02,
        "mirror": True,
        "crop": 0.05,
    },
    {
        "src": ROOT
        / "cdn_prod_website-files_com"
        / "6aaad679fdb9d914f7f52049"
        / "6ab2633d3e5b6a35a15d74d7_Shot 5.jpg",
        "glob_prefix": "6ab2633d3e5b6a35a15d74d7_Shot 5",
        "hue": 40,
        "sat": 1.15,
        "contrast": 1.1,
        "brightness": 1.08,
        "mirror": False,
        "crop": 0.07,
    },
    {
        "src": ROOT
        / "cdn_prod_website-files_com"
        / "6aaad679fdb9d914f7f52049"
        / "6ab2634dc8995221637e120c_Shot 6.png",
        "glob_prefix": "6ab2634dc8995221637e120c_Shot 6",
        "hue": -35,
        "sat": 1.2,
        "contrast": 1.18,
        "brightness": 0.98,
        "mirror": True,
        "crop": 0.05,
    },
]


def shift_hue(img: Image.Image, degrees: float) -> Image.Image:
    if img.mode != "RGBA":
        base = img.convert("RGBA")
    else:
        base = img
    r, g, b, a = base.split()
    rgb = Image.merge("RGB", (r, g, b))
    pixels = list(rgb.getdata())
    shifted = []
    amount = (degrees % 360) / 360.0
    for pr, pg, pb in pixels:
        h, s, v = colorsys.rgb_to_hsv(pr / 255.0, pg / 255.0, pb / 255.0)
        h = (h + amount) % 1.0
        nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
        shifted.append((int(nr * 255), int(ng * 255), int(nb * 255)))
    rgb.putdata(shifted)
    out = rgb.convert("RGBA")
    out.putalpha(a)
    return out


def vary(job: dict) -> Image.Image:
    src = job["src"]
    img = Image.open(src)
    has_alpha = img.mode in ("RGBA", "LA") or ("transparency" in img.info)
    img = img.convert("RGBA")

    w, h = img.size
    c = job["crop"]
    left, top = int(w * c), int(h * c)
    right, bottom = int(w * (1 - c)), int(h * (1 - c))
    img = img.crop((left, top, right, bottom)).resize((w, h), Image.Resampling.LANCZOS)

    if job["mirror"]:
        img = ImageOps.mirror(img)

    img = shift_hue(img, job["hue"])
    rgb = img.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(job["sat"])
    rgb = ImageEnhance.Contrast(rgb).enhance(job["contrast"])
    rgb = ImageEnhance.Brightness(rgb).enhance(job["brightness"])
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=2))

    if has_alpha and src.suffix.lower() == ".png":
        out = rgb.convert("RGBA")
    else:
        out = rgb.convert("RGB")
    return out


def overwrite_variants(prefix: str, folder: Path, master: Image.Image):
    """Overwrite master and -p-* siblings with resized copies of varied master."""
    count = 0
    for f in folder.iterdir():
        if not f.is_file():
            continue
        name = f.name
        if not name.startswith(prefix):
            continue
        # skip unrelated
        if name.lower().endswith((".mp4", ".webm", ".json")):
            continue
        try:
            target_mode = "RGBA" if f.suffix.lower() == ".png" else "RGB"
            # keep approximate size of existing file
            with Image.open(f) as existing:
                size = existing.size
            resized = master.resize(size, Image.Resampling.LANCZOS)
            if target_mode == "RGB":
                resized = resized.convert("RGB")
                resized.save(f, quality=90, optimize=True)
            else:
                resized = resized.convert("RGBA")
                resized.save(f, optimize=True)
            count += 1
            print(f"  replaced {f.name} ({size[0]}x{size[1]})")
        except Exception as e:
            print(f"  skip {name}: {e}")
    return count


def main():
    total = 0
    for job in JOBS:
        src = job["src"]
        if not src.exists():
            print("MISSING", src)
            continue
        print("Varying", src.name)
        varied = vary(job)
        preview = OUT_DIR / f"varied-{job['glob_prefix'].split('_')[-1].replace(' ', '-')}.png"
        varied.convert("RGBA").save(preview)
        print("  preview", preview)
        folder = src.parent
        total += overwrite_variants(job["glob_prefix"], folder, varied)
    print("DONE replaced files:", total)


if __name__ == "__main__":
    main()
