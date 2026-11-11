from pathlib import Path
import re

root = Path(r"f:\logo-brand\site")

# path relative to site (posix) -> (title, description)
META = {
    ".": (
        "Logo Design | Custom Logos & Brand Identity Studio",
        "Custom logo design, brand identity and visual systems built for startups and growing businesses. Clear packages, fast delivery, full ownership.",
    ),
    "about": (
        "About Us | Logo Design Studio",
        "Meet the Logo Design team. A boutique studio crafting distinctive logos, brand systems and digital visuals with strategy and sharp attention to detail.",
    ),
    "work": (
        "Work | Logo Design Portfolio",
        "Selected logo and brand identity projects by Logo Design. See how we shape marks, systems and visuals for real businesses.",
    ),
    "pricing": (
        "Pricing | Logo Design Packages",
        "Transparent logo, branding, website and motion packages. Compare Bronze to Platinum plans and start your brief in minutes.",
    ),
    "brief": (
        "Project Brief | Logo Design",
        "Start your custom logo brief in a few clear steps. Share your company name, industry and style — we’ll take it from there.",
    ),
    "401": (
        "Protected Page | Logo Design",
        "This page is protected. Please sign in or return to Logo Design.",
    ),
    "404": (
        "Page Not Found | Logo Design",
        "The page you’re looking for isn’t here. Head back to Logo Design to explore work, pricing and start a brief.",
    ),
    "work/heygluco": (
        "HeyGluco | Logo Design Case Study",
        "Logo and brand identity case study for HeyGluco by Logo Design — health and wellness branding with a clean, distinctive mark.",
    ),
    "work/bagel-bar": (
        "The Bagel Bar | Logo Design Case Study",
        "Visual identity case study for The Bagel Bar by Logo Design — food and beverage branding with appetite and character.",
    ),
    "work/tanti-maria": (
        "Tanti Maria | Logo Design Case Study",
        "Brand identity case study for Tanti Maria by Logo Design — food and retail branding with warmth and personality.",
    ),
    "work/munchies-and-cream": (
        "Munchies and Cream | Logo Design Case Study",
        "Logo and brand design case study for Munchies and Cream by Logo Design — playful food and beverage identity.",
    ),
    "work/mvp": (
        "MVP | Logo Design Case Study",
        "Sports and talent management brand identity case study for MVP by Logo Design.",
    ),
    "work/yum-yum": (
        "Yum Yum | Logo Design Case Study",
        "Food and beverage logo case study for Yum Yum by Logo Design — bold, memorable brand mark.",
    ),
    "work/lpi": (
        "LPI | Logo Design Case Study",
        "Brand identity case study for LPI by Logo Design — custom logo and visual system.",
    ),
    "work/merci": (
        "Merci | Logo Design Case Study",
        "Brand identity case study for Merci by Logo Design — refined logo and visual direction.",
    ),
}


def set_meta_attr(tag: str, content: str) -> str:
    if re.search(r'content=["\']', tag, re.I):
        return re.sub(r'content=["\'].*?["\']', f'content="{content}"', tag, count=1, flags=re.I | re.S)
    # insert content
    return tag[:-1].rstrip() + f' content="{content}"' + ("/" if tag.rstrip().endswith("/") else "") + ">"


def upsert_meta(html: str, *, title: str, description: str) -> str:
    # title
    if re.search(r"<title>.*?</title>", html, flags=re.I | re.S):
        html = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", html, count=1, flags=re.I | re.S)
    else:
        html = re.sub(r"<head[^>]*>", lambda m: m.group(0) + f"\n  <title>{title}</title>", html, count=1, flags=re.I)

    def replace_or_insert(pattern: str, build: str, after_title: bool = True) -> None:
        nonlocal html
        m = re.search(pattern, html, flags=re.I | re.S)
        if m:
            html = html[: m.start()] + build + html[m.end() :]
        else:
            anchor = re.search(r"</title>", html, flags=re.I)
            if anchor:
                html = html[: anchor.end()] + "\n  " + build + html[anchor.end() :]
            else:
                html = re.sub(r"<head[^>]*>", lambda mm: mm.group(0) + "\n  " + build, html, count=1, flags=re.I)

    # description
    m = re.search(r'<meta[^>]*name=["\']description["\'][^>]*>', html, flags=re.I | re.S)
    if m:
        html = html[: m.start()] + f'<meta name="description" content="{description}" />' + html[m.end() :]
    else:
        replace_or_insert(r"<never>", f'<meta name="description" content="{description}" />')

    # og:title
    m = re.search(r'<meta[^>]*property=["\']og:title["\'][^>]*>', html, flags=re.I | re.S)
    if m:
        html = html[: m.start()] + f'<meta property="og:title" content="{title}" />' + html[m.end() :]
    else:
        replace_or_insert(r"<never>", f'<meta property="og:title" content="{title}" />')

    # og:description
    m = re.search(r'<meta[^>]*property=["\']og:description["\'][^>]*>', html, flags=re.I | re.S)
    if m:
        html = html[: m.start()] + f'<meta property="og:description" content="{description}" />' + html[m.end() :]
    else:
        replace_or_insert(r"<never>", f'<meta property="og:description" content="{description}" />')

    # twitter:title
    m = re.search(r'<meta[^>]*name=["\']twitter:title["\'][^>]*>', html, flags=re.I | re.S)
    if m:
        html = html[: m.start()] + f'<meta name="twitter:title" content="{title}" />' + html[m.end() :]
    else:
        replace_or_insert(r"<never>", f'<meta name="twitter:title" content="{title}" />')

    # twitter:description
    m = re.search(r'<meta[^>]*name=["\']twitter:description["\'][^>]*>', html, flags=re.I | re.S)
    if m:
        html = html[: m.start()] + f'<meta name="twitter:description" content="{description}" />' + html[m.end() :]
    else:
        replace_or_insert(r"<never>", f'<meta name="twitter:description" content="{description}" />')

    return html


changed = []
for path in sorted(root.rglob("index.html")):
    rel = path.parent.relative_to(root).as_posix()
    key = "." if rel == "." else rel
    if key not in META:
        # default for unknown pages
        title, desc = (
            "Logo Design | Boutique Design Studio",
            "Custom logo design and brand identity by Logo Design. Clear packages, sharp marks, full ownership.",
        )
    else:
        title, desc = META[key]

    text = path.read_text(encoding="utf-8", errors="ignore")
    new = upsert_meta(text, title=title, description=desc)
    if new != text:
        path.write_text(new, encoding="utf-8")
        changed.append(f"{key}: {title}")

print(f"updated {len(changed)} pages")
for c in changed:
    print(" ", c)
