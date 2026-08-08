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

## Notes

- All application runtime code lives under `src/`.
- Bestiary and Tasks mode share the same session-log input but use separate feature and UI modules.
- `state/hunt-workspace.js` owns the hunt tab collection, and every hunt keeps its own log, analysis, and mode.
- `features/hunt-comparison.js` only ranks Bestiary summaries that the hunt tabs already calculated.
- The repository root is limited to metadata, documentation, license material, and the GitHub Pages redirect entry point.
- GitHub automation lives under `.github/` and is separated from application source.
