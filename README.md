# AZA Ductulator

An interactive duct-sizing wheel, built from scans of a real instrument. Two
layers on a shared pivot: the **disc** stays put, the **card** on top spins.
Line the scales up in the windows and read the answer, exactly as you would
with the paper instrument — there is no calculation anywhere in it.

Pinch or scroll to zoom in to 8× so the fine divisions are actually readable.

```sh
python3 vector/vectorize.py BOTTOM_PAGE.pdf TOP_PAGE.pdf -o ductulator.html
```

Then open `ductulator.html`. It is one self-contained file.

## Layout

| Path | What it is |
|---|---|
| `vector/vectorize.py` | Turns the two scanned pages into the instrument in one pass |
| `vector/template.html` | The chrome, brand palette, rotation and zoom behaviour |
| `vector/README.md` | How the vectorizing works, and the two interaction details that are easy to undo by accident |
| `test-app.mjs` | 23 checks: rotation, inertia, keyboard, themes |
| `zoom-test.mjs` | 12 checks: pinch, scroll, buttons, keys, double-tap |
| `archived prior versions/` | Superseded versions and a manifest of where each one lives |
| `ductulator.html` | Build output — gitignored, regenerate with the command above |

## Brand colours

Three tokens at the top of `vector/template.html`. Everything else resolves
through them, so correcting them is a three-line edit:

```css
--aza-blue:  #0F76BC;
--aza-green: #3F8F3A;
--aza-grey:  #8A8D90;
```

These were read off the supplied logo image by eye, not sampled from a file —
replace them with the official values. The masthead is set from type in those
colours rather than from the mark itself; drop in a vector logo when there is
one.

## Source scans

The two PDFs are not in this repository. `git push` does not work from the
build sandbox — its git proxy rejects the credentials — so commits went through
the GitHub API, which carries text only, and the scans are binary. Add them
from your own copy to make the repository self-rebuilding.

## Status

Not a substitute for ASHRAE tables. The scales are measured from one physical
instrument, and the fine divisions carry that instrument's own tolerances.
