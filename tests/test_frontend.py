"""Structural regression, build idempotence, names, navigation, and shared dynamic UI."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
class OriginalFrontend(unittest.TestCase):
    def test_original_base_design(self):
        original=(ROOT/'frontend-source/tengah.html').read_text(encoding='utf-8')
        result=(ROOT/'tengah.html').read_text(encoding='utf-8')
        self.assertEqual(re.search(r'<style>(.*?)</style>',original,re.S)[1].replace('url(" bgawal.jpeg")','url("bgawal.jpeg")'),re.search(r'<style>(.*?)</style>',result,re.S)[1])
        for tag,cls in [('header','header'),('div','running-container')]:
            pattern=rf'<{tag} class="{cls}">.*?</{tag}>'
            self.assertEqual(re.search(pattern,original,re.S)[0],re.search(pattern,result,re.S)[0])
        self.assertIn('Jenis Barang Aktif',result)
        self.assertNotIn('class="angka">',result) # No stale source balances represented as live stock.
    def test_local_home_navigation(self):
        original=(ROOT/'frontend-source/index.html').read_text(encoding='utf-8')
        result=(ROOT/'index.html').read_text(encoding='utf-8')
        self.assertEqual(original,result)
        self.assertIn('href="tengah.html"',result)
        self.assertNotIn('script.google.com',result)
        self.assertNotIn('window.location.assign',(ROOT/'catalog-client.js').read_text(encoding='utf-8'))
    def test_authoritative_names_and_leaflets(self):
        source=(ROOT/'frontend-source/tengah.html').read_text(encoding='utf-8')
        self.assertNotRegex(source,r'Flayer|Arsip [Ss]ovenir|Tas Gempur|Piala Penghargaan')
        cards=re.findall(r'<a href="#" class="menu-card[^>]*>.*?</a>',source,re.S)
        for index,filename in [(16,'leaflet4.png'),(17,'leaflet2.png'),(18,'leaflet1.png'),(19,'leaflet3.png')]:
            self.assertIn('src="'+filename+'"',cards[index])
        catalog=(ROOT/'tengah.html').read_text(encoding='utf-8')
        mappings=json.loads(re.search(r'<script id="photo-fallbacks" type="application/json">(.*?)</script>',catalog,re.S)[1])
        self.assertEqual(mappings['ARS-019'],'foto-awal/leaflet1.png')
        client=(ROOT/'catalog-client.js').read_text(encoding='utf-8')
        self.assertNotIn('originalName',client)
        self.assertNotIn('seedName',client)
        self.assertIn('for(const item of rows)',client)
        self.assertIn("element('h2','',item.name)",client)
    def test_apps_script_assets_and_bridge(self):
        client=(ROOT/'apps-script/Client.html').read_text(encoding='utf-8')
        self.assertEqual(client,'<script>\n'+(ROOT/'backend-transport.js').read_text(encoding='utf-8')+'\n'+(ROOT/'catalog-client.js').read_text(encoding='utf-8')+'\n</script>\n')
        bridge=(ROOT/'apps-script/Bridge.html').read_text(encoding='utf-8')
        self.assertIn('event.source !== parent',bridge)
        self.assertIn('event.origin !== allowedOrigin',bridge)
        self.assertNotIn('menu-card',bridge)
        self.assertNotIn('no-cors',client)
    def test_builder_is_idempotent(self):
        files=['index.html','tengah.html','apps-script/Index.html','apps-script/Client.html','frontend-source/tengah.html']
        before={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in files}
        subprocess.run([sys.executable,str(ROOT/'build_frontend.py')],check=True,capture_output=True)
        self.assertEqual(before,{name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in files})
if __name__=='__main__':unittest.main()
