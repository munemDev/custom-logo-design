"""
1) Replace ~10% of hero banner stills with fresh brand photos (Unsplash)
2) Append more showcase slides from existing project case images
"""
from __future__ import annotations

import io
import re
import shutil
import ssl
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(r"f:\logo-brand")
SITE = ROOT / "site"
HTML = SITE / "index.html"
SHOT_DIR = SITE / "assets" / "cdn_prod_website-files_com" / "6aaad679fdb9d914f7f52049"
CASE_DIR = SITE / "assets" / "cdn_prod_website-files_com" / "6aaad679fdb9d914f7f5203c"

ctx = ssl.create_default_context()

# ~10% swap of banner still images (Shot 2, 4, 5 — leave videos alone)
SWAPS = [
    {
        "master": "6ab263498b14a38a7a109afc_Shot 2.jpg",
        "variants": [
            ("6ab263498b14a38a7a109afc_Shot 2-p-500.jpg", 500),
            ("6ab263498b14a38a7a109afc_Shot 2-p-800.jpg", 800),
            ("6ab263498b14a38a7a109afc_Shot 2-p-1080.jpg", 1080),
        ],
        "url": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1200&h=1200&q=85",
    },
    {
        "master": "6ab2633da8fa39ec5216880b_Shot 4.jpg",
        "variants": [
            ("6ab2633da8fa39ec5216880b_Shot 4-p-500.jpg", 500),
            ("6ab2633da8fa39ec5216880b_Shot 4-p-800.jpg", 800),
            ("6ab2633da8fa39ec5216880b_Shot 4-p-1080.jpg", 1080),
        ],
        "url": "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&h=1200&q=85",
    },
    {
        "master": "6ab2633d3e5b6a35a15d74d7_Shot 5.jpg",
        "variants": [
            ("6ab2633d3e5b6a35a15d74d7_Shot 5-p-500.jpg", 500),
            ("6ab2633d3e5b6a35a15d74d7_Shot 5-p-800.jpg", 800),
            ("6ab2633d3e5b6a35a15d74d7_Shot 5-p-1080.jpg", 1080),
        ],
        "url": "https://images.unsplash.com/photo-1635405074683-96d6921a2a68?auto=format&fit=crop&w=1200&h=1200&q=85",
    },
]

# Extra slides pulled from existing case study imagery already on site
EXTRA_SLIDES = [
    "6ab391a7175b4ccd0e8c2c99_cover bagel.jpg",
    "6ab270be80849a0a23faa239_6ab27087a6716c1b6c77a96a_merci_Thumbnail1.jpeg",
    "6ab2723d53bb370f04afa381_6ab2721e4694c5c1d617273d_Munchies_1.jpeg",
    "6ab270be80849a0a23faa284_6ab270907f6e9d96146209a1_MVP_Thumbnail1.jpeg",
    "6ab393770c697e34bcc4e4fb_Vertical6.jpg",
    "6ab2723d53bb370f04afa37d_6ab272335c44422412d81fb1_YumYum_1.jpeg",
]


def fetch_img(url: str) -> Image.Image:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=90, context=ctx) as resp:
        data = resp.read()
    im = Image.open(io.BytesIO(data)).convert("RGB")
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return im.crop((left, top, left + side, top + side))


def write_atomic(img: Image.Image, path: Path, fmt: str = "JPEG") -> None:
    tmp = path.with_suffix(path.suffix + ".swap-tmp")
    if fmt == "JPEG":
        img.convert("RGB").save(tmp, format="JPEG", quality=90)
    else:
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


def swap_shots() -> None:
    for item in SWAPS:
        master = SHOT_DIR / item["master"]
        if not master.exists():
            print("missing", master.name)
            continue
        with Image.open(master) as cur:
            size = cur.size
        print("swap", master.name)
        img = fetch_img(item["url"]).resize(size, Image.Resampling.LANCZOS)
        write_atomic(img, master)
        for name, tw in item["variants"]:
            th = int(round(size[1] * (tw / size[0])))
            write_atomic(img.resize((tw, th), Image.Resampling.LANCZOS), SHOT_DIR / name)


def add_slider_slides() -> None:
    html = HTML.read_text(encoding="utf-8")
    if "banner-extra-slide" in html:
        print("extra slides already present")
        return

    blocks = []
    for name in EXTRA_SLIDES:
        src = CASE_DIR / name
        if not src.exists():
            print("skip missing case img", name)
            continue
        # web path
        rel = f"/assets/cdn_prod_website-files_com/6aaad679fdb9d914f7f5203c/{name}"
        # encode spaces
        rel_enc = rel.replace(" ", "%20")
        blocks.append(
            f'<div class="showcase-slide banner-extra-slide"><img src="{rel_enc}" '
            f'loading="lazy" alt="" class="showcase-slide-img" /></div>'
        )

    if not blocks:
        print("no extras")
        return

    inject = "\n".join(blocks)
    # insert before closing </div> of showcase-slider (after Shot 6)
    marker = 'alt="" class="showcase-slide-img" /></div>\n                </div>\n              </div>\n            </section>'
    # more robust: find last showcase-slide before showcase-slider close
    m = re.search(
        r'(</div>\s*)(</div>\s*</div>\s*</section>\s*</div>\s*<div class="hero-path-svg-left">)',
        html,
    )
    if not m:
        # fallback near Shot 6
        needle = '6ab2634dc8995221637e120c_Shot%206.png"\n                      alt="" class="showcase-slide-img" /></div>'
        if needle not in html:
            # try without newline quirks
            idx = html.rfind('class="showcase-slide-img" /></div>')
            if idx == -1:
                raise SystemExit("cannot find inject point")
            # find end of that slide
            end = idx + len('class="showcase-slide-img" /></div>')
            html = html[:end] + "\n" + inject + html[end:]
        else:
            html = html.replace(needle, needle + "\n" + inject, 1)
    else:
        html = html[: m.start(1)] + m.group(1) + inject + "\n" + m.group(2) + html[m.end() :]

    HTML.write_text(html, encoding="utf-8")
    print("added", len(blocks), "banner slides")


def main() -> None:
    swap_shots()
    add_slider_slides()


if __name__ == "__main__":
    main()
