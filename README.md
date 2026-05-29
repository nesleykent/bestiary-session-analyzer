# Bestiary Session Analyzer

Bestiary Session Analyzer for Tibia extracts monster kill data from your hunting log, calculates your kill rate, and estimates the time required to complete a Bestiary entry. It is meant to help you evaluate and improve hunting efficiency for faster Bestiary completion.

## What The Tool Does

- Parses a Tibia hunting session log.
- Extracts the session duration and killed monsters.
- Matches those monsters against the Bestiary dataset.
- Calculates kill rate, remaining kills, and estimated time to unlock.
- Lets you enter your current total kills to recalculate remaining time more accurately.

## How To Use It

1. Start a local static server from the repository root:

```bash
python3 -m http.server 4173
```

2. Open the app in your browser:

- `http://127.0.0.1:4173/src/`

3. Paste your hunting session log into the text area.
4. Click `Process Log`.
5. Review the generated table for:
   - Creature name
   - Session kills
   - Kills to unlock
   - Kill rate
   - Kills left
   - Estimated time remaining
   - Charms per hour
6. Optionally fill in `Total Kills` for any creature and click `Update Remaining Time`.
7. Use `Clear` or `Clear Inputs` to reset the log or manual kill totals.

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
|   |   |   `-- session-analysis.js
|   |   |-- services/
|   |   |   `-- bestiary-repository.js
|   |   |-- state/
|   |   |   `-- session-store.js
|   |   |-- ui/
|   |   |   `-- render-results.js
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
- `src/app/features` contains log parsing and progression calculations.
- `src/app/services` contains data-loading concerns.
- `src/app/ui` renders result tables and summary metrics.
- `src/app/state` persists the last processed session in `sessionStorage`.
- `src/data` stores application-owned datasets.

## Data Source

The application loads creature metadata from:

- `src/data/bestiary.json`

This dataset is sourced from the Tibiadraptor Bestiary API and normalized into the internal fields the app already uses, including creature name, charm points, and kills required to unlock.

## Automation

- `.github/workflows/ci.yml` validates repository structure and JSON integrity on pushes and pull requests.
- `.github/workflows/deploy-pages.yml` publishes the static site to GitHub Pages.

## Documentation

- [Repository structure](docs/repository-structure.md)

## License

Released under the terms of the [LICENSE](LICENSE).
