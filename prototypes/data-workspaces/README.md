# Data workspace design study

Open `index.html` directly in a browser. The six HTML entry points share local CSS and JavaScript; no server, build, installation, backend, or internet connection is needed.

| Layout | Resources | Standard data page |
| --- | --- | --- |
| Flat workspace | `resources-flat.html` | `recovery-runs-flat.html` |
| Explorer + inspector | `resources-explorer.html` | `recovery-runs-explorer.html` |
| Operations console | `resources-console.html` | `recovery-runs-console.html` |

All layouts replace nested surfaces with one continuous workspace. Flat prioritizes table width, Explorer keeps provider/type navigation beside a record inspector, and Console docks details below the dense grid. Names are keyboard-operable buttons; Escape dismisses details and returns focus to the selected name. Search and status filters combine with provider/entity scope. Density is adjustable. All matching records are shown; there is no simulated pagination.

Colors follow `src/index.css`. Muted text uses a darker shade for readability at smaller sizes. The font stack prefers the application's Outfit font if installed and otherwise uses Segoe UI. The outer rounded shell is retained, with dividers rather than nested cards inside it. Sample records and execution events are synthetic. Only the recovery-runs screenshot was available; Resources structure was inspected in `ResourcesPage`, `ResourceInventoryShell`, and `InventoryShell`.

These are design artifacts, not changes to application components. Shared code keeps the same records and controls across all six proposals so comparisons reflect layout differences.

Run `node prototypes/data-workspaces/verify.mjs` from the repository root for focused checks in an isolated headless Chrome profile. Set `CHROME_PATH` if Chrome is installed elsewhere. The script checks all six pages at 320, 768, 1024, and 1440 pixels, interactive filtering, scope changes, density, empty states, record selection, Escape focus restoration, gallery links, and browser errors. Screenshots are saved in the temporary profile directory reported by the command.
