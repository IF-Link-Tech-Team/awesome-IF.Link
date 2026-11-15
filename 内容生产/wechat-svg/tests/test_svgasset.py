import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "svgasset.py"
spec = importlib.util.spec_from_file_location("svgasset", SCRIPT)
svgasset = importlib.util.module_from_spec(spec)
spec.loader.exec_module(svgasset)


class SvgAssetTests(unittest.TestCase):
    def test_shape_conversion_preserves_geometry_and_flattens_gradient(self):
        source = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 20 40 20">
          <defs><linearGradient id="shade"><stop stop-color="#000000"/>
          <stop stop-color="#ffffff"/></linearGradient></defs>
          <g id="icon" class="brand" fill-rule="evenodd">
          <path d="M10 20h40v20H10z" fill="url(#shade)"/>
          <circle cx="20" cy="30" r="3" fill="currentColor"/></g></svg>'''
        with tempfile.TemporaryDirectory() as temp:
            src = Path(temp) / "input.svg"
            src.write_text(source)
            asset = svgasset.sanitize(str(src), "#112233")
        self.assertEqual((asset["w"], asset["h"]), (40, 20))
        tree = ET.fromstring('<svg>' + asset['inner'] + '</svg>')
        self.assertEqual(tree[0].attrib['transform'], 'translate(-10 -20)')
        self.assertEqual(tree.find('.//path').attrib['d'], 'M10 20h40v20H10z')
        self.assertEqual(tree.find('.//path').attrib['fill'], '#808080')
        self.assertEqual(tree.find('.//path').attrib['fill-rule'], 'evenodd')
        self.assertEqual(tree.find('.//circle').attrib['fill'], '#112233')
        for el in tree.iter():
            self.assertNotIn('id', el.attrib)
            self.assertNotIn('class', el.attrib)
        self.assertIsNone(tree.find('.//defs'))

    def test_place_centers_without_distorting_aspect_ratio(self):
        output = svgasset.place({'w': 40, 'h': 20, 'inner': '<path/>'}, 100, 80, 20)
        self.assertEqual(ET.fromstring(output).attrib['transform'],
                         'translate(90.00 75.00) scale(0.50000)')

    def test_cli_produces_standalone_svg(self):
        with tempfile.TemporaryDirectory() as temp:
            src, dst = Path(temp) / 'input.svg', Path(temp) / 'out' / 'output.svg'
            src.write_text('<svg width="40" height="20"><rect width="40" height="20"/></svg>')
            subprocess.run([sys.executable, str(SCRIPT), str(src), '--output', str(dst)], check=True, capture_output=True)
            root = ET.parse(dst).getroot()
            self.assertEqual(root.attrib['viewBox'], '0 0 40 20')
            self.assertEqual(len(root), 1)


if __name__ == '__main__':
    unittest.main()
