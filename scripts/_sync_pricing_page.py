from pathlib import Path
import re

home = Path(r"f:\logo-brand\site\index.html").read_text(encoding="utf-8")
s = home.find('<section class="section-pricing" id="pricing"')
e = home.find('<section class="section-services">', s)
section = home[s:e]
# ensure section ends with closing tag
if not section.rstrip().endswith("</section>"):
    # home slice ends before next section, includes closing </section>
    pass

pricing_path = Path(r"f:\logo-brand\site\pricing\index.html")
text = pricing_path.read_text(encoding="utf-8")
ps = text.find('<section class="section-pricing" id="pricing"')
if ps < 0:
    raise SystemExit("pricing section missing")

pe = None
idx = ps
while True:
    nxt = text.find("<section", idx + 1)
    if nxt < 0:
        close = text.find("</section>", ps)
        pe = close + len("</section>") if close > 0 else None
        break
    close = text.rfind("</section>", ps, nxt)
    if close > ps:
        pe = close + len("</section>")
        break
    idx = nxt

print("pricing bounds", ps, pe)
if pe:
    pricing_path.write_text(text[:ps] + section.rstrip() + "\n" + text[pe:], encoding="utf-8")
    print("ok", len(section))
