"""Retry failed restores: URL-encode spaces, overwrite locked files via copy."""
from __future__ import annotations

import json
import shutil
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(r"f:\logo-brand\site\assets\cdn_prod_website-files_com")
LOG = Path(r"f:\logo-brand\scripts\.restore-cdn-log.json")


def cdn_url(path: Path) -> str:
    rel = path.relative_to(ROOT)
    site_id = rel.parts[0]
    filename = rel.name
    enc = urllib.parse.quote(filename)
    return f"https://cdn.prod.website-files.com/{site_id}/{enc}"


def restore(path: Path) -> str:
    url = cdn_url(path)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    if len(data) < 200:
        return "too-small"
    tmp = path.with_suffix(path.suffix + ".rstmp")
    tmp.write_bytes(data)
    try:
        tmp.replace(path)
    except PermissionError:
        with open(tmp, "rb") as src, open(path, "wb") as dst:
            shutil.copyfileobj(src, dst)
        tmp.unlink(missing_ok=True)
    return f"ok:{len(data)}"


def main():
    data = json.loads(LOG.read_text(encoding="utf-8"))
    fails = [Path(r["file"]) for r in data["results"] if not str(r["status"]).startswith("ok") and r["status"] != "skip-url"]
    print("retry", len(fails))
    ok = fail = 0
    for p in fails:
        if not p.exists() and "banner" in p.name:
            continue
        try:
            st = restore(p)
            print(st, p.name)
            ok += 1 if st.startswith("ok") else 0
            fail += 0 if st.startswith("ok") else 1
        except Exception as e:
            print("FAIL", p.name, e)
            fail += 1
    print("DONE ok", ok, "fail", fail)


if __name__ == "__main__":
    main()
