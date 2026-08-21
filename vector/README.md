# Ductulator

An interactive duct-sizing wheel built from scans of a real one. Two layers on
a shared pivot: the **disc** stays put, the **card** on top spins. Line the
scales up in the windows and read the answer, exactly as you would with the
paper instrument — there is no calculation anywhere in it.

Live version: publish `ductulator.html` anywhere, or just open it — it is a
single self-contained file with no network dependencies except a web font,
which falls back cleanly.

## Rebuilding it from the scans

The two source PDFs are your own scans and are not committed here (the repo is
text-only — see *Pushing*, below). Put them somewhere and run:

```sh
python3 vector/vectorize.py BOTTOM_PAGE.pdf TOP_PAGE.pdf -o ductulator.html
```

Takes about 45 seconds. Requires `poppler-utils`, `imagemagick`, `potrace`,
and `numpy`:

```sh
sudo apt-get install -y poppler-utils imagemagick potrace
pip3 install numpy
```

## How the vectorizing works

`vector/vectorize.py` is one pass over both pages:

1. **Render** both PDFs at 300 dpi. Because both use the same DPI and both are
   scans of the same physical object, the two layers share a scale — once each
   pivot is found they align on their hubs alone, with no scale correction.
2. **Find the pivot** on each page automatically: the grommet is the smallest
   saturated blob near the centre that is not connected to the border. It lands
   on card `1214.1, 1541.8` and disc `1299.6, 1540.0`, matching hand
   measurement.
3. **Segment the card.** The card was scanned on coloured paper, so the cut-out
   windows read as that colour too. Flood-filling the tint from the border
   separates *outside the card* from *windows inside it*; whatever is neither
   tint nor bare surrounding paper is the card body.
4. **Split the inks.** Red spot-colour labels are pulled out separately from the
   engraved black rules so the two never overprint each other.
5. **Clip** the card to `r = 1102`, its true edge. This also removes the binder
   punch-hole nub that the scan caught along one side.
6. **Trace** each layer with potrace. `-u 1` quantizes coordinates to whole
   300-dpi pixels — 1/300 in on a 7.9 in instrument, well below what a display
   resolves — which drops a digit from every coordinate and takes about 23% off
   the file.
7. **Fill** `vector/template.html`, which carries the instrument chrome and the
   rotation behaviour.

Output is roughly 206 KB of real vector paths. It stays sharp at any zoom.

## Notes on the interaction

Two things in `template.html` are load-bearing and easy to undo by accident:

- **The artwork layers take `pointer-events: none`.** `.layer.card` is a square
  element; rotating it grows its axis-aligned bounding box by up to √2, and its
  empty corners then sweep over the control strip and swallow clicks on the
  buttons. It only bites at angles where a corner lands on a button, so it
  presents as flakiness rather than as a clear break. `#rig` never rotates, so
  it owns every pointer event instead.
- **No `setPointerCapture`.** Capturing a mouse pointer keeps retargeting that
  `pointerId` to the capturing element, so the next click anywhere else is
  swallowed. Window-level listeners are simpler and also handle a drag that
  leaves the element.

Momentum is integrated against elapsed time rather than per frame, so a flick
decays the same way on a 60 Hz and a 120 Hz display.

## Tests

```sh
npm install puppeteer
node test-app.mjs [path/to/ductulator.html]
```

23 checks across desktop and mobile viewports: the card rotates and the disc
does not, a quarter-turn drag reads exactly 90°, a throw coasts and then
settles, reset returns to zero, keyboard nudging is exact, both themes paint
their own background, and no JS errors.

## Pushing

`git push` does not work from the build sandbox — its git proxy rejects the
credentials — so commits here went through the GitHub API, which carries text
only. That is why the two source PDFs are absent: they are binary. Add them
from your own copy if you want the repo to be self-rebuilding.
