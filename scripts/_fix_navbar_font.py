from pathlib import Path

root = Path(r"f:\logo-brand\site")
needle = 'font-family:"Syne", var(--font-primary), Impact, sans-serif !important;'
repl = 'font-family:var(--font-primary), "Mdnichrometest", Impact, sans-serif !important;'
needle2 = 'font-family: "Syne", var(--font-primary), Impact, sans-serif !important;'
# also letter-spacing / weight tweaks near it if present as Syne block - handled separately on homepage

changed = []
for path in root.rglob("*.html"):
    text = path.read_text(encoding="utf-8")
    original = text
    text = text.replace(needle, repl)
    text = text.replace(needle2, repl)
    if text != original:
        path.write_text(text, encoding="utf-8")
        changed.append(str(path.relative_to(root)))

print("changed", len(changed))
for c in changed:
    print(" ", c)
