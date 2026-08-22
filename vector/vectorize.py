#!/usr/bin/env python3
"""Vectorize a two-page ductulator scan into an interactive HTML instrument.

    python3 vector/vectorize.py BOTTOM_PAGE.pdf TOP_PAGE.pdf -o ductulator.html

The two pages are scans of a real ductulator:

  bottom page  the disc, black line art on white, with a coloured grommet
               marking the pivot
  top page     the card, photographed on coloured paper so the cut-out
               windows read as that colour too

Both pages are rendered at the same DPI, so once each pivot is located the
two layers align on their hubs alone with no scale correction.

Requires: poppler-utils (pdftoppm), ImageMagick (convert), potrace, numpy.
"""

import argparse
import json
import re
import subprocess
import sys
import tempfile
from collections import deque
from pathlib import Path

import numpy as np

DPI = 300
VIEW = 1220          # half-width of the emitted viewBox, in 300-dpi pixels
CARD_CLIP = 1102     # card edge radius; also crops binder punch-hole nubs
DISC_FACE = 1098     # painted disc radius, just inside the card edge
EDGE_TRIM = 3        # px of cut-edge shadow to shave off every opening


# ---------------------------------------------------------------- raster io

def render_pdf(pdf: Path, out_prefix: Path) -> Path:
    subprocess.run(
        ["pdftoppm", "-r", str(DPI), "-png", str(pdf), str(out_prefix)],
        check=True,
    )
    pages = sorted(out_prefix.parent.glob(out_prefix.name + "-*.png"))
    if not pages:
        sys.exit(f"pdftoppm produced no pages for {pdf}")
    return pages[0]


def load_rgb(path: Path) -> np.ndarray:
    """Read an image as an (h, w, 3) uint8 array via ImageMagick + binary PPM."""
    raw = subprocess.run(
        ["convert", str(path), "-depth", "8", "ppm:-"],
        capture_output=True, check=True,
    ).stdout
    fields, i = [], 0
    while len(fields) < 4:                      # magic, width, height, maxval
        while raw[i:i + 1].isspace():
            i += 1
        if raw[i:i + 1] == b"#":
            while raw[i:i + 1] != b"\n":
                i += 1
            continue
        j = i
        while not raw[j:j + 1].isspace():
            j += 1
        fields.append(raw[i:j])
        i = j
    i += 1
    w, h = int(fields[1]), int(fields[2])
    return np.frombuffer(raw[i:i + w * h * 3], np.uint8).reshape(h, w, 3)


# ------------------------------------------------------------ mask plumbing

def flood_from_border(mask: np.ndarray) -> np.ndarray:
    """True where `mask` is reachable from the image border (4-connected)."""
    h, w = mask.shape
    seen = np.zeros_like(mask, bool)
    dq = deque()

    def seed(y, x):
        if mask[y, x] and not seen[y, x]:
            seen[y, x] = True
            dq.append((y, x))

    for x in range(w):
        seed(0, x)
        seed(h - 1, x)
    for y in range(h):
        seed(y, 0)
        seed(y, w - 1)
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                dq.append((ny, nx))
    return seen


def components(mask: np.ndarray, min_area: int = 1):
    """Yield (area, pixel_index_array) per 8-connected component."""
    h, w = mask.shape
    seen = np.zeros_like(mask, bool)
    for sy in range(h):
        for sx in np.where(mask[sy] & ~seen[sy])[0]:
            px = []
            dq = deque([(sy, sx)])
            seen[sy, sx] = True
            while dq:
                y, x = dq.popleft()
                px.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if (0 <= ny < h and 0 <= nx < w
                                and mask[ny, nx] and not seen[ny, nx]):
                            seen[ny, nx] = True
                            dq.append((ny, nx))
            if len(px) >= min_area:
                yield len(px), np.array(px)


def largest_component(mask: np.ndarray) -> np.ndarray:
    best_px, best_n = None, 0
    for n, px in components(mask):
        if n > best_n:
            best_n, best_px = n, px
    out = np.zeros_like(mask)
    if best_px is not None:
        out[best_px[:, 0], best_px[:, 1]] = True
    return out


def drop_specks(mask: np.ndarray, min_area: int) -> np.ndarray:
    out = np.zeros_like(mask)
    for _, px in components(mask, min_area):
        out[px[:, 0], px[:, 1]] = True
    return out


def radius_map(shape, hub) -> np.ndarray:
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    return np.hypot(xx - hub[0], yy - hub[1])


def _dilate(mask: np.ndarray, k: int) -> np.ndarray:
    g = mask.copy()
    for _ in range(k):
        n = g.copy()
        n[1:, :] |= g[:-1, :]
        n[:-1, :] |= g[1:, :]
        n[:, 1:] |= g[:, :-1]
        n[:, :-1] |= g[:, 1:]
        g = n
    return g


def near_edge(card: np.ndarray, width: int, pinhole: int = 4) -> np.ndarray:
    """Pixels within `width` of a cut edge — the card rim or a window boundary.

    The scanner reads the physical cut edges as dark lines, which trace as
    stray arcs hugging every opening. They cannot be dropped as whole
    components because they merge with the tick marks that meet them, so the
    band itself is subtracted instead. At 300 dpi a few pixels is under a
    hundredth of an inch, so tick marks lose nothing visible.

    The card mask is closed first. Scan noise leaves a scatter of one- and
    two-pixel pinholes across the card face, and dilating those punches holes
    straight through whatever lettering surrounds them — the wording under the
    friction scale lost 18% of its ink that way. Closing removes the pinholes
    while leaving the real openings, which are hundreds of pixels across,
    untouched.
    """
    solid = ~_dilate(~_dilate(card, pinhole), pinhole)   # morphological close
    return _dilate(~solid, width) & card


def split_arrow(dark: np.ndarray, min_area=1500, min_fill=0.45):
    """Separate the duct-diameter pointer from the rest of the printed ink.

    It is the one solid blob on the card: every other mark is a thin rule or a
    glyph, so a filled bounding box plus a size floor identifies it on its own
    without hard-coding where it sits.
    """
    arrow = np.zeros_like(dark)
    for n, px in components(dark, min_area):
        w = px[:, 1].max() - px[:, 1].min() + 1
        h = px[:, 0].max() - px[:, 0].min() + 1
        if n / (w * h) >= min_fill:
            arrow[px[:, 0], px[:, 1]] = True
    return arrow, dark & ~arrow


# -------------------------------------------------------------- pivot + art

def find_hub(rgb: np.ndarray, min_area=300, max_area=20000):
    """Locate the coloured grommet: the smallest saturated blob near centre."""
    r, g, b = (rgb[:, :, i].astype(np.int16) for i in range(3))
    tinted = (b - (r + g) // 2 > 25) & (b > 90)
    inside = tinted & ~flood_from_border(tinted)
    h, w = tinted.shape
    best, best_d = None, None
    for n, px in components(inside, min_area):
        if n > max_area:
            continue
        cy, cx = px[:, 0].mean(), px[:, 1].mean()
        d = np.hypot(cx - w / 2, cy - h / 2)
        if best_d is None or d < best_d:
            best, best_d = (cx, cy), d
    if best is None:
        sys.exit("could not find the pivot grommet")
    return best


def potrace(mask: np.ndarray, tmp: Path, name: str, turd=2, opt=0.25):
    pbm, svg = tmp / f"{name}.pbm", tmp / f"{name}.svg"
    h, w = mask.shape
    pbm.write_bytes(
        b"P4\n%d %d\n" % (w, h)
        + np.packbits(mask.astype(np.uint8), axis=1).tobytes()
    )
    # -u 1 quantizes coordinates to whole 300-dpi pixels. That is 1/300 in on a
    # ~7.9 in instrument — far below anything a display resolves — and it drops
    # a digit from every coordinate, shrinking the emitted paths by about 23%.
    subprocess.run(
        ["potrace", "-b", "svg", "-t", str(turd), "-a", "1.0",
         "-O", str(opt), "-u", "1", "-o", str(svg), str(pbm)],
        check=True,
    )
    body = re.search(r'<g transform="([^"]+)"[^>]*>(.*?)</g>',
                     svg.read_text(), re.S)
    d = " ".join(re.findall(r'<path d="([^"]+)"', body.group(2)))
    print(f"    {name:5s} {len(d):>7,} path chars")
    return body.group(1), d


# --------------------------------------------------------------------- main

def trace_all(bottom_pdf: Path, top_pdf: Path, tmp: Path) -> dict:
    print("rendering pages at %d dpi" % DPI)
    disc_png = render_pdf(bottom_pdf, tmp / "disc")
    card_png = render_pdf(top_pdf, tmp / "card")

    # ---- top page: card body, windows, and the two ink colours
    top = load_rgb(card_png).astype(np.int16)
    r, g, b = top[:, :, 0], top[:, :, 1], top[:, :, 2]
    hub_t = find_hub(top)
    print(f"  card hub {hub_t[0]:.1f},{hub_t[1]:.1f}  ({top.shape[1]}x{top.shape[0]})")

    tinted = (b - (r + g) // 2 > 33) & (b > 90)     # windows + surrounding paper
    outside = flood_from_border(tinted)
    white_edge = flood_from_border(
        ~tinted & (r > 200) & (g > 200) & (b > 200)  # bare paper past the card
    )
    card = largest_component(~tinted & ~white_edge)
    card &= radius_map(card.shape, hub_t) <= CARD_CLIP

    lum = 0.299 * r + 0.587 * g + 0.114 * b
    red = drop_specks(card & (r - np.maximum(g, b) > 45) & (r > 90), 60)
    dark = card & (lum < 128) & ~red
    dark &= ~near_edge(card, EDGE_TRIM)     # drop the scanned cut-edge shadow
    dark = drop_specks(dark, 12)
    arrow, dark = split_arrow(dark)         # the pointer gets its own colour
    print(f"  arrow {arrow.sum():,} px split out of the ink")

    # ---- bottom page: line art only, minus the grommet and the part number
    bot = load_rgb(disc_png).astype(np.int16)
    rb, gb, bb = bot[:, :, 0], bot[:, :, 1], bot[:, :, 2]
    hub_b = find_hub(bot)
    print(f"  disc hub {hub_b[0]:.1f},{hub_b[1]:.1f}  ({bot.shape[1]}x{bot.shape[0]})")

    lumb = 0.299 * rb + 0.587 * gb + 0.114 * bb
    grommet = (bb - (rb + gb) // 2 > 25) & (bb > 90)
    rad_b = radius_map(bot.shape, hub_b)
    ink = (lumb < 150) & ~grommet & (rad_b >= 55) & (rad_b <= 1120)
    ink = drop_specks(ink, 12)

    print("  tracing")
    out = {
        "hub_t": list(hub_t), "hub_b": list(hub_b),
        "r_card": CARD_CLIP, "r_disc": DISC_FACE,
        "disc": potrace(ink, tmp, "disc", turd=2, opt=0.25),
        "card": potrace(card, tmp, "card", turd=60, opt=0.30),
        "ink": potrace(dark, tmp, "ink", turd=1, opt=0.25),
        "red": potrace(red, tmp, "red", turd=1, opt=0.25),
        "arrow": potrace(arrow, tmp, "arrow", turd=40, opt=0.30),
    }
    return out


TEMPLATE_PATH = Path(__file__).with_name("template.html")


def build_html(traced: dict) -> str:
    ht, hb = traced["hub_t"], traced["hub_b"]

    def layer(key, cls):
        tf, d = traced[key]
        return f'<g transform="{tf}" class="{cls}"><path d="{d}"/></g>'

    disc = (f'<g transform="translate({-hb[0]:.1f},{-hb[1]:.1f})">'
            f'{layer("disc", "engrave")}</g>')
    card = (f'<g transform="translate({-ht[0]:.1f},{-ht[1]:.1f})">'
            f'{layer("card", "stock")}{layer("ink", "engrave")}'
            f'{layer("red", "spot")}{layer("arrow", "pointer")}</g>')

    html = TEMPLATE_PATH.read_text()
    return (html.replace("__DISC__", disc)
                .replace("__CARD__", card)
                .replace("__R_DISC__", str(traced["r_disc"]))
                .replace("__VIEW__", f"{-VIEW} {-VIEW} {VIEW*2} {VIEW*2}"))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("bottom_pdf", type=Path, help="the disc page")
    ap.add_argument("top_pdf", type=Path, help="the card page")
    ap.add_argument("-o", "--out", type=Path, default=Path("ductulator.html"))
    ap.add_argument("--paths", type=Path,
                    help="also write the traced path data as JSON")
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as td:
        traced = trace_all(args.bottom_pdf, args.top_pdf, Path(td))

    if args.paths:
        args.paths.write_text(json.dumps(traced))
        print(f"wrote {args.paths}")

    args.out.write_text(build_html(traced))
    print(f"wrote {args.out}  ({args.out.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
