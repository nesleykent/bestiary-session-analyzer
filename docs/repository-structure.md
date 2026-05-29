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
|   |   |   |-- session-analysis.js
|   |   |   |-- session-parser.js
|   |   |   `-- task-analysis.js
|   |   |-- services/
|   |   |   `-- bestiary-repository.js
|   |   |-- state/
|   |   |   `-- session-store.js
|   |   |-- ui/
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
- The repository root is limited to metadata, documentation, license material, and the GitHub Pages redirect entry point.
- GitHub automation lives under `.github/` and is separated from application source.
