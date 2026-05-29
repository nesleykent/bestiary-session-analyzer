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

## Notes

- All application runtime code lives under `src/`.
- The repository root is limited to metadata, documentation, license material, and the GitHub Pages redirect entry point.
- GitHub automation lives under `.github/` and is separated from application source.
