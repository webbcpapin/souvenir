"""Regenerate Pages and optional Apps Script compatibility views from the original layout."""
from pathlib import Path
import html
import json
import re
from urllib.parse import quote
ROOT = Path(__file__).resolve().parent
ASSETS = 'https://webbcpapin.github.io/souvenir/'
seed = json.loads(re.search(r'const INITIAL_ITEMS = (\[.*\]);', (ROOT/'apps-script/Seed.gs').read_text(encoding='utf-8'), re.S)[1])
source_path = ROOT/'frontend-source/tengah.html'
source = source_path.read_text(encoding='utf-8')
number = 0
# Correct the source too, including every alt. No stocks/units are migrated here.
def correct_card(match):
    global number
    item = seed[number]
    number += 1
    text = match[0]
    text = re.sub(r'(<div class="menu-title">.*?<h([123])>).*?(</h\2>)', lambda m: m[1]+html.escape(item['name'])+m[3], text, flags=re.S)
    text = re.sub(r'alt="[^"]*"', 'alt="'+html.escape(item['name'], quote=True)+'"', text)
    if item['code']=='ARS-019': text=text.replace('src="leaflet4.png"','src="leaflet1.png"')
    return text
source=re.sub(r'<a href="#" class="menu-card[^>]*>.*?</a>',correct_card,source,flags=re.S)
assert number==22
source=re.sub(r'Arsip [Ss]ovenir', 'Arsip Suvenir',source)
source_path.write_text(source,encoding='utf-8')
source=source.replace('url(" bgawal.jpeg")','url("bgawal.jpeg")').replace('href="../index.html"','href="index.html"')
source=re.sub(r'<script>.*?</script>','',source,flags=re.S)
source=re.sub(r'<main class="menu-container">.*?</main>','<main class="menu-container" id="catalog-grid" aria-label="Katalog barang"></main>',source,flags=re.S)
source=source.replace('Total Souvenir','Jenis Barang Aktif').replace('Jumlah seluruh stok souvenir yang tersedia','Jumlah jenis barang; stok ditampilkan menurut satuan').replace('id="totalSouvenir">\n            0','id="totalSouvenir">\n            —')
nav=''.join(f'<button type="button" class="catalog-menu" data-action="{kind}">{label}</button>' for kind,label in [('add','+ Tambah Barang'),('masuk','Barang Masuk'),('keluar','Barang Keluar'),('edit','Edit Barang')])
source=source.replace('<div class="nav-left">','<div class="nav-left">'+nav,1)
dialogs=(ROOT/'catalog-dialogs.html').read_text(encoding='utf-8')
status,dialogs_only=dialogs.split('<dialog',1)
source=source.replace('<main class="menu-container"',status+'<main class="menu-container"',1)
source=source.replace('</body>','<dialog'+dialogs_only+'\n</body>',1)
fallback={i['code']:'foto-awal/'+i['seed_filename'] for i in seed}
config='<script id="photo-fallbacks" type="application/json">'+json.dumps(fallback,ensure_ascii=False)+'</script>'
static=source.replace('</head>','<link rel="stylesheet" href="catalog-controls.css">\n</head>',1).replace('</body>',config+'\n<script src="backend-transport.js"></script>\n<script src="catalog-client.js"></script>\n</body>',1)
(ROOT/'tengah.html').write_text(static,encoding='utf-8')
def absolute_assets(text):
    text=re.sub(r'src="([^":]+)"',lambda m:'src="'+ASSETS+quote(m[1])+'"',text)
    return text.replace('url("bgawal.jpeg")','url("'+ASSETS+'bgawal.jpeg")')
catalog=absolute_assets(source).replace('<head>','<head>\n<base target="_top">',1).replace('href="index.html"','href="'+ASSETS+'index.html"')
gas_config='<script id="photo-fallbacks" type="application/json">'+json.dumps({code:ASSETS+path for code,path in fallback.items()},ensure_ascii=False)+'</script>'
catalog=catalog.replace('</head>',"<?!= include_('Styles'); ?>\n</head>",1).replace('</body>',gas_config+"\n<?!= include_('Client'); ?>\n</body>",1)
(ROOT/'apps-script/Index.html').write_text(catalog,encoding='utf-8')
(ROOT/'apps-script/Styles.html').write_text('<style>\n'+(ROOT/'catalog-controls.css').read_text(encoding='utf-8')+'\n</style>\n',encoding='utf-8')
(ROOT/'apps-script/Client.html').write_text('<script>\n'+(ROOT/'backend-transport.js').read_text(encoding='utf-8')+'\n'+(ROOT/'catalog-client.js').read_text(encoding='utf-8')+'\n</script>\n',encoding='utf-8')
home_path=ROOT/'frontend-source/index.html'
home=re.sub(r'Arsip [Ss]ovenir','Arsip Suvenir',home_path.read_text(encoding='utf-8'))
home_path.write_text(home,encoding='utf-8')
(ROOT/'index.html').write_text(home,encoding='utf-8')
(ROOT/'apps-script/Home.html').write_text(absolute_assets(home).replace('<head>','<head>\n<base target="_top">',1).replace('href="tengah.html"','href="'+ASSETS+'tengah.html"'),encoding='utf-8')
print('Pages: navigasi lokal, katalog dinamis, nama dan foto terkoreksi. CSS dasar asli dipertahankan.')
