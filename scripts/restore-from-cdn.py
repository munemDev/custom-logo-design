"""Restore overwritten assets from Webflow CDN originals."""
from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(r"f:\logo-brand\site\assets\cdn_prod_website-files_com")
MANIFEST = Path(r"f:\logo-brand\scripts\.vary-all-manifest.json")
LOG = Path(r"f:\logo-brand\scripts\.restore-cdn-log.json")


def cdn_url(path: Path) -> str | None:
    try:
        rel = path.relative_to(ROOT)
    except ValueError:
        return None
    parts = rel.parts
    if len(parts) < 2:
        return None
    site_id = parts[0]
    filename = parts[-1]
    # file id is prefix before first underscore usually, but full filename is in CDN path
    return f"https://cdn.prod.website-files.com/{site_id}/{filename}"


def restore(path: Path) -> str:
    url = cdn_url(path)
    if not url:
        return "skip-url"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    if len(data) < 200:
        return "too-small"
    tmp = path.with_suffix(path.suffix + ".restoretmp")
    tmp.write_bytes(data)
    tmp.replace(path)
    return f"ok:{len(data)}"


def main():
    files = []
    if MANIFEST.exists():
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        for item in data.get("updated", []):
            p = Path(item["file"])
            if p.exists():
                files.append(p)
            # also restore siblings with -p- sizes in same family
            stem = p.name
            for m in ("-p-500", "-p-800", "-p-1080", "-p-1600", "-p-2000", "-p-2600", "-p-3200"):
                if m in stem:
                    stem = stem.split(m)[0]
                    break
            if p.parent.exists():
                for sib in p.parent.glob(stem + "*"):
                    if sib.is_file() and sib not in files:
                        files.append(sib)

    # unique
    uniq = []
    seen = set()
    for f in files:
        s = str(f.resolve())
        if s not in seen:
            seen.add(s)
            uniq.append(f)

    print("restoring", len(uniq), "files")
    ok = fail = 0
    results = []
    for i, path in enumerate(uniq, 1):
        try:
            status = restore(path)
            print(f"[{i}/{len(uniq)}] {status} {path.name}")
            if status.startswith("ok"):
                ok += 1
            else:
                fail += 1
            results.append({"file": str(path), "status": status})
            time.sleep(0.05)
        except Exception as e:
            fail += 1
            print(f"[{i}/{len(uniq)}] FAIL {path.name} {e}")
            results.append({"file": str(path), "status": f"fail:{e}"})

    LOG.write_text(json.dumps({"ok": ok, "fail": fail, "results": results}, indent=2), encoding="utf-8")
    print("DONE ok", ok, "fail", fail)


if __name__ == "__main__":
    main()
