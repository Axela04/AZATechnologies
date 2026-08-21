# Archived prior versions

Superseded work. Nothing here is maintained — the current version is
`vector/` plus the `ductulator.html` it builds, at the repository root.

This file is the index. The versions themselves are in the commit history,
which is where they belong — copying them back out would only duplicate what
git already stores, and one of them is 5 MB. Retrieve any of it with
`git show <sha>:<path>`, as shown under each version below.

### v1 — hand-drawn SVG, TypeScript (`4afcb34` … `5dd975a`)

The scales were drawn from scratch in code from the ASHRAE friction equation,
with a Vite/TypeScript build and Capacitor + Electron wrappers for the app
stores. It computed answers rather than letting you read them off the wheel,
which was the wrong model: a ductulator does not calculate anything, it aligns.
The bundled single-file output of this version is `aza-ductulator.html`:

```sh
git show 5dd975a:aza-ductulator.html > v1-ductulator.html   # then open it
git show 4398dd5:src/wheel.ts        # the scale geometry
git show 4398dd5:src/ductulator.ts   # the friction / velocity math
git show 4398dd5:src/card.ts
git show 4398dd5:src/main.ts
git show 5dd975a:package.json        # Vite + Capacitor + electron-builder
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

### v2 — raster overlay (`c65cffa`)

The first version built from the real scans, and the first that was actually
aligned correctly: both pages hub-matched and stacked, top card rotating. But
the pages were embedded as base64 images, so the file was 5 MB and the artwork
went soft at any zoom. Not kept as a file here for that reason.

```sh
git show c65cffa:aza-ductulator-overlay.html > /tmp/v2.html   # 5 MB
git show c65cffa --stat
```

### v3 — vectorized (`47d1bd9` … `7cf3a40`)

Both pages traced to real Bézier paths with potrace, which is what made the
instrument stay sharp at any zoom. This is the line the current version
continues; see `vector/README.md` for how the tracing works.

## Why `package-lock.json` is not here

It was a lockfile for the archived TypeScript build, regenerable with
`npm install`, and at 236 KB it was larger than everything else in this folder
combined. It remains in git history like the rest.
