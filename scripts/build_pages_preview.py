"""Create the GitHub Pages preview under /wiltshire-tutors/ without altering production files."""
from pathlib import Path
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '_pages'
BASE = '/wiltshire-tutors'
PUBLIC_DIRS = ('areas', 'assets', 'blog', 'css', 'exams', 'js', 'subjects', 'vendor')

if OUTPUT.exists():
    shutil.rmtree(OUTPUT)
OUTPUT.mkdir()
for directory in PUBLIC_DIRS:
    source = ROOT / directory
    if source.is_dir():
        shutil.copytree(source, OUTPUT / directory)
for item in ROOT.iterdir():
    if item.is_file() and (item.suffix == '.html' or item.name in ('site.webmanifest', 'robots.txt', 'sitemap.xml')):
        shutil.copy2(item, OUTPUT / item.name)

# Root-absolute links on a normal domain need the repository prefix on GitHub Pages.
attribute_path = re.compile(r'''(?P<start>\b(?:href|src|action|poster|data-src|srcset)\s*=\s*["'])/(?!/)''', re.I)
css_path = re.compile(r'''url\(\s*(?P<quote>["']?)/(?!/)''', re.I)
for page in OUTPUT.rglob('*.html'):
    html = page.read_text(encoding='utf-8')
    html = attribute_path.sub(lambda m: m['start'] + BASE + '/', html)
    # Prevent test-domain pages competing with the real domain for organic search.
    html = html.replace('</head>', '  <meta name="robots" content="noindex, nofollow">\n</head>', 1)
    # Share preview URLs and social images from Pages, not an unpublished production domain.
    html = html.replace('content="https://wiltshiretutors.com/assets/', 'content="https://cleandesignuk.github.io' + BASE + '/assets/')
    html = html.replace('property="og:url" content="https://wiltshiretutors.com',
                        'property="og:url" content="https://cleandesignuk.github.io' + BASE)
    page.write_text(html, encoding='utf-8')

for stylesheet in (OUTPUT / 'css').glob('*.css'):
    css = stylesheet.read_text(encoding='utf-8')
    css = css_path.sub(lambda m: 'url(' + m['quote'] + BASE + '/', css)
    stylesheet.write_text(css, encoding='utf-8')

manifest_path = OUTPUT / 'site.webmanifest'
if manifest_path.exists():
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    if manifest.get('start_url', '').startswith('/'):
        manifest['start_url'] = BASE + manifest['start_url']
    manifest['scope'] = BASE + '/'
    for icon in manifest.get('icons', []):
        if icon.get('src', '').startswith('/'):
            icon['src'] = BASE + icon['src']
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

# This is only a preview. Keep Google from indexing it as a duplicate of the main domain.
(OUTPUT / 'robots.txt').write_text('User-agent: *\nDisallow: /\n', encoding='utf-8')
(OUTPUT / '.nojekyll').touch()
# Avoid a misleading sitemap advertising the production URLs from the preview.
(OUTPUT / 'sitemap.xml').unlink(missing_ok=True)

pages = list(OUTPUT.rglob('*.html'))
assert len(pages) >= 50, f'Expected at least 50 pages, got {len(pages)}'
for sample in ('index.html', 'subjects/physics.html', 'exams/ucat.html'):
    html = (OUTPUT / sample).read_text(encoding='utf-8')
    assert f'href="{BASE}/' in html and f'src="{BASE}/' in html, sample
assert f'{BASE}/assets/icons/' in (OUTPUT / 'css/icons.css').read_text(encoding='utf-8')
print(f'Built {len(pages)} HTML pages for https://cleandesignuk.github.io{BASE}/')