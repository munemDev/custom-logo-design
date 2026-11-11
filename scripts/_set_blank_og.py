from pathlib import Path
import re

BLANK = "https://logo-design-studio.netlify.app/assets/og-blank.png"
root = Path(r"f:\logo-brand\site")

# Insert blank og:image + twitter:image after og:title/description block, and force summary card
OG_BLOCK = (
    f'  <meta property="og:image" content="{BLANK}" />\n'
    f'  <meta name="twitter:image" content="{BLANK}" />\n'
    f'  <meta name="twitter:card" content="summary" />\n'
)

changed = []
for path in root.rglob("*.html"):
    text = path.read_text(encoding="utf-8", errors="ignore")
    original = text

    # remove any existing og/twitter image tags first
    text = re.sub(r'\s*<meta[^>]*(?:property|name)=["\'](?:og:image|twitter:image(?::src)?)["\'][^>]*/?>', "", text, flags=re.I)
    text = re.sub(
        r'\s*<meta\s+content="[^"]*"\s*\n?\s*property="og:image"\s*/?>',
        "",
        text,
        flags=re.I,
    )

    # normalize twitter:card to summary
    text = re.sub(
        r'(<meta[^>]*name=["\']twitter:card["\'][^>]*content=["\'])[^"\']+(["\'])',
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

    if 'property="og:image"' in text or "property='og:image'" in text:
        pass
    else:
        # inject after first og:description or og:title
        m = re.search(r'<meta[^>]*property=["\']og:description["\'][^>]*/?>', text, flags=re.I)
        if not m:
            m = re.search(r'<meta[^>]*property=["\']og:title["\'][^>]*/?>', text, flags=re.I)
        if m:
            insert_at = m.end()
            text = text[:insert_at] + "\n" + OG_BLOCK + text[insert_at:]
        else:
            # fallback after <title>
            m2 = re.search(r"</title>", text, flags=re.I)
            if m2:
                text = text[: m2.end()] + "\n" + OG_BLOCK + text[m2.end() :]

    if text != original:
        path.write_text(text, encoding="utf-8")
        changed.append(str(path.relative_to(root)))

print("changed", len(changed))
for c in changed[:30]:
    print(" ", c)
