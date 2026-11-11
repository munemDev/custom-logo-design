"""
~30% redesign of homepage logo marks: new geometry / letterforms,
preserve original color palette (no hue junk).
Also updates project-name-text labels in site HTML.
"""
from __future__ import annotations

import hashlib
import io
import re
import shutil
import ssl
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image
import numpy as np

ROOT = Path(r"f:\logo-brand")
ASSETS = ROOT / "site" / "assets" / "cdn_prod_website-files_com" / "6aaad679fdb9d914f7f5203c"
OUT_DIR = ROOT / "scripts" / ".logo-redesign"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# master filename stem (exact file under ASSETS) -> redesign brief + new UI name
LOGOS = [
    {
        "master": "6ab266d33e964df940c04833_HeyGluco.png",
        "variants": [
            "6ab266d33e964df940c04833_HeyGluco-p-500.png",
            "6ab266d33e964df940c04833_HeyGluco-p-800.png",
        ],
        "old_name": "HeyGluco",
        "new_name": "VitaPulse",
        "prompt": (
            "flat vector brand logo mark, cute geometric mythical creature mascot "
            "in profile facing left, thick solid shapes, stubby legs, small wing, "
            "circular eye cutout, centered, ample padding, no text, no watermark, "
            "square composition, redesign silhouette about thirty percent from a "
            "blocky horse-dragon icon"
        ),
    },
    {
        "master": "6ab266e293685f22fedc573a_Tanti Maria.png",
        "variants": [
            "6ab266e293685f22fedc573a_Tanti Maria-p-500.png",
            "6ab266e293685f22fedc573a_Tanti Maria-p-800.png",
        ],
        "old_name": "TANTI MARIA",
        "new_name": "NONNA ROSA",
        "prompt": (
            "flat vector circular badge logo, friendly elderly grandma mascot "
            "wearing sunglasses, cream circle sticker on solid orange field, "
            "thick uniform line art, pop-out arm breaking circle, no text, "
            "no watermark, square, redesign hair and pose about thirty percent"
        ),
    },
    {
        "master": "6ab266f1e1ea593718edc309_YumYum.png",
        "variants": [
            "6ab266f1e1ea593718edc309_YumYum-p-500.png",
            "6ab266f1e1ea593718edc309_YumYum-p-800.png",
        ],
        "old_name": "YUM YUM",
        "new_name": "NOM NOM",
        "prompt": (
            "flat geometric grape cluster logo mark, solid circles as grapes "
            "with leaf shapes above, minimal modern vector, centered, "
            "no text, no watermark, square, rearrange cluster about thirty percent"
        ),
    },
    {
        "master": "6ab26718a85417b42d23712f_Munchies & Cream.png",
        "variants": [
            "6ab26718a85417b42d23712f_Munchies & Cream-p-500.png",
            "6ab26718a85417b42d23712f_Munchies & Cream-p-800.png",
        ],
        "old_name": "MUNCHIES AND CREAM",
        "new_name": "SCOOP & CRUNCH",
        "prompt": (
            "flat vector cartoon dual-scoop ice cream blob character mascot, "
            "two stacked rounded segments with faces, thick outlines, playful, "
            "centered on solid background, no text, no watermark, square, "
            "redesign expression and proportions about thirty percent"
        ),
    },
    {
        "master": "6ab26733f2ee3f3da2d70eeb_MVP.png",
        "variants": [
            "6ab26733f2ee3f3da2d70eeb_MVP-p-500.png",
            "6ab26733f2ee3f3da2d70eeb_MVP-p-800.png",
        ],
        "old_name": "MVP",
        "new_name": "APEX",
        "prompt": (
            "minimal monoline white lettermark logo reading AX, continuous thick "
            "rounded stroke, modern athletic tech style, centered on dark to "
            "royal blue vertical gradient background, subtle glow, no extra text, "
            "no watermark, square"
        ),
    },
    {
        "master": "6ab2675e0b996d1415be46a3_The Bagel Bar.png",
        "variants": [
            "6ab2675e0b996d1415be46a3_The Bagel Bar-p-500.png",
            "6ab2675e0b996d1415be46a3_The Bagel Bar-p-800.png",
        ],
        "old_name": "THE BAGEL BAR",
        "new_name": "CRUST & CO",
        "prompt": (
            "minimal geometric lettermark logo, large light uppercase C with a "
            "smaller nested lowercase c in negative space, small center dot, "
            "bold rounded sans, solid royal blue background, no extra text, "
            "no watermark, square"
        ),
    },
    {
        "master": "6ab26740bc5572adf49b107e_Merci.png",
        "variants": [
            "6ab26740bc5572adf49b107e_Merci-p-500.png",
            "6ab26740bc5572adf49b107e_Merci-p-800.png",
        ],
        "old_name": "Merci",
        "new_name": "GRACE",
        "prompt": (
            "minimal geometric circular crest logo, cream line art on deep "
            "chocolate brown, symmetrical petal and star motif inside circle, "
            "redesign inner geometry about thirty percent, no text, no watermark, square"
        ),
        "html_optional": True,  # may only appear off-homepage
    },
    {
        "master": "6ab2674fed9b5a030f520afb_LP1.png",
        "variants": [
            "6ab2674fed9b5a030f520afb_LP1-p-500.png",
            "6ab2674fed9b5a030f520afb_LP1-p-800.png",
        ],
        "old_name": "LP1",
        "new_name": "NORTHLINE",
        "prompt": (
            "bold italic white letter N logo on vivid red background, left stem "
            "checkered racing-flag blocks, solid smooth bowl curve adapted for N, "
            "athletic modern, no extra text, no watermark, square"
        ),
        "html_optional": True,
    },
]


def dominant_palette(img: Image.Image, k: int = 6) -> np.ndarray:
    """Return up to k representative RGB colors from image (quantized)."""
    small = img.convert("RGB").resize((64, 64), Image.Resampling.BOX)
    arr = np.asarray(small, dtype=np.float32).reshape(-1, 3)
    # simple k-means-ish via iterative nearest
    # seed with unique-ish samples
    rng = np.random.default_rng(0)
    idx = rng.choice(len(arr), size=min(k * 8, len(arr)), replace=False)
    cents = arr[idx[:k]].copy()
    for _ in range(12):
        d = ((arr[:, None, :] - cents[None, :, :]) ** 2).sum(axis=2)
        labels = d.argmin(axis=1)
        for i in range(k):
            mask = labels == i
            if mask.any():
                cents[i] = arr[mask].mean(axis=0)
    # sort by frequency
    d = ((arr[:, None, :] - cents[None, :, :]) ** 2).sum(axis=2)
    labels = d.argmin(axis=1)
    counts = np.bincount(labels, minlength=k)
    order = counts.argsort()[::-1]
    return cents[order]


def lock_palette(gen: Image.Image, palette: np.ndarray) -> Image.Image:
    """Map every pixel to nearest original palette color (keeps brand colors)."""
    rgb = gen.convert("RGB")
    arr = np.asarray(rgb, dtype=np.float32)
    h, w, _ = arr.shape
    flat = arr.reshape(-1, 3)
    d = ((flat[:, None, :] - palette[None, :, :]) ** 2).sum(axis=2)
    nearest = palette[d.argmin(axis=1)]
    out = nearest.reshape(h, w, 3).astype(np.uint8)
    return Image.fromarray(out, "RGB")


def fetch_ai(prompt: str, w: int, h: int, seed: int) -> Image.Image:
    # ask slightly larger then crop watermark band
    req_w = min(max(w, 768), 1280)
    req_h = min(max(h, 768), 1280)
    # force square for marks
    side = max(req_w, req_h)
    color_hint = " use only the exact brand colors described by reference style"
    full = prompt + color_hint + ", professional logo design, clean edges"
    url = (
        "https://image.pollinations.ai/prompt/"
        + urllib.parse.quote(full)
        + f"?width={side}&height={side}&nologo=true&model=flux&seed={seed}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=180, context=ctx) as resp:
        data = resp.read()
        ctype = resp.headers.get("content-type", "")
        if "image" not in ctype:
            raise RuntimeError(f"not image: {ctype}")
    im = Image.open(io.BytesIO(data)).convert("RGB")
    # crop bottom watermark band if any
    ww, hh = im.size
    im = im.crop((0, 0, ww, int(hh * 0.97)))
    return im


def write_atomic(img: Image.Image, path: Path) -> None:
    tmp = path.with_suffix(path.suffix + ".redesign-tmp")
    if path.suffix.lower() in {".jpg", ".jpeg"}:
        img.convert("RGB").save(tmp, format="JPEG", quality=92)
    else:
        img.save(tmp, format="PNG", optimize=True)
    # overwrite via copy to dodge WinError 5 on locked targets
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass
    shutil.copy2(tmp, path)
    try:
        tmp.unlink(missing_ok=True)
    except OSError:
        pass


def resize_variants(master_img: Image.Image, master_path: Path, variants: list[str]) -> None:
    write_atomic(master_img, master_path)
    for name in variants:
        vp = ASSETS / name
        # infer width from name -p-500 / -p-800
        m = re.search(r"-p-(\d+)\.", name)
        if not m:
            continue
        tw = int(m.group(1))
        th = int(round(master_img.height * (tw / master_img.width)))
        resized = master_img.resize((tw, th), Image.Resampling.LANCZOS)
        write_atomic(resized, vp)


def update_html_names() -> None:
    mapping = {item["old_name"]: item["new_name"] for item in LOGOS}
    # also common casing variants for testimonials
    extra = {
        "HeyGluco": "VitaPulse",
        "MVP Agency": "Apex Agency",
        "Merci": "Grace",
    }
    mapping.update(extra)
    pages = list((ROOT / "site").rglob("*.html"))
    for page in pages:
        text = page.read_text(encoding="utf-8", errors="ignore")
        orig = text
        for old, new in mapping.items():
            # project name blocks
            text = text.replace(
                f'<div class="project-name-text">{old}</div>',
                f'<div class="project-name-text">{new}</div>',
            )
            # plain visible names in testimonials / copy (word-ish)
            if old in ("HeyGluco", "MVP Agency", "Merci"):
                text = text.replace(old, new)
        if text != orig:
            page.write_text(text, encoding="utf-8")
            print("html", page.relative_to(ROOT))


def main() -> None:
    update_html_names()
    for i, item in enumerate(LOGOS, 1):
        master = ASSETS / item["master"]
        if not master.exists():
            print(f"[{i}] MISSING {master.name}")
            continue
        with Image.open(master) as im:
            size = im.size
            palette = dominant_palette(im, k=5)
            # stash a backup once
            bak = OUT_DIR / (master.stem + ".orig.png")
            if not bak.exists():
                im.convert("RGBA").save(bak)

        seed = int(hashlib.md5(item["new_name"].encode()).hexdigest()[:6], 16)
        # inject palette hex into prompt for stronger color fidelity before lock
        hexes = " and ".join(
            f"#{int(c[0]):02x}{int(c[1]):02x}{int(c[2]):02x}" for c in palette[:3]
        )
        prompt = item["prompt"] + f", exact colors {hexes} only"
        print(f"[{i}/{len(LOGOS)}] {item['old_name']} -> {item['new_name']} …")
        try:
            gen = fetch_ai(prompt, size[0], size[1], seed)
            locked = lock_palette(gen, palette)
            locked = locked.resize(size, Image.Resampling.LANCZOS)
            preview = OUT_DIR / f"{item['new_name'].replace(' ', '_').replace('&', 'and')}.png"
            locked.save(preview)
            resize_variants(locked, master, item["variants"])
            print(f"  ok -> {master.name}")
        except Exception as e:
            print(f"  FAIL {e}")


if __name__ == "__main__":
    main()
