# Repository Structure

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
|   |   |   |-- charm-plan.js
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
|   |   |   |-- render-all-tabs.js
|   |   |   |-- render-charm-plan.js
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

## Notes

- All application runtime code lives under `src/`.
- Bestiary and Tasks are separate top-level modes with their own session state; hunts and the tab bar belong to Bestiary only.
- `state/hunt-workspace.js` owns the hunt tab collection, and every hunt keeps its own log, analysis, and mode.
- `features/hunt-comparison.js` only ranks and combines Bestiary results that the hunt tabs already calculated.
- The tab bar holds fixed All Tabs and Charm Plan tabs before the hunt tabs; `Compare Hunts` renders the charm rate ranking separately.
- `features/charm-plan.js` plans against available time only, and reads the per-creature times the estimate produced.
- All Tabs rows are the hunt tabs' own estimate rows. Only its summary aggregates them, by adding each hunt's longest time.
- The repository root is limited to metadata, documentation, license material, and the GitHub Pages redirect entry point.
- GitHub automation lives under `.github/` and is separated from application source.
