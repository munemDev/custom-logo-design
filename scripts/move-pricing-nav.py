"""Remove Monday–Friday timing; move Pricing tab into navbar-right."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(r"f:\logo-brand\site")

# Remove pricing from left links cluster (simple link variant used on index)
LEFT_PRICING = re.compile(
    r'<a href="/pricing" class="navbar-link-btn w-inline-block"><div class="navlink-text">Pricing</div></a>',
    re.I,
)

TIMING = re.compile(
    r'<div class="navbar-timing">[^<]*</div>',
    re.I,
)

PRICING_RIGHT = (
    '<a href="/pricing" class="navbar-link-btn navbar-link-btn--right w-inline-block">'
    '<div class="navlink-text">Pricing</div></a>'
)


def patch(html: str) -> str:
    # Only strip left pricing that sits inside .navbar-links (before logo),
    # not the hamburger menu copy which is fine to keep.
    # Heuristic: replace first occurrence in desktop nav only by limiting
    # to content before ham-navbar / hamburger-links when present.
    cut = html.find('class="ham-navbar"')
    if cut == -1:
        cut = html.find("hamburger-links")
    head = html if cut == -1 else html[:cut]
    tail = "" if cut == -1 else html[cut:]

    # Remove left Pricing once from desktop header region
    head2, n = LEFT_PRICING.subn("", head, count=1)
    if n == 0:
        # alternate spacing / multiline
        head2, n = re.subn(
            r'<a href="/pricing"[^>]*>\s*<div class="navlink-text">Pricing</div>\s*</a>',
            "",
            head,
            count=1,
            flags=re.I,
        )

    # Replace timing with Pricing (once)
    if TIMING.search(head2):
        head2 = TIMING.sub(PRICING_RIGHT, head2, count=1)
    elif "navbar-link-btn--right" not in head2 and "navbar-right" in head2:
        head2 = head2.replace(
            '<div class="navbar-right">',
            f'<div class="navbar-right">{PRICING_RIGHT}',
            1,
        )

    return head2 + tail


def main() -> None:
    n = 0
    for path in ROOT.rglob("*.html"):
        t = path.read_text(encoding="utf-8", errors="ignore")
        if "navbar-timing" not in t and 'href="/pricing"' not in t:
            continue
        if "navbar-wrap" not in t:
            continue
        t2 = patch(t)
        if t2 != t:
            path.write_text(t2, encoding="utf-8")
            n += 1
            print("updated", path.relative_to(ROOT))
    print("files", n)


if __name__ == "__main__":
    main()
