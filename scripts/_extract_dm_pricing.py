import re
from pathlib import Path

html = Path(r"f:\logo-brand\_dm.html").read_text(encoding="utf-8", errors="ignore")
srcs = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html)
print("SCRIPTS:")
for s in srcs:
    print(" ", s)

for needle in ["Bronze", "logo-bronze", "homePricing", "pricingCatalog", "What you get", "2 Logo Concepts"]:
    print(needle, "->", html.find(needle))

# dump nearby script tags with pricing
for m in re.finditer(r"<script[^>]*>([\s\S]*?)</script>", html):
    body = m.group(1)
    if any(k in body for k in ("Bronze", "homePricing", "data-service", "packages", "Static", "checks")):
        print("\n=== SCRIPT CHUNK", m.start(), "len", len(body), "===")
        print(body[:4000])
