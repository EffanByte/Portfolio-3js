# Arcade menu QA

Final result: passed for the local arcade-machine implementation.

The colorful adventure menu is integrated into the existing 3D arcade cabinet. The user's latest instruction is to stop porting to Figma and use the menu directly in the machine.

## Design and implementation

- Three sections remain in order: Projects, Experience and Contact.
- Original colorful pixel artwork replaces the monochrome icons: globe, open journal, microphone and telephone.
- A bright meadow and cloud background, warm beveled cards, gold selection accents and a dialogue bar follow the requested whimsical fantasy direction.
- Cards bob independently; their artwork floats and tilts. Hover lifts a card and enlarges its icon. Activation adds a short bounce and sparkle burst.
- Local Pixelify Sans and licensed Pixelarticons controls are served with the page. Reduced-motion preferences disable animation.
- Implementation: `public/arcadescreen.html`, `public/arcade-menu.css`, `public/arcade-menu.js` and `public/arcade-assets/adventure-*.png`.
- Integration: `main.js` loads `/arcadescreen.html` onto the cabinet's CSS3D screen as soon as the machine loads. The artwork is visible immediately. The existing coin animation remains available and reuses this screen.

## Evidence

All screenshots use headless Chrome at deviceScaleFactor 1, without browser chrome. Assets and fonts finished loading before capture.

- `design/arcade-menu/adventure-menu-610x530.png`: actual arcade viewport, Projects selected, reduced motion enabled for a stable capture.
- `design/arcade-menu/adventure-menu-hover-610x530.png`: actual mouse hover over a card.
- `design/arcade-menu/adventure-menu-390x700.png`: narrow-screen two-column layout.
- `design/arcade-menu/adventure-menu-in-cabinet.png`: 945 x 532 scene showing the artwork on the cabinet display.
- `design/arcade-menu/adventure-browser-geometry.json`: measured browser layout.
- `design/arcade-menu/adventure-browser-verification.json`: browser behavior results.
- `design/arcade-menu/adventure-cabinet-verification.json`: immediate artwork visibility and pointer-input results.

## Verification

- All images loaded; labels fit and the 610 x 530 viewport has no clipping.
- Arrow-key selection, native Enter activation, End, previous/next controls and dialogue updates passed.
- Independent animation timing, hover enlargement, selection bounce and sparkle particles passed.
- Reduced motion disables animations. The mobile grid has no horizontal clipping and vertical arrow navigation moves by one row.
- The artwork is attached to the screen and noise rendering has stopped before a coin is inserted. Inserting a coin preserves the single screen. A real mouse click reaches Contact through the projected iframe.
- No browser console errors were recorded.
- `npx.cmd vite build` passed. The existing large Three.js bundle warning remains.

The saved verification scripts reproduce the local checks. Existing blue-design Figma comparisons are historical artifacts and do not evaluate this revision. Further Figma porting was stopped at the user's request.

## Projects flow

The user's two additional sketches specify a grid of GIF cards followed by a detail view with the selected GIF at the left, explanatory text beside it, and more text below. The implementation keeps this arrangement at the arcade viewport, preserving the existing colorful theme.

- Activating Projects opens seven projects with animated previews: Water Renderer, Starship Sling, Adaptive Enemy Framework, Cloth Simulator, Terrain Generator, Tower Defense and Coffee Cataclysm.
- Every GIF uses `object-fit: contain` to preserve the complete landscape or portrait preview. Previews are created only when the Projects grid first opens.
- Each card opens its matching preview, category, title, summary and two explanatory paragraphs. Copy is editable in `public/arcade-projects.js`.
- All seven complete card names and full explanations fit the 610 x 530 display. Four columns and two rows remain visible without scrolling. Narrow screens use three columns and three rows. The header and back controls stay above the grid.
- The gallery heading and intro, story caption and keyboard hint bar are removed, along with the JavaScript references and CSS for those elements. Keyboard navigation remains functional.
- Native mouse clicks, Enter activation, arrow keys, Home/End, previous/next wrapping and Escape navigation passed. Going back restores the selected card and focus.
- At 390 x 700, the gallery retains three columns and two visible rows. The detail view stacks the GIF above its text; all explanatory text is reachable without horizontal clipping.
- The original home-menu checks still pass. UI animations are disabled under reduced motion; native GIF playback remains available.
- Real mouse clicks through the cabinet's projected iframe open Projects and the Water Renderer detail view. `projects-grid-in-cabinet.png` and `project-detail-in-cabinet.png` capture these states; the cabinet verification reports no errors.
- `design/arcade-menu/projects-verification.json` records the checks; `verify-projects.cjs` reproduces them. Gallery, individual detail and mobile screenshots are saved alongside it.
- The production build passes with the existing Three.js chunk-size warning.

## Performance

- The renderer and postprocessing resolution are capped at 1.25 device pixels per CSS pixel.
- GTAO runs at half the postprocessing resolution with fewer sampling and denoising taps.
- Film grain uses one noise hash per pixel instead of sixteen.
- Floor parallax keeps its effect but caps height-map traversal at 12 steps instead of 28.
- In a local Chrome test on Intel Iris Xe at 923 x 351 CSS pixels and device pixel ratio 1.5, the observed frame rate increased from about 11 FPS to about 28 FPS. This is a local comparison, not a guarantee across devices.
- Pool physics now initializes in the background so scene requests and rendering can start without waiting for the external Ammo.js download. The large pub counter and vending-machine models are requested during idle time after the first frame.
- Reduced the embedded textures in the pub counter, vending machine and hanging light from 1024px to 512px. Their GLBs now total 6.24 MB instead of 14.97 MB (58% smaller); model geometry and transparency are unchanged.
- Added a procedural, wall-mounted deer-head trophy above the pub counter without introducing another downloaded asset.
- `npm run build` passes; the existing Three.js bundle-size warning remains.

## GIF preview optimization

- Restored animated GIFs in all seven gallery cards, replacing their static thumbnails. They are still created only when Projects opens, with lazy loading and asynchronous decoding.
- Reduced the seven GIFs from 78,121,834 bytes to 7,731,110 bytes (90.1% smaller). Each has a maximum dimension of 256px, 7-8 fps, a 128-color palette and infinite looping. All clip durations remain within one frame of their sources.
- Full-size sources were backed up outside public. The optimization script validates size reduction, duration, infinite-loop metadata and complete decoding of every output before replacing the files. Per-file measurements are in design/arcade-menu/gif-optimization.json.
- The browser check confirms all seven cards load the resized GIFs and the preview visibly changes between captured frames. The four-column, two-row desktop layout, detail navigation, keyboard controls and three-column mobile layout pass with no console errors.
- Existing WebM detail previews are retained; Tower Defense uses its optimized GIF. The production build passes with the existing large JavaScript chunk warning.

## Starship Sling portrait preview

- Uses the mobile recording's 368 x 732 aspect ratio (92:183) for a tall desktop card preview and a larger portrait detail frame. The description sits alongside the detail preview; narrow screens stack it below.
- Preview media is constrained to its frame with object-fit contain so the complete recording remains visible, including the top HUD and bottom controls.
- Browser checks confirm portrait frame geometry, video decoding, media bounds and the mobile layout. All seven cards fit the four-column desktop and three-column mobile grids, and navigation and the production build pass.
- Evidence: design/arcade-menu/project-starship-610x530.png and design/arcade-menu/project-starship-390x700.png.
