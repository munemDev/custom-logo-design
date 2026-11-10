"""Retry only files that failed in the last vary-all run."""
from __future__ import annotations

import importlib.util
import json
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location(
    "vary_all_images", HERE / "vary-all-images.py"
)
mod = importlib.util.module_from_spec(spec)
sys.modules["vary_all_images"] = mod
spec.loader.exec_module(mod)

MANIFEST = HERE / ".vary-all-manifest.json"


def main():
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    errors = [Path(e["file"]) for e in data.get("errors", [])]
    print("retrying", len(errors))

    fam = defaultdict(list)
    for p in errors:
        if p.exists():
            fam[mod.family_key(p)].append(p)

    ok = 0
    fail = []
    for key, paths in fam.items():
        folder = paths[0].parent
        members = [f for f in folder.iterdir() if f.is_file() and mod.family_key(f) == key]
        if not members:
            members = paths
        master = mod.largest(members)
        with Image.open(master) as im:
            master_img = im.copy()
        p = mod.params_for(key)
        varied = mod.vary_image(master_img, p)
        for path in paths:
            try:
                with Image.open(path) as ex:
                    size = ex.size
                mod.save_like(path, varied, size)
                print("ok", path.name, size)
                ok += 1
            except Exception as e:
                print("FAIL", path.name, e)
                fail.append({"file": str(path), "error": str(e)})

    data["retry_ok"] = ok
    data["retry_errors"] = fail
    MANIFEST.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print("DONE ok", ok, "fail", len(fail))


if __name__ == "__main__":
    main()
