# Arcade menu QA

Final result: blocked

The working HTML menu is implemented and browser verification passed. The requested editable Figma design and a paired design-to-implementation comparison are pending the Figma connection.

## Source and evidence

- Source visual truth: the user's hand-drawn menu photo attached in this conversation; no local source image path was exposed. It specifies Projects, Experience, About Me and Contact in one row. The accompanying brief specifies a modern light blue pixel theme and a floating animation.
- Implementation: `public/arcadescreen.html`, preview at `http://127.0.0.1:5173/arcadescreen.html`.
- Screenshots: `design/arcade-menu/arcade-menu-610x530.png`, `design/arcade-menu/arcade-menu-390x700.png`, and `design/arcade-menu/arcade-menu-in-cabinet.png`.
- CSS viewports and screenshot dimensions: 610 × 530, 390 × 700, and 945 × 532, respectively. Each was captured at deviceScaleFactor 1 in headless Chrome, without browser chrome. The 3D scene screenshot includes the physical arcade cabinet.
- State: Projects selected; the menu's gentle float animation is running. Assets and the local font finished loading before capture. The cabinet capture follows the existing two-second coin animation.
- Density normalization: implementation screenshots are 1:1 CSS pixels. The sketch has no defined CSS viewport or pixel-density specification. A combined normalized source/implementation input has not been captured, so no formal fidelity pass is claimed.
- Full-view and focused comparison: pending a captured Figma source frame. The four icon/label tiles should be compared separately in addition to the full screen, since the cabinet projection is too small for detailed typography review.

## Implementation review

- Typography: locally served Pixelify Sans, variable weights 400–700. All labels fit within the actual 610px arcade viewport; Experience uses 19px type. The handwritten sketch's lettering is intentionally replaced to follow the requested pixel theme.
- Layout: four equal tiles at the arcade viewport; two columns on narrow screens. The panel has crisp borders and offset shadows, plus an 8px vertical float over 4.8 seconds. Short mobile screens can scroll rather than hide the controls.
- Colors: icy blue background, pale blue panels, navy foreground, and a darker blue selected tile. Palette choices follow the text brief; they are not sampled from the photograph.
- Assets: unmodified MIT Pixelarticons SVGs for globe, article, microphone and phone, tinted through CSS masks and displayed at 48px. The ambiguous About Me sketch was interpreted as a microphone. No handmade icon replacements or generated raster images were used.
- Copy: the four requested labels and their order are retained. Added interface copy consists of a greeting, portfolio/credit status, section summaries, and keyboard hints. The buttons select a section and emit `arcademenu:select`; destination pages are outside this menu task.

## Verification and refinement history

1. Layout measurement found Experience exceeded its padded tile width by about 2px. Reduced desktop menu labels from 20px to 19px. Final measurements show 104.30px text inside 108px available content width. Final 610 × 530 capture records the correction.
2. Narrow-screen review found the decorative footer message wrapped awkwardly. Removed that message at the narrow breakpoint and recaptured the 390 × 700 state after transitions settled. Controls now remain on one line.
3. Final browser verification passed: arrow-key focus and selection, native Enter activation, previous/next buttons, reduced-motion animation disabling, mobile grid, no clipping at the arcade viewport, the coin-to-HTML transition, and actual pointer hit testing through the projected iframe. No browser console errors were recorded.
4. `npx vite build` passed. The pre-existing large Three.js bundle warning remains.

These are implementation refinements, not paired source-image comparison iterations.

## Remaining work

Connect Figma to Codex, create the editable source frame, capture it, and compare it with the rendered page in the same normalized comparison input before changing the final result to passed.
