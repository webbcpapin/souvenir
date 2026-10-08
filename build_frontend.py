"""Bangun katalog dari HTML vscode.zip tanpa mengganti CSS asli."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent
APP = 'https://script.google.com/macros/s/AKfycbx3nGCpNcyp6uIUXtczvOi8NvoRnjYY2F9KcEVhDtDGm-ht5yFw8hAIfiQLr_mxa_P5/exec'
ASSETS = 'https://webbcpapin.github.io/souvenir/'
seed = json.loads(re.search(r'const INITIAL_ITEMS = (\[.*\]);', (ROOT/'apps-script/Seed.gs').read_text(encoding='utf-8'), re.S)[1])
source = (ROOT/'frontend-source/tengah.html').read_text(encoding='utf-8')
source = source.replace('url(" bgawal.jpeg")', 'url("bgawal.jpeg")').replace('href="../index.html"', 'href="index.html"')
source = re.sub(r'<script>.*?</script>', '', source, flags=re.S)
card_number = 0
def card_controls(match):
    global card_number
    item = seed[card_number]
    card_number += 1
    tag = match[0].replace('<a href="#"', '<article', 1)
    name = item['name'].replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')
    tag = tag.replace('class="menu-card', f'data-code="{item["code"]}" data-seed-name="{name}" class="menu-card', 1)
    controls = '<div class="card-actions">'+''.join(f'<button type="button" data-action="{kind}">{label}</button>' for kind,label in [('masuk','+ Masuk'),('keluar','− Keluar'),('edit','Edit')])+'</div>'
    return re.sub(r'</a>\s*$', controls+'</article>', tag)
source = re.sub(r'<a href="#" class="menu-card[^>]*>.*?</a>', card_controls, source, flags=re.S)
assert card_number == 22
nav_controls = ''.join(f'<button type="button" class="catalog-menu" data-action="{kind}">{label}</button>' for kind,label in [('masuk','Barang Masuk'),('keluar','Barang Keluar'),('edit','Edit Barang')])
source = source.replace('<div class="nav-left">', '<div class="nav-left">'+nav_controls, 1)
dialogs = (ROOT/'catalog-dialogs.html').read_text(encoding='utf-8')
status, dialogs_only = dialogs.split('<dialog', 1)
source = source.replace('<main class="menu-container">', status+'<main class="menu-container" id="catalog-grid">', 1)
source = source.replace('</body>', '<dialog'+dialogs_only+'\n</body>', 1)
static = source.replace('</head>', '<link rel="stylesheet" href="catalog-controls.css">\n</head>', 1).replace('</body>', '<script src="catalog-client.js"></script>\n</body>', 1)
(ROOT/'tengah.html').write_text(static, encoding='utf-8')

def absolute_assets(html):
    from urllib.parse import quote
    html = re.sub(r'src="([^":]+)"', lambda m: 'src="'+ASSETS+quote(m[1])+'"', html)
    return html.replace('url("bgawal.jpeg")', 'url("'+ASSETS+'bgawal.jpeg")')

catalog = absolute_assets(source)
catalog = catalog.replace('<head>', '<head>\n<base target="_top">', 1)
catalog = catalog.replace('<body>', '<body data-initial-action="<?= initialAction ?>" data-initial-code="<?= initialCode ?>">', 1)
catalog = catalog.replace('href="index.html"', 'href="<?= appUrl ?>?page=beranda"')
catalog = catalog.replace('</head>', "<?!= include_('Styles'); ?>\n</head>", 1).replace('</body>', "<?!= include_('Client'); ?>\n</body>", 1)
(ROOT/'apps-script/Index.html').write_text(catalog, encoding='utf-8')
(ROOT/'apps-script/Styles.html').write_text('<style>\n'+(ROOT/'catalog-controls.css').read_text(encoding='utf-8')+'\n</style>\n', encoding='utf-8')
(ROOT/'apps-script/Client.html').write_text('<script>\n'+(ROOT/'catalog-client.js').read_text(encoding='utf-8')+'\n</script>\n', encoding='utf-8')

home = (ROOT/'frontend-source/index.html').read_text(encoding='utf-8')
(ROOT/'index.html').write_text(home.replace('href="tengah.html"', 'href="'+APP+'?page=katalog"'), encoding='utf-8')
home = absolute_assets(home).replace('<head>', '<head>\n<base target="_top">', 1).replace('href="tengah.html"', 'href="<?= appUrl ?>?page=katalog"')
(ROOT/'apps-script/Home.html').write_text(home, encoding='utf-8')
print('Frontend asli dipertahankan; 22 kartu mendapat kontrol masuk, keluar, dan edit.')
