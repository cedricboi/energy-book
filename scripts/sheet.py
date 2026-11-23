# Contact sheets of the page screenshots: python scripts/sheet.py [size] [per]
import sys, glob, os
from PIL import Image
size = sys.argv[1] if len(sys.argv) > 1 else '1366x768'
per = int(sys.argv[2]) if len(sys.argv) > 2 else 4
files = sorted(f for f in glob.glob(f'tests/screenshots/all/{size}/l*-spread.jpg'))
os.makedirs('tests/screenshots/sheets', exist_ok=True)
for old in glob.glob('tests/screenshots/sheets/*.jpg'): os.remove(old)
cols = 2
for i in range(0, len(files), per):
    ims = [Image.open(f) for f in files[i:i + per]]
    w, h = ims[0].size
    # Crop to the book, so the pages are as large as possible.
    box = (int(w * 0.11), int(h * 0.05), int(w * 0.92), int(h * 0.87))
    ims = [im.crop(box) for im in ims]
    cw, ch = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cw * cols, ch * rows), 'white')
    for j, im in enumerate(ims): sheet.paste(im, ((j % cols) * cw, (j // cols) * ch))
    sheet.save(f'tests/screenshots/sheets/{i // per + 1:02d}.jpg', quality=85)
print(len(files), 'pages')
