from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(r"f:\logo-brand\site")
src = (ROOT / "index.html").read_text(encoding="utf-8")
m = re.search(
    r'<style id="section-heading-two-tone-css">.*?</style>',
    src,
    re.S,
)
if not m:
    raise SystemExit("no css")
css = m.group(0)
n = 0
for p in ROOT.rglob("*.html"):
    if p == ROOT / "index.html":
        continue
    t = p.read_text(encoding="utf-8", errors="ignore")
    if 'id="section-heading-two-tone-css"' in t:
        t2 = re.sub(
            r'<style id="section-heading-two-tone-css">.*?</style>',
            css,
            t,
            count=1,
            flags=re.S,
        )
        if t2 != t:
            p.write_text(t2, encoding="utf-8")
            n += 1
            print("synced", p.relative_to(ROOT))
    elif "section-heading" in t and "</head>" in t:
        p.write_text(t.replace("</head>", css + "\n</head>", 1), encoding="utf-8")
        n += 1
        print("added", p.relative_to(ROOT))
print("done", n)
