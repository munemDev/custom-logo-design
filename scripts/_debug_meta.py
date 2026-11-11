from pathlib import Path
import re

p = Path(r"f:\logo-brand\site\index.html")
t = p.read_text(encoding="utf-8")
print("title:", re.search(r"<title>(.*?)</title>", t, re.I | re.S).group(1))
m = re.search(r'<meta[^>]*name=["\']description["\'][^>]*/?>', t, flags=re.I | re.S)
print("desc:", m.group(0) if m else None)
# show first 25 lines
print("--- head ---")
print("\n".join(t.splitlines()[:25]))
