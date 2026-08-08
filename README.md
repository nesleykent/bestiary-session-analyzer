# Bestiary Session Analyzer

Bestiary Session Analyzer for Tibia extracts monster kill data from your hunting log and can now estimate either Bestiary progress or task completion time from the same session data. Several hunts can be analyzed side by side in their own tabs and compared by charm rate.

## What The Tool Does

- Parses a Tibia hunting session log.
- Extracts the session duration and killed monsters.
- In `Bestiary` mode, matches those monsters against the Bestiary dataset.
- In `Bestiary` mode, calculates kill rate, remaining kills, and estimated time to unlock.
- In `Bestiary` mode, lets you enter your current total kills to recalculate remaining time more accurately.
- In `Tasks` mode, lets you choose one creature from the session and estimate how long a task may take based on that hunt.
- Keeps each hunting session in its own hunt tab, with its own log, creature selection, total kills, and mode.
- Compares the Bestiary result of the analyzed hunts and highlights the hunt with the highest charm rate.

## How To Use It

1. Start a local static server from the repository root:

```bash
python3 -m http.server 4173
```

2. Open the app in your browser:

- `http://127.0.0.1:4173/src/`

3. Choose `Bestiary` or `Tasks`.
4. Paste your hunting session log into the text area.
5. Click `Process Log`.
6. In `Bestiary` mode, review the generated table for:
   - Creature name
   - Session kills
   - Kills to unlock
   - Kill rate
   - Kills left
   - Estimated time remaining
   - Charms per hour
7. In `Bestiary` mode, optionally fill in `Total Kills` for any creature and click `Update Remaining Time`.
8. In `Tasks` mode, select the task creature found in the session and enter the total kills required by that task.
9. Use `Clear Log` or `Reset Totals` to reset the log or manual kill totals of the selected hunt.

## Comparing Several Hunts

1. Analyze the first hunt as described above.
2. Click `+` to open another hunt tab, then paste and process the next hunting session.
3. Switch between hunt tabs at any time. Each tab keeps its own log, creature selection, total kills, and mode.
4. Once two hunts have a Bestiary analysis, click `Compare Hunts`.
5. The comparison lists the `Total Charms`, `Longest Time Remaining`, and `Charm Rate` already calculated in each hunt tab, and marks the hunt with the highest charm rate as the best Bestiary hunt.
6. Change the creature selection or total kills inside any hunt tab and compare again to see the updated ranking.

`Tasks` mode stays per hunt and is never part of the Bestiary comparison.

## Example Log Format

```text
Session: 1:30h
Killed Monsters:
    250x Rotworm
    500x Cyclops
Looted Items:
```

## Repository Layout

```text
bestiary-session-analyzer/
|-- .github/
|   |-- ISSUE_TEMPLATE/
|   |   |-- bug_report.md
|   |   `-- feature_request.md
|   `-- workflows/
|       |-- ci.yml
|       `-- deploy-pages.yml
|-- docs/
|   `-- repository-structure.md
|-- src/
|   |-- app/
|   |   |-- features/
|   |   |   |-- hunt-comparison.js
|   |   |   |-- session-analysis.js
|   |   |   |-- session-parser.js
|   |   |   `-- task-analysis.js
|   |   |-- services/
|   |   |   `-- bestiary-repository.js
|   |   |-- state/
|   |   |   |-- hunt-workspace.js
|   |   |   `-- session-store.js
|   |   |-- ui/
|   |   |   |-- render-comparison.js
|   |   |   |-- render-hunt-tabs.js
|   |   |   |-- render-results.js
|   |   |   `-- render-task-results.js
|   |   |-- utils/
|   |   |   `-- formatters.js
|   |   `-- main.js
|   |-- data/
|   |   `-- bestiary.json
|   |-- styles/
|   |   `-- main.css
|   `-- index.html
|-- .gitignore
|-- CONTRIBUTING.md
|-- index.html
|-- LICENSE
`-- README.md
```

## Architecture

- `src/index.html` is the application entry point.
- `src/app/main.js` wires browser events, state restoration, and rendering.
- `src/app/features` contains shared log parsing, the Bestiary and Tasks calculation flows, and the hunt comparison ranking.
- `src/app/services` contains data-loading concerns.
- `src/app/ui` renders the hunt tabs, mode-specific result views, summary metrics, and the hunt comparison.
- `src/app/state` owns the hunt tabs and persists the whole workspace in `sessionStorage`.
- The hunt comparison consumes the same Bestiary summary each hunt tab displays, so both views always agree.
- `src/data` stores application-owned datasets.

## Data Source

The application loads creature metadata from:

- `src/data/bestiary.json`

This dataset is sourced from the TibiaDraptor Bestiary API and normalized into the internal fields the app already uses, including creature name, charm points, and kills required to unlock.

## Automation

- `.github/workflows/ci.yml` validates repository structure and JSON integrity on pushes and pull requests.
- `.github/workflows/deploy-pages.yml` publishes the static site to GitHub Pages.

## Documentation

- [Repository structure](docs/repository-structure.md)

## License

Released under the terms of the [LICENSE](LICENSE).
