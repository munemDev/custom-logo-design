"""
Vary EVERY site image ~30% while keeping exact pixel dimensions.

Strategy:
1) Group responsive siblings (-p-500, -p-800, ...) by master stem
2) Apply deterministic visual variation to the largest master
3) Resize varied master into every sibling at that file's exact size
4) Optionally try AI (pollinations) for photo masters when --ai is set

ChatGPT/Cursor GenerateImage is unavailable at this scale; Pollinations is used as AI backend.
"""
from __future__ import annotations

import argparse
import colorsys
import hashlib
import json
import re
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except Exception:
    pass

ROOT = Path(r"f:\logo-brand\site\assets")
MANIFEST = Path(r"f:\logo-brand\scripts\.vary-all-manifest.json")
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"}
SKIP_DIRS = {"generated"}  # re-include generated/team if --include-generated
SIZE_MARKERS = (
    "-p-500",
    "-p-800",
    "-p-1080",
    "-p-1600",
    "-p-2000",
    "-p-2600",
    "-p-3200",
)


def family_key(path: Path) -> str:
    name = path.name
    for m in SIZE_MARKERS:
        if m in name:
            return str(path.parent / name.split(m)[0])
    # strip extension for key
    return str(path.parent / path.stem)


def params_for(key: str) -> dict:
    h = int(hashlib.md5(key.encode("utf-8")).hexdigest()[:8], 16)
    return {
        "hue": ((h % 90) - 45),  # -45..+44 deg ~ noticeable
        "sat": 1.12 + (h % 25) / 100.0,  # 1.12..1.36
        "contrast": 1.10 + (h % 20) / 100.0,
        "brightness": 0.94 + (h % 16) / 100.0,
        "mirror": (h % 3 == 0),
        "crop": 0.05 + (h % 6) / 100.0,  # 5..10% crop = ~10-19% content shift
        "sharp": 60 + (h % 40),
        "warm": ((h % 21) - 10) / 100.0,  # color temp nudge
    }


def shift_hue(img: Image.Image, degrees: float) -> Image.Image:
    base = img.convert("RGBA")
    arr = np.asarray(base).astype(np.float32) / 255.0
    rgb = arr[..., :3]
    a = arr[..., 3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    df = mx - mn
    h = np.zeros_like(mx)
    mask = df != 0
    rmask = mask & (mx == r)
    gmask = mask & (mx == g)
    bmask = mask & (mx == b)
    h[rmask] = ((g - b) / df)[rmask] % 6
    h[gmask] = ((b - r) / df)[gmask] + 2
    h[bmask] = ((r - g) / df)[bmask] + 4
    h = h / 6.0
    s = np.zeros_like(mx)
    s[mx != 0] = df[mx != 0] / mx[mx != 0]
    v = mx
    h = (h + ((degrees % 360) / 360.0)) % 1.0
    hi = (h * 6).astype(np.int32) % 6
    f = h * 6 - np.floor(h * 6)
    p = v * (1 - s)
    q = v * (1 - f * s)
    t = v * (1 - (1 - f) * s)
    out = np.zeros_like(rgb)
    for i, (rr, gg, bb) in enumerate(
        [
            (v, t, p),
            (q, v, p),
            (p, v, t),
            (p, q, v),
            (t, p, v),
            (v, p, q),
        ]
    ):
        m = hi == i
        out[..., 0][m] = rr[m]
        out[..., 1][m] = gg[m]
        out[..., 2][m] = bb[m]
    rgba = np.dstack([np.clip(out, 0, 1), a])
    return Image.fromarray((rgba * 255).astype(np.uint8), "RGBA")


def apply_warmth(rgb: Image.Image, amount: float) -> Image.Image:
    """amount -0.1..0.1 — positive = warmer."""
    if abs(amount) < 0.001:
        return rgb
    r, g, b = rgb.split()
    if amount > 0:
        r = r.point(lambda i: min(255, int(i * (1 + amount * 1.2))))
        b = b.point(lambda i: max(0, int(i * (1 - amount))))
    else:
        a = -amount
        b = b.point(lambda i: min(255, int(i * (1 + a * 1.2))))
        r = r.point(lambda i: max(0, int(i * (1 - a))))
    return Image.merge("RGB", (r, g, b))


def vary_image(img: Image.Image, p: dict) -> Image.Image:
    has_alpha = img.mode in ("RGBA", "LA") or ("transparency" in img.info)
    base = img.convert("RGBA")
    w, h = base.size
    c = p["crop"]
    left, top = int(w * c), int(h * c)
    right, bottom = int(w * (1 - c)), int(h * (1 - c))
    if right - left < 8 or bottom - top < 8:
        cropped = base
    else:
        cropped = base.crop((left, top, right, bottom)).resize((w, h), Image.Resampling.LANCZOS)

    if p["mirror"]:
        cropped = ImageOps.mirror(cropped)

    cropped = shift_hue(cropped, p["hue"])
    rgb = cropped.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(p["sat"])
    rgb = ImageEnhance.Contrast(rgb).enhance(p["contrast"])
    rgb = ImageEnhance.Brightness(rgb).enhance(p["brightness"])
    rgb = apply_warmth(rgb, p["warm"])
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.1, percent=p["sharp"], threshold=2))

    if has_alpha and img.mode in ("RGBA", "LA", "P"):
        alpha = cropped.split()[-1]
        out = rgb.convert("RGBA")
        out.putalpha(alpha)
        return out
    return rgb.convert("RGB")


def save_like(path: Path, img: Image.Image, size: tuple[int, int]):
    import os
    import shutil
    import stat

    resized = img.resize(size, Image.Resampling.LANCZOS)
    suf = path.suffix.lower()
    tmp = path.with_name(path.name + ".varytmp")

    def write_tmp():
        if suf == ".png":
            resized.convert("RGBA").save(tmp, format="PNG", optimize=True)
        elif suf == ".webp":
            resized.convert("RGB").save(tmp, format="WEBP", quality=88, method=4)
        elif suf in {".jpg", ".jpeg"}:
            resized.convert("RGB").save(tmp, format="JPEG", quality=90, optimize=True)
        elif suf == ".gif":
            resized.convert("P", palette=Image.Palette.ADAPTIVE).save(tmp, format="GIF")
        elif suf == ".avif":
            try:
                resized.convert("RGB").save(tmp, format="AVIF", quality=80)
            except Exception:
                jpg = path.with_suffix(".jpg")
                resized.convert("RGB").save(jpg, format="JPEG", quality=90, optimize=True)
                if tmp.exists():
                    tmp.unlink(missing_ok=True)
                return "jpg-fallback:" + str(jpg)
        else:
            resized.convert("RGB").save(tmp, format="JPEG", quality=90, optimize=True)
        return None

    try:
        fb = write_tmp()
        if fb:
            return fb
        # Clear read-only and replace; fall back to copy if replace locked
        try:
            if path.exists():
                os.chmod(path, stat.S_IWRITE | stat.S_IREAD)
        except Exception:
            pass
        try:
            os.replace(tmp, path)
        except PermissionError:
            # overwrite in place via copy
            with open(tmp, "rb") as src, open(path, "wb") as dst:
                shutil.copyfileobj(src, dst)
            tmp.unlink(missing_ok=True)
        return "ok"
    except Exception as e:
        if tmp.exists():
            tmp.unlink(missing_ok=True)
        raise e


def collect_families(include_generated: bool) -> dict[str, list[Path]]:
    families: dict[str, list[Path]] = defaultdict(list)
    for p in ROOT.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in EXTS:
            continue
        rel = p.relative_to(ROOT)
        if not include_generated and rel.parts and rel.parts[0] in SKIP_DIRS:
            continue
        families[family_key(p)].append(p)
    return families


def largest(paths: list[Path]) -> Path:
    best = paths[0]
    best_area = 0
    for p in paths:
        try:
            with Image.open(p) as im:
                area = im.size[0] * im.size[1]
            if area >= best_area:
                best_area = area
                best = p
        except Exception:
            continue
    return best


def try_ai_vary(master: Path, size: tuple[int, int], out_path: Path) -> bool:
    """Pollinations text-to-image constrained to size; not true img2img but AI replacement."""
    w, h = size
    # cap request size for API
    req_w = min(max(w, 512), 1280)
    req_h = min(max(h, 512), 1280)
    # preserve aspect
    ar = w / max(h, 1)
    if req_w / req_h > ar:
        req_w = max(512, int(req_h * ar))
    else:
        req_h = max(512, int(req_w / ar))

    prompt = (
        "professional redesign of a brand website photo, same subject and framing, "
        "change colors lighting texture composition about thirty percent, "
        "photorealistic, high quality, no text, no watermark"
    )
    seed = int(hashlib.md5(str(master).encode()).hexdigest()[:6], 16)
    url = (
        "https://image.pollinations.ai/prompt/"
        + urllib.parse.quote(prompt)
        + f"?width={req_w}&height={req_h}&nologo=true&model=flux&seed={seed}"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=180) as resp:
            if resp.status != 200:
                return False
            ctype = resp.headers.get("content-type", "")
            if "image" not in ctype:
                return False
            data = resp.read()
        tmp = out_path.with_suffix(".ai-tmp.jpg")
        tmp.write_bytes(data)
        with Image.open(tmp) as im:
            im = im.convert("RGB").resize(size, Image.Resampling.LANCZOS)
            # crop watermark band
            ww, hh = im.size
            im = im.crop((0, 0, ww, int(hh * 0.96))).resize(size, Image.Resampling.LANCZOS)
            im.save(tmp, format="JPEG", quality=92)
        return True
    except Exception as e:
        print("  ai fail", master.name, e)
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ai", action="store_true", help="Try AI for each master (slow, rate-limited)")
    ap.add_argument("--ai-limit", type=int, default=0, help="Max masters to AI-vary (0=all if --ai)")
    ap.add_argument("--include-generated", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    families = collect_families(args.include_generated)
    print(f"families={len(families)} files={sum(len(v) for v in families.values())}")

    manifest = {"updated": [], "ai": [], "errors": [], "jpg_fallbacks": []}
    ai_count = 0

    items = sorted(families.items(), key=lambda kv: -max(
        (Image.open(p).size[0] * Image.open(p).size[1] for p in kv[1] if True),
        default=0,
    ) if False else 0)

    # simpler sort by family key
    items = sorted(families.items(), key=lambda kv: kv[0])

    for i, (key, paths) in enumerate(items, 1):
        master = largest(paths)
        try:
            with Image.open(master) as im:
                master_img = im.copy()
                master_size = im.size
        except Exception as e:
            manifest["errors"].append({"file": str(master), "error": str(e)})
            print(f"[{i}/{len(items)}] OPEN FAIL {master.name}: {e}")
            continue

        p = params_for(key)
        use_ai = False
        ai_tmp = master.with_suffix(".ai-tmp.jpg")

        if args.ai and (args.ai_limit <= 0 or ai_count < args.ai_limit):
            # only AI photos roughly (skip tiny UI)
            if master_size[0] >= 400 and master_size[1] >= 400:
                print(f"[{i}/{len(items)}] AI {master.name} {master_size}")
                if not args.dry_run and try_ai_vary(master, master_size, ai_tmp):
                    try:
                        with Image.open(ai_tmp) as aim:
                            varied = aim.convert(master_img.mode if master_img.mode in ("RGB", "RGBA") else "RGB")
                        use_ai = True
                        ai_count += 1
                        manifest["ai"].append(str(master))
                        time.sleep(46)  # free rate limit
                    except Exception:
                        use_ai = False
                if ai_tmp.exists():
                    ai_tmp.unlink(missing_ok=True)

        if not use_ai:
            print(f"[{i}/{len(items)}] VAR {master.name} {master_size} hue={p['hue']} crop={p['crop']:.2f}")
            if args.dry_run:
                continue
            varied = vary_image(master_img, p)
        else:
            if args.dry_run:
                continue

        for path in paths:
            try:
                with Image.open(path) as ex:
                    size = ex.size
                status = save_like(path, varied, size)
                if status and status.startswith("jpg-fallback:"):
                    manifest["jpg_fallbacks"].append(status)
                manifest["updated"].append({"file": str(path), "size": list(size), "ai": use_ai})
                print(f"  -> {path.name} {size[0]}x{size[1]}")
            except Exception as e:
                manifest["errors"].append({"file": str(path), "error": str(e)})
                print(f"  ERR {path.name}: {e}")

    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(
        "DONE",
        "updated",
        len(manifest["updated"]),
        "ai",
        len(manifest["ai"]),
        "errors",
        len(manifest["errors"]),
        "fallbacks",
        len(manifest["jpg_fallbacks"]),
    )


if __name__ == "__main__":
    main()
