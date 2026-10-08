# Arcade menu QA

Final result: passed for the local arcade-machine implementation.

The colorful adventure menu is integrated into the existing 3D arcade cabinet. The user's latest instruction is to stop porting to Figma and use the menu directly in the machine.

## Design and implementation

- Four requested sections remain in order: Projects, Experience, About Me and Contact.
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

- Activating Projects opens the three files in `public/project-gifs`: Water Renderer, Starship Sling and Reinforcement Learning Trained AI Agent. Their complete filenames, without extensions, are the card titles.
- Every GIF uses `object-fit: contain` to preserve the complete landscape or portrait preview. The original files are unchanged. Previews are created only when the Projects grid first opens.
- Each card opens its matching GIF, category, title, summary and two explanatory paragraphs. Copy is editable in `public/arcade-projects.js`; the initial draft uses filenames and visible demo content without adding unverified technologies or metrics.
- All three cards and all three full explanations fit the 610 x 530 display. Header, back controls, complete names and footer are visible. The final visual check corrected crowded detail text and a low-contrast gallery caption.
- Native mouse clicks, Enter activation, arrow keys, Home/End, previous/next wrapping and Escape navigation passed. Going back restores the selected card and focus.
- At 390 x 700, the grid becomes one column and the detail view stacks the GIF above its text. Keyboard navigation scrolls the focused card into view; all explanatory text is reachable without horizontal clipping.
- The original home-menu checks still pass. UI animations are disabled under reduced motion; native GIF playback remains available.
- Real mouse clicks through the cabinet's projected iframe open Projects and the Water Renderer detail view. `projects-grid-in-cabinet.png` and `project-detail-in-cabinet.png` capture these states; the cabinet verification reports no errors.
- `design/arcade-menu/projects-verification.json` records the checks; `verify-projects.cjs` reproduces them. Gallery, individual detail and mobile screenshots are saved alongside it.
- The production build passes with the existing Three.js chunk-size warning.
