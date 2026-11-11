"""Split section/footer headings: first half words black, second half orange. Unify size."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(r"f:\logo-brand\site")

CSS = """
  <style id="section-heading-two-tone-css">
    .section-heading,
    .section-heading.less-max-w,
    .section-heading.left-align,
    .section-heading.white,
    h2.section-heading {
      font-size: clamp(2.6rem, 7.2vw, 6.25rem) !important;
      line-height: 0.85 !important;
      color: #111 !important;
    }
    .section-heading .heading-accent,
    .footer-heading .heading-accent {
      color: #ff5400 !important;
    }
    .footer-heading {
      font-size: clamp(2.2rem, 6vw, 5rem) !important;
    }
  </style>
"""

HEADING_RE = re.compile(
    r'(<(?:h2|h3)\s+class="[^"]*?(?:section-heading|footer-heading)[^"]*"[^>]*>)(.*?)(</(?:h2|h3)>)',
    re.I | re.S,
)


def split_two_tone(text: str) -> str:
    raw = (
        text.replace("&#x27;", "'")
        .replace("&apos;", "'")
        .replace("&amp;", "&")
        .replace("&nbsp;", " ")
    )
    words = [w for w in raw.split() if w]
    if len(words) < 2:
        return text
    mid = len(words) // 2
    first = " ".join(words[:mid]).replace("'", "&#x27;")
    second = " ".join(words[mid:]).replace("'", "&#x27;")
    return f'{first} <span class="heading-accent">{second}</span>'


def repl(m: re.Match) -> str:
    open_t, inner, close_t = m.group(1), m.group(2), m.group(3)
    if "heading-accent" in inner:
        return m.group(0)
    plain = re.sub(r"<[^>]+>", "", inner).strip()
    if not plain:
        return m.group(0)
    return open_t + split_two_tone(plain) + close_t


def main() -> None:
    n = 0
    for path in ROOT.rglob("*.html"):
        t = path.read_text(encoding="utf-8", errors="ignore")
        orig = t
        t2 = HEADING_RE.sub(repl, t)
        if "section-heading-two-tone-css" not in t2 and (
            "section-heading" in t2 or "footer-heading" in t2
        ):
            if "</head>" in t2:
                t2 = t2.replace("</head>", CSS + "</head>", 1)
            else:
                t2 = CSS + t2
        if t2 != orig:
            path.write_text(t2, encoding="utf-8")
            n += 1
            print("updated", path.relative_to(ROOT))
    print("files", n)


if __name__ == "__main__":
    main()
