"""Regresi visual struktural: desain asli tidak boleh diganti saat integrasi."""
from pathlib import Path
from html.parser import HTMLParser
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.images = []
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'img' and 'edit-photo-preview' != attrs.get('id'):
            self.images.append(attrs.get('src'))

class OriginalFrontend(unittest.TestCase):
    def test_original_catalog_design_and_photos(self):
        original = (ROOT/'frontend-source/tengah.html').read_text(encoding='utf-8')
        result = (ROOT/'tengah.html').read_text(encoding='utf-8')
        original_css = re.search(r'<style>(.*?)</style>', original, re.S)[1].replace('url(" bgawal.jpeg")','url("bgawal.jpeg")')
        result_css = re.search(r'<style>(.*?)</style>', result, re.S)[1]
        self.assertEqual(original_css, result_css)
        self.assertEqual(Page(original).images, Page(result).images)
        for component in ['header', 'running-container', 'total-souvenir']:
            tag = 'header' if component == 'header' else 'div' if component == 'running-container' else 'section'
            pattern = rf'<{tag} class="{component}">.*?</{tag}>'
            self.assertEqual(re.search(pattern, original, re.S)[0], re.search(pattern, result, re.S)[0])
        self.assertEqual(len(re.findall(r'data-code="ARS-', result)), 22)
        self.assertEqual(len(re.findall(r'class="card-actions"', result)), 22)
        self.assertNotIn('href="#" class="menu-card', result)
        self.assertEqual(re.findall(r'class="angka">(\d+)', original), re.findall(r'class="angka">(\d+)', result))

    def test_original_home_only_entry_url_changes(self):
        original = (ROOT/'frontend-source/index.html').read_text(encoding='utf-8')
        result = (ROOT/'index.html').read_text(encoding='utf-8')
        result = re.sub(r'href="https://script.google.com/macros/s/[^\"]+\?page=katalog"', 'href="tengah.html"', result)
        self.assertEqual(original, result)

    def test_apps_script_routes_and_resources(self):
        catalog = (ROOT/'apps-script/Index.html').read_text(encoding='utf-8')
        self.assertNotIn('src="logo.jpeg"', catalog)
        self.assertIn("<?!= include_('Styles'); ?>", catalog)
        self.assertIn("<?!= include_('Client'); ?>", catalog)
        self.assertTrue((ROOT/'apps-script/Home.html').exists())
        client = (ROOT/'apps-script/Client.html').read_text(encoding='utf-8')
        self.assertEqual(client, '<script>\n'+(ROOT/'catalog-client.js').read_text(encoding='utf-8')+'\n</script>\n')

if __name__ == '__main__':
    unittest.main()
