# DARPE welcome mascots

`darpe-mascots-welcome.png` is an AI-assisted adaptation of the DARPE mascot
reference supplied by Ian in this conversation. Created with the built-in
image generation/editing tool, not the CLI. It is not an official replacement logo.

The logo and globe were removed and obscured clothing reconstructed. The
generator could not produce real transparency — two attempts came back with a
painted checkerboard — so the delivered file is opaque lavender.

`darpe-mascots-cutout.webp` is the version the app actually uses: the backdrop
removed by `scripts/cutout-mascots.mjs`, trimmed and scaled to 720px. Keep this
opaque source; the cutout is regenerated from it whenever the art changes. The
script floods inward from the edges rather than keying on colour, because the
alien's hoodie is nearly the backdrop's lavender and a colour key punches a
hole through it.

Initial prompt:

Use case: background-extraction / identity-preserve. Edit target: the USER-UPLOADED DARPE logo image in this conversation showing a green alien in a lavender hoodie at LEFT and a friendly orange striped cat/tiger in a white hoodie at RIGHT around a globe and DARPE text. Other images in the recent context are app screenshots and are NOT edit targets. Create a clean transparent PNG illustration asset for the welcome banner of this admin app. Preserve the two original mascots' recognizable faces, colors, hand-drawn black outlines, proportions, expressive large eyes, clothing, and friendly illustrated style as closely as possible. Remove ALL DARPE lettering, globe, white rectangular background, borders, small text and any other objects. Reconstruct the small portions of bodies obscured by the logo naturally. Show both mascots together from waist up, alien left and orange cat right, each with an outer hand raised in greeting; alien may retain its two-finger peace salute, cat open paw waving. Both look at viewer and smile. Keep their silhouettes separate with a small transparent gap. Composition wide approximately 3:2, tightly framed with ~5% clear padding around every hand and ear, bodies ending neatly at lower edge. Genuine transparent alpha background, no painted checkerboard, no shadows or ground, no added typography, no new accessories. This is a production raster asset, not a screenshot or mockup. Return the image and local saved file path.

Final edit prompt:

Edit this mascot illustration for production web use. Preserve both original mascots exactly, faces, gestures, colors and clothing. Replace the ENTIRE checkerboard backdrop with one absolutely uniform FLAT pale lavender color hex #EEE3F4, RGB 238 227 244. This is an OPAQUE lavender image request, NOT transparency. NO transparency, NO checkerboard squares, NO white background, NO texture, NO gradient. All background pixels outside the characters, including between them, are the same lavender color. Make the characters sit together in a wide 3:2 canvas, waist-up, friendly green alien in lavender hoodie saluting on left, orange cat in white hoodie waving on right. Do not add any lettering, objects or decorations. Return the PNG path.
