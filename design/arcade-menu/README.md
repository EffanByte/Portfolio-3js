# Adventure arcade menu

[Open the arcade machine](http://localhost:5173/) or [preview the menu directly](http://localhost:5173/arcadescreen.html).

The colorful fantasy pixel menu appears directly on the cabinet screen as soon as the machine loads. Click the cabinet to move the camera closer. The existing coin animation remains available and reuses the same `public/arcadescreen.html` display.

Four warm beveled cards contain original colorful globe, journal, microphone and telephone artwork. The meadow background, independently bobbing cards, floating icons, hover lift and selection sparkles make the screen lively. Mouse and keyboard selection work; reduced motion disables animations. The narrow layout uses two columns.

The page uses `public/arcade-menu.css` and `public/arcade-menu.js`. Selection emits `arcademenu:select` with the chosen section, preserving the existing menu behavior.

## Projects

Activating Projects opens seven project cards with animated previews: Water Renderer, Starship Sling, Adaptive Enemy Framework, Cloth Simulator, Terrain Generator, Tower Defense and Coffee Cataclysm. The arcade grid uses four columns and two rows; narrow screens use three columns and three rows. Clicking a card opens its preview beside the project name and summary, with explanatory paragraphs below, following the supplied sketches.

Project names, GIF paths, summaries and explanatory paragraphs are in `public/arcade-projects.js`. The Adaptive Enemy Framework retains the original reinforcement-learning GIF while describing its Unity AI pipeline.

Arrow keys move through cards; Enter opens a project. The detail arrows switch projects. Escape and the back buttons return to the grid and main menu, restoring selection and focus. GIFs load when the gallery first opens. Narrow screens keep the same grid and use a stacked detail layout.

The grid uses looping GIFs resized to a maximum dimension of 256px, capped at 8 fps with a 128-color palette. The seven files total 7.73 MB instead of 78.12 MB (90.1% smaller), with full clip durations preserved within one frame. Detail pages retain their existing WebM previews; Tower Defense and Coffee Cataclysm use their optimized GIFs.

Starship Sling keeps its source portrait aspect ratio (368 x 732, or 92:183). Its desktop card places a vertical preview beside the label. The detail view uses a larger portrait frame with the description alongside it; narrow screens stack the portrait preview above the text. Media is contained within its frame so the full recording remains visible.

`scripts/optimize-project-gifs.cjs` reproduces the compression using FFmpeg and ffprobe. Pass a directory of full-size source GIFs and an output directory, for example `node scripts/optimize-project-gifs.cjs path/to/originals public/project-gifs`. It validates complete frame decoding, duration, looping and size reduction before copying outputs, and saves source backups outside the site build. Re-encode from original sources to avoid repeated quality loss. Measurements are in `gif-optimization.json`.

The keyboard hint bar, gallery heading, intro and story caption are removed. The Menu button remains available above the cards.

## Current evidence

- `adventure-menu-610x530.png`: arcade-sized menu.
- `adventure-menu-hover-610x530.png`: hover state.
- `adventure-menu-390x700.png`: mobile layout.
- `adventure-menu-in-cabinet.png`: actual 3D cabinet integration.
- `adventure-browser-verification.json` and `adventure-cabinet-verification.json`: passing checks.
- `projects-grid-610x530.png` and `projects-grid-390x700.png`: the four-column arcade and three-column mobile galleries. `project-*-610x530.png` includes detail captures for all seven projects, including Coffee Cataclysm.
- `project-coffee-390x700.png`: Coffee Cataclysm detail on a narrow screen.
- `projects-grid-390x700.png` and `project-terrain-390x700.png`: narrow layouts.
- `projects-grid-in-cabinet.png` and `project-detail-in-cabinet.png`: project navigation on the actual cabinet display.
- `projects-verification.json`: gallery, detail, keyboard and mobile checks.

Run the saved checks from the repository root with the local Vite server running:

```powershell
node design/arcade-menu/verify-adventure-menu.cjs
node design/arcade-menu/verify-adventure-cabinet.cjs
node design/arcade-menu/verify-projects.cjs
```

The root `design-qa.md` documents the validation. Asset attribution is in `public/arcade-assets/README.md`.

## Earlier design work

The older blue-design screenshots, Figma scripts and comparisons are retained as historical work. `adventure-figma-source.js` and `adventure-upload-result.json` preserve preparation from the attempted redesign port. Further Figma porting was stopped at the user's request; the local implementation is the current deliverable.
