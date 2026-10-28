"""Slice Google Stitch's Leo sprite sheet into one web-ready WebP per mood (frontend/src/components/assistant/leo/).

The sheet is a 3 x 2 grid of heads on flat navy: hello, thinking, happy / celebrating, sleepy, wink.
Every head is resized so its mane spans 80% of a 360 px square, centred the same way, and the cell's own navy is replaced by the exact
brand navy #0F2C59 (the heads are untouched), so a round badge needs no cut-out and shows no halo.

Needs Pillow and numpy.   Usage:  python tools/slice_leo_sprites.py <sprite-sheet.png> <output-folder>
"""
import os
import sys

import numpy as np
from PIL import Image

SIZE = 360
NAVY = np.array([15, 44, 89], float)
HEAD_WIDTH = 0.80
HEAD_CENTRE_Y = 0.48
NAMES = [["hello", "thinking", "happy"], ["celebrating", "sleepy", "wink"]]

src, out_dir = sys.argv[1], sys.argv[2]
sheet = np.asarray(Image.open(src).convert("RGB")).astype(float)
H, W, _ = sheet.shape
os.makedirs(out_dir, exist_ok=True)

for r in range(2):
    for c in range(3):
        cell = sheet[r * H // 2:(r + 1) * H // 2, round(c * W / 3):round((c + 1) * W / 3)]
        ring = np.concatenate([cell[:10].reshape(-1, 3), cell[-10:].reshape(-1, 3), cell[:, :10].reshape(-1, 3), cell[:, -10:].reshape(-1, 3)])
        bg = np.median(ring, axis=0)
        # foreground = warm colours (mane, fur, confetti): red clearly above blue. The navy background (and scarf) are the opposite.
        alpha = np.clip((cell[..., 0] - cell[..., 2] + 70) / 50, 0, 1)
        out = cell + (NAVY - bg) * (1 - alpha)[..., None]
        # head box: rows and columns with a wide run of foreground (confetti and the z are never that wide)
        mask = alpha > 0.5
        cols, rows = np.where(mask.sum(0) > 40)[0], np.where(mask.sum(1) > 40)[0]
        x0, x1, y0, y1 = cols[0], cols[-1], rows[0], rows[-1]
        k = HEAD_WIDTH * SIZE / (x1 - x0)
        img = Image.fromarray(np.clip(out, 0, 255).astype("uint8")).resize((round(cell.shape[1] * k), round(cell.shape[0] * k)), Image.LANCZOS)
        canvas = Image.new("RGB", (SIZE, SIZE), tuple(int(v) for v in NAVY))
        canvas.paste(img, (round(SIZE / 2 - (x0 + x1) / 2 * k), round(SIZE * HEAD_CENTRE_Y - (y0 + y1) / 2 * k)))
        canvas.save(os.path.join(out_dir, f"{NAMES[r][c]}.webp"), "WEBP", quality=90, method=6)
        print(NAMES[r][c])
