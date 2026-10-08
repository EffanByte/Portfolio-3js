# Adventure arcade menu

[Open the arcade machine](http://localhost:5173/) or [preview the menu directly](http://localhost:5173/arcadescreen.html).

The colorful fantasy pixel menu appears directly on the cabinet screen as soon as the machine loads. Click the cabinet to move the camera closer. The existing coin animation remains available and reuses the same `public/arcadescreen.html` display.

Four warm beveled cards contain original colorful globe, journal, microphone and telephone artwork. The meadow background, independently bobbing cards, floating icons, hover lift and selection sparkles make the screen lively. Mouse and keyboard selection work; reduced motion disables animations. The narrow layout uses two columns.

The page uses `public/arcade-menu.css` and `public/arcade-menu.js`. Selection emits `arcademenu:select` with the chosen section, preserving the existing menu behavior.

## Projects

Activating Projects opens three animated GIF cards using the names of the files in `public/project-gifs`. Clicking a card opens its GIF beside the project name and summary, with explanatory paragraphs below, following the supplied sketches.

Project names, GIF paths, summaries and explanatory paragraphs are in `public/arcade-projects.js`. The initial text is a short draft based on the filenames and visible demos; replace it there with the final project descriptions.

Arrow keys move through cards; Enter opens a project. The detail arrows switch projects. Escape and the back buttons return to the grid and main menu, restoring selection and focus. GIFs load when the gallery first opens. Narrow screens use scrollable cards and a stacked detail layout.

## Current evidence

- `adventure-menu-610x530.png`: arcade-sized menu.
- `adventure-menu-hover-610x530.png`: hover state.
- `adventure-menu-390x700.png`: mobile layout.
- `adventure-menu-in-cabinet.png`: actual 3D cabinet integration.
- `adventure-browser-verification.json` and `adventure-cabinet-verification.json`: passing checks.
- `projects-grid-610x530.png` and `project-*-610x530.png`: the gallery and all three detail views.
- `projects-grid-390x700.png` and `project-agent-390x700.png`: narrow layouts.
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
