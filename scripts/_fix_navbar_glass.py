from pathlib import Path
import re

root = Path(r"f:\logo-brand\site")
changed = []

for path in root.rglob("*.html"):
    if path.name != "index.html" and "index.html" not in str(path):
        continue
    text = path.read_text(encoding="utf-8")
    original = text

    # bump header z-index wherever navbar-enhance style exists
    text = re.sub(
        r"(\.header\s*\{[^}]*?z-index\s*:\s*)\d+(\s*!important)?",
        r"\g<1>99999 !important",
        text,
        count=1,
        flags=re.S,
    )
    # also compact one-line versions like z-index:50;
    text = text.replace("z-index:50;", "z-index:99999 !important;")
    text = text.replace("z-index: 50;", "z-index: 99999 !important;")

    # stronger glass on navbar-wrap backgrounds that still look opaque
    text = text.replace(
        "background:rgba(253, 248, 245, 0.78) !important;",
        "background:rgba(255, 250, 247, 0.42) !important;",
    )
    text = text.replace(
        "background: rgba(253, 248, 245, 0.78) !important;",
        "background: rgba(255, 250, 247, 0.42) !important;",
    )
    text = text.replace(
        "backdrop-filter:blur(16px) saturate(1.2);",
        "backdrop-filter:blur(22px) saturate(1.45);",
    )
    text = text.replace(
        "-webkit-backdrop-filter:blur(16px) saturate(1.2);",
        "-webkit-backdrop-filter:blur(22px) saturate(1.45);",
    )
    text = text.replace(
        "backdrop-filter: blur(16px) saturate(1.2);",
        "backdrop-filter: blur(22px) saturate(1.45);",
    )
    text = text.replace(
        "-webkit-backdrop-filter: blur(16px) saturate(1.2);",
        "-webkit-backdrop-filter: blur(22px) saturate(1.45);",
    )

    if text != original:
        path.write_text(text, encoding="utf-8")
        changed.append(str(path.relative_to(root)))

print("changed", len(changed))
for c in changed:
    print(" ", c)
