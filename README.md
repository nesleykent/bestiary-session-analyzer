# Bestiary Session Analyzer

Static web tool for analyzing Tibia hunting session logs against Bestiary progression data.

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
|   |   `-- bestiary-data.json
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

## Local Development

Because the app fetches JSON assets, serve the repository over HTTP instead of opening files directly.

```bash
python3 -m http.server 4173
```

Then open:

- `http://127.0.0.1:4173/src/`

## Automation

- `.github/workflows/ci.yml` validates repository structure and JSON integrity on pushes and pull requests.
- `.github/workflows/deploy-pages.yml` publishes the static site to GitHub Pages.

## Documentation

- [Repository structure](docs/repository-structure.md)

## License

Released under the terms of the [LICENSE](LICENSE).
