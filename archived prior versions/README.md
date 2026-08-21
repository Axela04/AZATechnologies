# Archived prior versions

Superseded work. Nothing here is maintained — the current version is
`vector/` plus the `ductulator.html` it builds, at the repository root.

## What is in this folder

| File | What it was |
|---|---|
| `aza-ductulator.html` | The raster overlay. Both scanned pages embedded as base64 images, stacked and rotated with CSS. 5 MB before the images were downscaled, and the artwork went soft at any zoom. Replaced because it was a photograph of the instrument, not the instrument. |

## Versions kept in git history rather than as files

The rest of the prior work is in the commit history, which is where source
belongs — copying it back out as files would only duplicate what git already
stores. Retrieve any of it with `git show <sha>:<path>`.

### v1 — hand-drawn SVG, TypeScript (`4afcb34` … `4398dd5`)

The scales were drawn from scratch in code from the ASHRAE friction equation,
with a Vite/TypeScript build and Capacitor + Electron wrappers for the app
stores. It computed answers rather than letting you read them off the wheel,
which was the wrong model: a ductulator does not calculate anything, it aligns.

```sh
git show 4398dd5:src/wheel.ts        # the scale geometry
git show 4398dd5:src/ductulator.ts   # the friction / velocity math
git show 4398dd5:src/card.ts
git show 4398dd5:src/main.ts
git show 4398dd5:package.json        # Vite + Capacitor + electron-builder
git show 4398dd5 --stat              # everything in that version
```

Notable pieces if they are ever wanted again:

- `src/ductulator.ts` — the Wright friction equation
  `ΔP = 0.109136 · Q^1.9 / D^5.02`, velocity `V = 183.346 · Q / D²`, and
  Huebscher's round-to-rectangular conversion. Checked against the example
  printed on the physical card: 300 CFM at 0.08 in.wg gives 9.21 in and
  648 FPM.
- `package.json`, `capacitor.config.ts`, `electron-builder.yml` — the Google
  Play and Mac App Store packaging, if the wheel is ever shipped as a store app
  rather than a web page.

### v2 — raster overlay (`c65cffa`, `5dd975a`)

The first version built from the real scans. Correct alignment, but embedded as
images. `aza-ductulator.html` in this folder is that build.

### v3 — vectorized (`47d1bd9` … `7c4fcbf`)

Both pages traced to real Bézier paths with potrace. This is the line the
current version continues; see `vector/README.md`.

## Why `package-lock.json` is not here

It was a lockfile for the archived TypeScript build, regenerable with
`npm install`, and at 236 KB it was larger than everything else combined. It
remains in git history like the rest.
