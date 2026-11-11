from pathlib import Path
import re

root = Path(r"f:\logo-brand\site")
for path in sorted(root.rglob("index.html")):
    t = path.read_text(encoding="utf-8", errors="ignore")
    title = re.search(r"<title>(.*?)</title>", t, re.I | re.S)
    desc = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']', t, re.I | re.S)
    if not desc:
        desc = re.search(r'<meta[^>]*content=["\'](.*?)["\'][^>]*name=["\']description["\']', t, re.I | re.S)
    print(path.parent.relative_to(root).as_posix() or ".")
    print(" ", title.group(1).strip() if title else "-")
    print(" ", (desc.group(1)[:100] + "...") if desc and len(desc.group(1)) > 100 else (desc.group(1) if desc else "-"))
    if "Bucharest" in t[:2500]:
        print("  !! Bucharest still in head area")
