# DARPE app identity assets

Two marks, from Ian's “Variaciones de logo” brand sheet.

**The app icon is DARPE's golden globe** — `darpe-golden-globe.png`, the real
mark: faceted continents over a gold graticule. `scripts/build-icons.mjs` turns
it into every icon the app serves. Regenerate with
`node scripts/build-icons.mjs --preview`, which also writes a comparison sheet
showing the result at real tab sizes.

Three decisions in that script are worth keeping:

- **The white is keyed everywhere, and the threshold is measured.** Sampling
  the source gives three clean populations: the backdrop *and the gaps inside
  the globe* at distance 1-2 from pure white, the specular highlight on the
  metal at 11, and gold itself past 208. So the cut is set at 5.

  Both obvious approaches fail, and both were tried:

  - Flooding in from the edges leaves every gap between the meridians solid
    white, because the globe's rim is a closed ring — the result was a gold
    globe sitting on a white disc.
  - Keying at a comfortable-looking tolerance like 44 swallows the highlight,
    and the lit facets of Canada and Greenland come out translucent with the
    violet showing through them.
- **Transparent in the tab, violet only where a platform insists.** DARPE
  asked for the bare globe in the browser tab, so `favicon.ico` and the
  `purpose: "any"` web-app icons carry the cutout on nothing. Two icons keep a
  deep violet ground because their platform would otherwise paint one: iOS
  fills a transparent home-screen icon with black, and Android's maskable icon
  is cropped to the launcher shape and has to run edge to edge. The cost of
  transparency is known — the lighter facets sit close to white and wash out
  on a light tab strip — and accepted.
- **Resampled from full resolution in one step.** Scaling through intermediate
  sizes turns the fine gold lines to mud.

**At 16px the globe is a gold disc.** That is the honest cost of using the real
mark: its detail is finer than a pixel at that size, and no amount of tuning
recovers it. What survives is the circular silhouette and the gold, which is
enough to find the tab. It is sharp from 32px up and looks like the brand from
180px up.

The wordmark is the second mark, used in the sidebar. It is a raster adaptation
of the supplied artwork, cut out of its backdrop by
`scripts/cutout-mascots.mjs`.

## Files

All icon files below are generated. Do not hand-edit them — change the drawing
in `scripts/build-icons.mjs` and re-run it.

| Use | File | Pixel dimensions |
| --- | --- | --- |
| Browser favicon | `favicon.ico` | Embedded 16, 32 and 48 |
| iPhone/iPad home-screen icon | `apple-touch-icon.png` | 180 square |
| Web app icons | `darpe-icon-192.png`, `darpe-icon-512.png` | 192, 512 square |
| Adaptive web app icon | `darpe-icon-maskable-512.png` | 512 square |
| **Icon source** | `darpe-golden-globe.png` | 1250 square, on white |
| Wordmark source | `darpe-wordmark-600.png` | 600×216 |
| **Sidebar wordmark (in use)** | `darpe-wordmark.webp` | 560 wide, transparent |
| Editing sources | `darpe-icon-master.png`, `darpe-wordmark-master.png`, `darpe-splash-master.png` | Original generated sizes |

Icons are DARPE's gold globe: transparent for the tab and the web-app icons,
on deep violet `#482D79` for iOS and the maskable icon. The wordmark and mascot
sources are AI-assisted rasters with slight pixel colour variation, so preserve
their proportions when displaying them.

`darpe-splash-master.png` still shows the older violet continent globe. It is
an editing source for a launch screen nothing declares yet — regenerate it to
match the gold globe before any iOS launch image is added.

## Integration status

**These are wired up now.** What each file does in the running app:

- `src/app/favicon.ico` — the golden globe at 16/32/48, picked up by Next's
  file convention. Separate 16/32/48 PNG exports would be redundant with it.
- `src/app/apple-icon.png` — the same globe at 180px, for the iOS home screen.
  No rounded corners are baked in; the platform applies its own.
- `src/app/manifest.ts` — declares the 192/512 icons as `purpose: "any"` and
  the maskable file as `purpose: "maskable"`, with `display: "standalone"`, so
  the app installs on Android and Windows.
- `darpe-wordmark.webp` — the sidebar wordmark, cut out of the 600px export by
  `scripts/cutout-mascots.mjs` so it sits on any surface rather than carrying
  its own near-white rectangle.

The app is **not** offline-capable and deliberately so: a service worker
caching a scheduling tool is a way to show somebody last week's calendar.

Removed as unused: `favicon-16/32/48.png` (the ICO embeds all three),
`darpe-wordmark-1200.png`, `darpe-icon-1024.png`, and the three splash
exports. Masters are kept — regenerate any of them from those.
- The maskable globe was measured inside a radius of 188.61px around the
  center of the 512px canvas; the standard safe radius is 204.8px (40%).
- The favicon exports crop empty outer margin to make the mark larger at 16px.
- **No iOS launch image is declared.** Safari needs one file per device with a
  matching `apple-touch-startup-image` media query; a single portrait PNG
  declared universally is stretched on every device it does not match. The
  three example exports were removed for that reason — regenerate from
  `darpe-splash-master.png` when DARPE says which devices matter.
- For a future in-app loading view, keep any progress feedback in HTML rather
  than embedding a fake spinner in a static image. Do not add an artificial delay.

References checked:

- [Apple: configuring web applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [web.dev: maskable icons and safe zone](https://web.dev/articles/maskable-icon)
- [web.dev: web app manifest](https://web.dev/learn/pwa/web-app-manifest)

## Generation and export provenance

Masters were made using the built-in image generation/editing tool. No API key,
CLI image generation or new dependency was used. Windows System.Drawing was
used only for deterministic dimension/format exports, with proportional crops
and bicubic resampling. Local export recipe: `scripts/export-brand-assets.ps1`
(the repository ignores `scripts/`). PNG dimensions and ICO decoding were
verified; selected icon/splash outputs were inspected. No live Safari device
test has been performed.

### Icon prompt

Use case: precise-object-edit. Edit target: user's DARPE 'Variaciones de logo' brand sheet attached most recently. Extract/adapt ONLY the small flat purple globe at the TOP RIGHT of the sheet, the one made of continent silhouettes with no grid, no gold, no typography. Preserve its geographic orientation and recognizable continent silhouette as closely as possible; simplify tiny isolated speckles only for small-icon legibility. Create a production square 1024x1024 app-icon master: a single solid deep violet #482D79 globe with pale lavender #ECDFF2 oceans/background, centered on a perfectly flat opaque pale lavender #ECDFF2 full-bleed square. Globe diameter exactly about 70% of the square so all meaningful content is comfortably inside the centered 80% diameter safe circle for maskable icons. No outer circle stroke. NO text, no letters, no golden globe, no 3D, no gradients, no shadows, no rounded square corners, no phone mockup, no extra motif. Crisp clean flat edges. This is a faithful raster adaptation from a low-resolution brand reference, not a new logo concept. Return saved PNG path.

### Wordmark prompt

Use case: precise-object-edit. Edit target: user-uploaded 'Variaciones de logo' DARPE brand sheet, NOT the newly generated globe icon. Extract and faithfully clean up the small thin purple DARPE wordmark near the TOP LEFT OF THE LOGO AREA (above the big golden globe). Preserve the distinctive geometric open/stencil-like letter shapes and generous letter spacing in that supplied wordmark: exact letters D A R P E. Do NOT typeset a generic substitute font or redesign the letters. Remove the rest of the brand sheet entirely. Deliver a wide production image about 3:1 aspect ratio with only that clean wordmark centered, occupying about 85% width, on a perfectly uniform opaque #FAF7FC near-white lavender background matching the app sidebar. Wordmark flat deep violet #482D79. No globe, no gold, no taglines, no 'Global admin', no 3D, no shadow, no gradients, no rounded card, no checkerboard or transparency pattern. Keep generous clear margins above and below strokes. Return PNG file path. This is an adaptation from a low-resolution reference, not a new brand design.

### Splash prompt

Use case: compositing. Produce a portrait mobile splash-screen raster artwork for DARPE using the two attached assets as invariants: first image is the approved flat violet continent-globe app symbol; second is the approved geometric DARPE wordmark. Preserve the globe silhouette and exact DARPE letter construction. Canvas approximately 1024x2048 portrait, a perfectly uniform opaque pale lavender #ECDFF2 backdrop, absolutely no gradients, textures, shadows or checkerboard. Center a quiet brand lockup horizontally and vertically with generous blank space: globe 240 pixels wide around canvas center x512 y900, DARPE wordmark about 310 pixels wide below with about 42 pixels between globe and letters. Only these two elements, no app icon square/tile around globe, no phones, no spinner, no slogan, no mascots, no extra text or symbols. Both graphic elements flat deep violet #482D79. The backdrop must merge seamlessly across both inserted assets. This is the actual splash screen image, not a phone mockup. Return PNG file path.
