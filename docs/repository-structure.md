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
|   |   |   |-- session-store.js
|   |   |   `-- workspace-transfer.js
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
- Bestiary and Tasks are separate top-level modes with their own Hunt Analyzer paste; sessions and the tab bar belong to Bestiary only.
- `state/hunt-workspace.js` owns the session collection. Each session is the Bestiary analysis of one pasted Hunt Analyzer.
- `features/hunt-comparison.js` only ranks and combines Bestiary results that the sessions already calculated.
- The tab bar reads Charm Plan, All Sessions, then one tab per session; `Compare Sessions` renders the charm rate ranking separately.
- `state/workspace-transfer.js` serializes the workspace to a file and validates one on the way back in.
- Respawn mode is session metadata, availability is a workspace-level ignore list, and the plan's own respawn mode is a
  separate workspace value. All three filter only the planner's input, never a session's own data.
- `features/charm-plan.js` plans against available time only, and reads the per-creature times the session estimates produced.
- All Sessions rows are each session's own estimate rows. Only its summary aggregates them, by adding each session's longest time.
- The repository root is limited to metadata, documentation, license material, and the GitHub Pages redirect entry point.
- GitHub automation lives under `.github/` and is separated from application source.
