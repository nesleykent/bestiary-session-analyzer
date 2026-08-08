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
- Provides a fixed `All Tabs` tab that combines the creatures of every analyzed hunt, once per hunt, into one Bestiary estimate.
- Plans a session against the hunting time you actually have, and works out which Bestiaries you can finish in it.

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

### All Tabs

`All Tabs` is the first tab of the tab bar, before the hunt tabs. It cannot be closed and never changes position
when hunt tabs are added, closed, or switched. It is the combined Bestiary workspace across every analyzed hunt:

- The entries are the `Bestiary Estimate` rows of each hunt tab, so a creature selected in several hunts appears once
  per hunt, tagged with the hunt that produced it, and entries grouped by creature sit side by side.
- Every row mirrors its source hunt row. Its total kills, unlock target, kill rate, kills remaining, time remaining,
  and per-creature charm rate are the values of that hunt. `All Tabs` never derives a combined kill rate or a new
  per-creature completion estimate.
- `All Tabs` keeps its own selection. Deselect the entries you do not plan to hunt, so a creature you analyzed in
  several hunts contributes its charm points once.
- Total kills are editable here. A value entered on an entry belongs to the hunt that produced it, so the same
  creature in another hunt keeps its own total.
- `Reset Totals` here clears the total kills of every hunt.

Only the summary is aggregated across hunts:

- `Total Charms` adds the remaining charm points of the selected entries, per hunt.
- `All Tabs Time` takes the longest time remaining among each hunt's selected entries and adds those hunt times
  together, because the hunts are hunted one after another. Two hunts needing 3.0 h and 4.8 h give 7.8 h.
- `Charm Rate` is `Total Charms / All Tabs Time`. With 175 charm points over 7.8 h it is 22.44 charms/h.

`Charm Rate` means the same thing everywhere. A hunt tab divides its `Total Charms` by its `Longest Time Remaining`,
and `All Tabs` divides its `Total Charms` by `All Tabs Time`, so with a single analyzed hunt both views show the same
rate. The per-creature `Charm Rate` column stays a per-creature value and is not the sum of the hunt's rate.

`Compare Hunts` stays a separate action on the right of the tab bar and still shows the charm rate ranking.

## Charm Plan

`Charm Plan` is its own fixed tab, next to `All Tabs` and before the hunt tabs. It cannot be closed. It answers a
different question from the estimate: given the time you actually have, how many charm points can you finish?

- Accepts `90 min`, `1.5 h`, `2h 30min`, or `2:30`. A plain number counts as hours.
- Charm points are discrete completion rewards. An entry at 80% progress contributes nothing, so only entries whose
  `Time Remaining` fits in the available time count.
- Already-completed entries add no time and no obtainable charms.
- Only selected creatures take part, so the `Select Creatures` state controls the plan.
- The summary shows `Play Time Available`, `Charm Points Obtainable`, `Time Used`, `Unused Time`, and
  `Bestiaries Completed`, followed by the entries that fit.

It plans across every analyzed hunt and uses the same entries as `All Tabs`, so the creature you picked there for a
Bestiary that appears in several hunts is the one the plan uses.

Inside one hunt, the selected creatures progress at the same time, so the planner never adds their times together: an
entry is finishable when its `Time Remaining` fits the time spent in that hunt. Across hunts, time is sequential, so the
planner treats each hunt's completion thresholds as its allocation options and searches every combination of per-hunt
time under the budget for the highest number of fully earned charm points, preferring the plan that uses less time when
two tie.

The `Recommended Hunt Route` then lists the order, the time for each step, the Bestiaries completed there, the charm
points earned, and the running total. Progress inside a hunt is kept, so returning to a hunt resumes where it left off
and each hunt needs only one visit.

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
