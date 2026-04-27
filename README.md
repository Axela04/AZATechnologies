# AZA Ductulator

A cross-platform digital recreation of the classic round Air Duct Calculator.
A printed cream-colored "card" sits over a rotating wheel; spin the wheel (or
type a CFM and friction loss) and read off duct diameter, velocity, and
equivalent rectangular dimensions — the same workflow as the physical slide
calculator, with AZA Technologies branding.

The app ships from a single web codebase to:

- **Google Play (Android)** — via Capacitor.
- **Mac App Store (macOS)** — via Electron + electron-builder's `mas` target.

## Architecture

```
src/
  ductulator.ts   # ASHRAE-style friction / velocity / Huebscher math
  wheel.ts        # SVG bottom layer — rotating disc with CFM/FPM/D/rect scales
  card.ts         # SVG top layer — fixed mask, cutouts, friction-loss scale, AZA branding
  svg.ts          # tiny SVG element helpers
  main.ts         # entry: pointer-driven rotation + computed alignment
  style.css
electron/         # macOS shell (loads dist/index.html)
build/            # mas/inherit entitlements for Mac App Store sandbox
capacitor.config.ts
electron-builder.yml
```

The two SVG layers are stacked in the same container; the bottom layer carries
`transform: rotate(...)` while the top layer is `pointer-events: none` so drags
hit the wheel but the printed labels and cutout outlines stay fixed. The center
hub coincides with the rotation pivot at the SVG `viewBox` origin.

## Math

`ductulator.ts` uses the simplified ASHRAE form for round galvanized duct
friction loss

```
ΔP/100 ft (in. wg) ≈ 0.109136 · Q^1.9 / D^5.02   (Wright, galvanized duct)
```

This matches the example printed on the physical card (300 CFM @ 0.08 in.wg →
D ≈ 9.21″, V ≈ 648 FPM, equivalent 6″×12″ / 5″×15″).

Velocity is `V = 183.346 · Q / D²`, and equivalent rectangular dimensions are
solved from Huebscher's equation `De = 1.30 · (a·b)^0.625 / (a+b)^0.25` for a
handful of practical aspect ratios.

The wheel's rotation aligns the input CFM with the input friction loss using
log-spaced scales whose decade widths are calibrated to the same exponents as
the friction equation, so the visual alignment matches the numerical answer.

## Develop

```sh
npm install
npm run dev          # Vite at http://localhost:5173
```

## Build the web bundle

```sh
npm run build        # outputs ./dist
```

## Android (Google Play)

```sh
npm install
npm run build
npx cap add android  # one time
npm run android:sync # rebuilds web + copies to android/
npm run android:open # open Android Studio to sign + upload AAB
```

In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**,
then upload the `.aab` to Google Play Console under your `com.azatechnologies.ductulator`
listing.

## macOS (Mac App Store)

Prerequisites: a paid Apple Developer account, certificates installed in
Keychain (`3rd Party Mac Developer Application`, `3rd Party Mac Developer
Installer`), and a provisioning profile saved to
`build/embedded.provisionprofile`.

```sh
npm install
npm run mac:dev      # local sanity check (Electron window)
npm run mac:dist     # produces ./release/*.pkg for Mac App Store
```

Upload the resulting `.pkg` with **Transporter** to App Store Connect, fill
out metadata under the `com.azatechnologies.ductulator` listing, and submit
for review.

## Notes

- Metal duct only. The math assumes a galvanized roughness; it is an
  approximation, not a substitute for ASHRAE 2021 Fundamentals Ch. 21.
- The wheel and card are pure SVG generated at runtime — they remain crisp at
  any DPI and any window size on phone, tablet, or Mac.
