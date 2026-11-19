"""Deploy Wiltshire Tutoring to the root of its GitHub Pages custom domain.

Source HTML/CSS already uses root-relative links (/css, /assets, /js), so
never rewrite those links to the old GitHub project preview subdirectory.
"""
from pathlib import Path
import os
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "_pages"
DOMAIN = "wiltshiretutors.com"
ASSET_VERSION = os.environ.get("GITHUB_SHA", "deploy")[:12]
PUBLIC_DIRS = ("areas", "assets", "blog", "css", "exams", "js", "subjects", "vendor")
PUBLIC_FILES = ("site.webmanifest", "robots.txt", "sitemap.xml")

if OUTPUT.exists():
    shutil.rmtree(OUTPUT)
OUTPUT.mkdir()

for directory in PUBLIC_DIRS:
    source = ROOT / directory
    if source.is_dir():
        shutil.copytree(source, OUTPUT / directory)

for source in ROOT.iterdir():
    if source.is_file() and (source.suffix == ".html" or source.name in PUBLIC_FILES):
        shutil.copy2(source, OUTPUT / source.name)

# Force fresh CSS/JS after every deployment. Keep all links at the domain root.
for page in OUTPUT.rglob("*.html"):
    html = page.read_text(encoding="utf-8")
    for asset in (
        "/css/global.css", "/css/pages.css", "/css/icons.css",
        "/js/site.js", "/js/form-security.js",
    ):
        html = html.replace(f'{asset}"', f'{asset}?v={ASSET_VERSION}"')
    page.write_text(html, encoding="utf-8")

# GitHub Pages custom domain. Keep this in the published artifact.
(OUTPUT / "CNAME").write_text(DOMAIN + "\n", encoding="utf-8")
(OUTPUT / ".nojekyll").touch()

pages = list(OUTPUT.rglob("*.html"))
assert len(pages) >= 50, f"Expected at least 50 HTML pages, got {len(pages)}"
for sample in ("index.html", "subjects/physics.html", "exams/ucat.html"):
    html = (OUTPUT / sample).read_text(encoding="utf-8")
    assert 'href="/css/global.css?v=' in html, f"Missing root CSS: {sample}"
    assert 'src="/js/site.js?v=' in html, f"Missing root JS: {sample}"
    assert 'href="/wiltshire-tutors/' not in html, f"Old preview links remain: {sample}"
    assert 'src="/wiltshire-tutors/' not in html, f"Old preview assets remain: {sample}"
    assert 'content="noindex, nofollow"' not in html, f"Preview noindex remains: {sample}"
assert 'url("/assets/icons/' in (OUTPUT / "css/icons.css").read_text(encoding="utf-8")
assert "Allow: /" in (OUTPUT / "robots.txt").read_text(encoding="utf-8")
assert DOMAIN in (OUTPUT / "sitemap.xml").read_text(encoding="utf-8")
assert (OUTPUT / "CNAME").read_text(encoding="utf-8").strip() == DOMAIN
print(f"Built {len(pages)} pages for https://{DOMAIN}/")
