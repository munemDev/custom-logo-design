"""Replace testimonial names + headshot images (exact file paths kept)."""
from __future__ import annotations

import io
import ssl
import shutil
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(r"f:\logo-brand")
ASSETS = ROOT / "site" / "assets" / "cdn_prod_website-files_com" / "6aaad679fdb9d914f7f5203c"
HTML = ROOT / "site" / "index.html"

PEOPLE = [
    {
        "old_name": "Ruxandra Florescu",
        "new_name": "Maya Kapoor",
        "old_role": "COO, Dare Digital",
        "new_role": "COO, Northstar Digital",
        "master": "6ab3d538dbdbc6a5f1d1d3f4_Rux.jpg",
        "variants": ["6ab3d538dbdbc6a5f1d1d3f4_Rux-p-500.jpg"],
        "prompt": (
            "professional headshot photo of a smiling Indian woman in her early 30s, "
            "shoulder length dark hair, warm outdoor soft green blur background, "
            "natural daylight, friendly smile, photorealistic portrait, no text, no watermark"
        ),
        "seed": 1011,
    },
    {
        "old_name": "Luiza Zamfirescu",
        "new_name": "Ananya Mehta",
        "old_role": "Co-Founder, VitaPulse",
        "new_role": "Co-Founder, VitaPulse",
        "master": "6ab3d1f99d28cf11d2e8f501_luiza.jpg",
        "variants": ["6ab3d1f99d28cf11d2e8f501_luiza-p-500.jpg"],
        "prompt": (
            "professional headshot photo of a smiling South Asian woman late 20s, "
            "long dark hair, soft cream indoor background, bright natural light, "
            "photorealistic portrait for website avatar, no text, no watermark"
        ),
        "seed": 2022,
    },
    {
        "old_name": "Vlad Belcin",
        "new_name": "Rohan Desai",
        "old_role": "Sr. Copywriter, Dare Digital",
        "new_role": "Sr. Copywriter, Northstar Digital",
        "master": "6ab3d5ec9cfd634776e95758_Vlad.jpg",
        "variants": ["6ab3d5ec9cfd634776e95758_Vlad-p-500.jpg"],
        "prompt": (
            "professional headshot photo of a smiling Indian man early 30s, short neat hair, "
            "light stubble, casual shirt, soft outdoor blur background, photorealistic, "
            "no sunglasses, no text, no watermark"
        ),
        "seed": 3033,
    },
    {
        "old_name": "Ionut Belet",
        "new_name": "Kabir Shah",
        "old_role": "Founder, Apex Agency",
        "new_role": "Founder, Apex Agency",
        "master": "6ab3d72a667c6ab560a03d5b_Ionut.jpg",
        "variants": ["6ab3d72a667c6ab560a03d5b_Ionut-p-500.jpg"],
        "prompt": (
            "professional headshot photo of a smiling Middle Eastern man early 30s, "
            "short brown hair, light beard, white athletic t-shirt, soft green outdoor "
            "park background, friendly wide smile, photorealistic, no sunglasses, "
            "no text, no watermark"
        ),
        "seed": 4044,
    },
    {
        "old_name": "Monica Tantu",
        "new_name": "Priya Nair",
        "old_role": "Co-Founder, Grace",
        "new_role": "Co-Founder, Grace",
        "master": "6ab3d7f19cfd634776eaf212_Monica.jpg",
        "variants": ["6ab3d7f19cfd634776eaf212_Monica-p-500.jpg"],
        "prompt": (
            "professional headshot photo of a smiling Indian woman early 30s, "
            "wavy dark hair, soft neutral studio background, warm smile, "
            "photorealistic portrait, no text, no watermark"
        ),
        "seed": 5055,
    },
]


def fetch(prompt: str, seed: int, size: tuple[int, int]) -> Image.Image:
    side = max(768, min(max(size), 1024))
    url = (
        "https://image.pollinations.ai/prompt/"
        + urllib.parse.quote(prompt)
        + f"?width={side}&height={side}&nologo=true&model=flux&seed={seed}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=180, context=ctx) as resp:
        data = resp.read()
        if "image" not in (resp.headers.get("content-type") or ""):
            raise RuntimeError(resp.headers.get("content-type"))
    im = Image.open(io.BytesIO(data)).convert("RGB")
    # crop watermark band
    w, h = im.size
    im = im.crop((0, 0, w, int(h * 0.97)))
    return im.resize(size, Image.Resampling.LANCZOS)


def write_jpg(img: Image.Image, path: Path) -> None:
    tmp = path.with_suffix(path.suffix + ".swap-tmp")
    img.convert("RGB").save(tmp, format="JPEG", quality=92)
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass
    shutil.copy2(tmp, path)
    try:
        tmp.unlink(missing_ok=True)
    except OSError:
        pass


def main() -> None:
    text = HTML.read_text(encoding="utf-8")
    for p in PEOPLE:
        text = text.replace(
            f'<div class="testimonial-pfp-name">{p["old_name"]}</div>',
            f'<div class="testimonial-pfp-name">{p["new_name"]}</div>',
        )
        if p["old_role"] != p["new_role"]:
            text = text.replace(
                f'<div class="testimonial-pfp-designation">{p["old_role"]}</div>',
                f'<div class="testimonial-pfp-designation">{p["new_role"]}</div>',
            )
    HTML.write_text(text, encoding="utf-8")
    print("html names updated")

    for p in PEOPLE:
        master = ASSETS / p["master"]
        if not master.exists():
            print("missing", master.name)
            continue
        with Image.open(master) as cur:
            size = cur.size
        print("gen", p["new_name"], "…")
        try:
            img = fetch(p["prompt"], p["seed"], size)
            write_jpg(img, master)
            for v in p["variants"]:
                vp = ASSETS / v
                # infer width
                if "-p-500" in v:
                    tw = 500
                else:
                    tw = size[0]
                th = int(round(size[1] * (tw / size[0])))
                write_jpg(img.resize((tw, th), Image.Resampling.LANCZOS), vp)
            print("  ok", p["master"])
        except Exception as e:
            print("  FAIL", e)


if __name__ == "__main__":
    main()
