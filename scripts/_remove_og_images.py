import re
from pathlib import Path

root = Path(r"f:\logo-brand\site")
patterns = [
    re.compile(r'\s*<meta[^>]*property=["\']og:image["\'][^>]*/?>', re.I),
    re.compile(r'\s*<meta[^>]*name=["\']og:image["\'][^>]*/?>', re.I),
    re.compile(r'\s*<meta[^>]*name=["\']twitter:image(?::src)?["\'][^>]*/?>', re.I),
    re.compile(r'\s*<meta[^>]*property=["\']twitter:image(?::src)?["\'][^>]*/?>', re.I),
    # multiline og:image like homepage
    re.compile(
        r'\s*<meta\s+content="[^"]*preview\.png"\s*\n?\s*property="og:image"\s*/?>',
        re.I,
    ),
]

changed = []
for path in root.rglob("*.html"):
    text = path.read_text(encoding="utf-8", errors="ignore")
    original = text
    for pat in patterns:
        text = pat.sub("", text)
    # If twitter card was large image, downgrade
    text = re.sub(
        r'(<meta[^>]*name=["\']twitter:card["\'][^>]*content=["\'])summary_large_image(["\'])',
        r"\1summary\2",
        text,
        flags=re.I,
    )
    text = re.sub(
        r'(<meta[^>]*content=["\'])summary_large_image(["\'][^>]*name=["\']twitter:card["\'])',
        r"\1summary\2",
        text,
        flags=re.I,
    )
    if text != original:
        path.write_text(text, encoding="utf-8")
        changed.append(str(path.relative_to(root)))

print(f"updated {len(changed)} files")
for c in changed:
    print(" ", c)
