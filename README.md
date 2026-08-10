# Bestiary Session Analyzer

Bestiary Session Analyzer answers one question for Tibia charm-point farming: given the hunting sessions you actually
played and the time you have tonight, which Bestiary entries can you finish and where should you hunt? It reads the kill
data out of the Hunt Analyzer text you paste and turns it into a route.

`Tasks` is a separate estimate for a single task target, kept apart from Bestiary because a task target is a number you
choose rather than a fixed unlock threshold.

## Terminology

- **Hunt Analyzer** is the data you paste. It is Tibia's own tool, named for hunting because that is what it is mostly
  used for.
- **Session** is what this app builds from one Hunt Analyzer: the Bestiary analysis derived from it. `+` adds a session
  by pasting and processing another Hunt Analyzer.
- **All Sessions** is the aggregated Bestiary workspace across every processed session.
- **Compare Sessions** ranks those sessions by their Bestiary result.
- **Charm Plan** optimizes across the sessions for the play time you have.
- **Bestiary** is what the player is completing, and **charm points** are the reward being optimized.

## Navigation

Two levels:

- `Bestiary` and `Tasks` are the top-level choice. They do not share a Hunt Analyzer paste or a workspace.
- Inside `Bestiary`, the tab bar reads `Charm Plan`, `All Sessions`, one tab per session, then `+` to add a session.
  `Compare Sessions` stays a separate action on the right.

Every view is one click from every other view, so re-checking a single creature never means restarting. From
`Charm Plan`, selecting the session tag on an entry or a route step opens that session directly; adjust its total kills
and return to `Charm Plan` to see the updated plan.

## What The Tool Does

- Parses the Hunt Analyzer text from Tibia.
- Extracts the session duration and killed monsters.
- In `Bestiary` mode, matches those monsters against the Bestiary dataset.
- In `Bestiary` mode, calculates kill rate, remaining kills, and estimated time to unlock.
- In `Bestiary` mode, lets you enter your current total kills to recalculate remaining time more accurately.
- In `Tasks`, lets you choose one creature from the session and estimate how long a task may take at that kill rate.
- Keeps each processed Hunt Analyzer as its own session, with its own creature selection and total kills.
- Compares the Bestiary result of the analyzed sessions and highlights the one with the highest charm rate.
- Provides a fixed `All Sessions` tab that combines the creatures of every analyzed session, once per session, into one Bestiary estimate.
- Plans a session against the hunting time you actually have, and works out which Bestiaries you can finish in it.
- Lets you ignore a session in `Charm Plan` while its spawn is taken, without touching the session itself.
- Exports the whole workspace to a file and imports it back, including everything you configured.

## How To Use It

1. Start a local static server from the repository root:

```bash
python3 -m http.server 4173
```

2. Open the app in your browser:

- `http://127.0.0.1:4173/src/`

3. Choose `Bestiary` or `Tasks` in the top-level navigation.
4. Paste the Hunt Analyzer text into the text area.
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
8. In `Tasks`, paste a session, select the task creature, and enter the total kills that task requires.
9. Use `Clear Log` or `Reset Totals` to reset the Hunt Analyzer text or manual kill totals of the selected session.

## Comparing Several Sessions

1. Analyze the first session as described above.
2. Click `+` to add another session, then paste and process the next Hunt Analyzer.
3. Switch between sessions at any time. Each keeps its own Hunt Analyzer, creature selection, and total kills.
4. Once two sessions have a Bestiary analysis, click `Compare Sessions`.
5. The comparison lists the `Total Charms`, `Longest Time Remaining`, and `Charm Rate` already calculated in each session, and marks the session with the highest charm rate as the best session.
6. Change the creature selection or total kills inside any session and compare again to see the updated ranking.

`Tasks` is separate and is never part of the Bestiary comparison.

### All Sessions

`All Sessions` is a fixed tab that cannot be closed and never changes position when sessions are added, closed, or
switched. It is the combined Bestiary workspace across every analyzed session:

- The entries are the `Bestiary Estimate` rows of each session, so a creature selected in several sessions appears once
  per session, tagged with the session that produced it, and entries grouped by creature sit side by side.
- Every row mirrors its source session row. Its total kills, unlock target, kill rate, kills remaining, time remaining,
  and per-creature charm rate are the values of that session. `All Sessions` never derives a combined kill rate or a new
  per-creature completion estimate.
- `All Sessions` keeps its own selection. Deselect the entries you do not plan to hunt, so a creature you analyzed in
  several sessions contributes its charm points once.
- Total kills are editable here. A value entered on an entry belongs to the session that produced it, so the same
  creature in another session keeps its own total.
- `Reset Totals` here clears the total kills of every session.

Only the summary is aggregated across sessions:

- `Total Charms` adds the remaining charm points of the selected entries, per session.
- `All Sessions Time` takes the longest time remaining among each session's selected entries and adds those times
  together, because the sessions are hunted one after another. Two sessions needing 3.0 h and 4.8 h give 7.8 h.
- `Charm Rate` is `Total Charms / All Sessions Time`. With 175 charm points over 7.8 h it is 22.44 charms/h.

`Charm Rate` means the same thing everywhere. A session divides its `Total Charms` by its `Longest Time Remaining`, and
`All Sessions` divides its `Total Charms` by `All Sessions Time`, so with a single analyzed session both views show the
same rate. The per-creature `Charm Rate` column stays a per-creature value and is not the sum of the session's rate.

`Compare Sessions` stays a separate action on the right of the tab bar and still shows the charm rate ranking.

## Charm Plan

`Charm Plan` is the first fixed tab and cannot be closed. It answers a different question from the estimate: given the
time you actually have, how many charm points can you finish?

- Accepts `90 min`, `1.5 h`, `2h 30min`, or `2:30`. A plain number counts as hours.
- `Available Sessions` lists every processed session so you can ignore the ones whose spawn is taken right now. The plan
  skips an ignored session and recalculates immediately.
- Charm points are discrete completion rewards. An entry at 80% progress contributes nothing, so only entries whose
  `Time Remaining` fits in the available time count.
- Already-completed entries add no time and no obtainable charms.
- Only selected creatures take part, so the `Select Creatures` state controls the plan.
- The summary shows `Play Time Available`, `Charm Points Obtainable`, `Time Used`, `Unused Time`, and
  `Bestiaries Completed`, followed by the entries that fit.

It plans across every available session and uses the same entries as `All Sessions`, so the session you picked there for
a Bestiary that appears in several sessions is the one the plan uses.

Ignoring is not deleting. It applies to `Charm Plan` only and is meant to be flipped as often as spawns change. An
ignored session keeps everything it had: its own tab and Bestiary estimate, its rows in `All Sessions`, its ranking in
`Compare Sessions`, and its place in the saved and exported workspace. Only the planner leaves it out. Processed
sessions are the opportunities you know about; available sessions are the ones you can use right now.

Inside one session, the selected creatures progress at the same time, so the planner never adds their times together: an
entry is finishable when its `Time Remaining` fits the time spent on that session. Across sessions, time is sequential,
so the planner treats each session's completion thresholds as its allocation options and searches every combination of
per-session time under the budget for the highest number of fully earned charm points, preferring the plan that uses
less time when two tie.

The `Recommended Route` then lists the order, the time for each step, the Bestiaries completed there, the charm points
earned, and the running total. Progress on a session is kept, so returning to it resumes where it left off and each
session needs only one visit.

## Export And Import

`Export` and `Import` sit at the top level, next to `Bestiary` and `Tasks`, because the file covers both.

`Export` downloads a single readable JSON file, `bestiary-sessions-YYYY-MM-DD.json`. It holds the whole workspace, not
just the pasted text:

- every session's Hunt Analyzer text and parsed session duration
- which creatures are selected in each session
- the total kills entered for each creature
- the `All Sessions` entry selection, so a duplicate you deselected stays deselected
- the `Play Time Available` value
- which sessions are ignored in `Charm Plan`
- the `Tasks` session, with its own Hunt Analyzer, chosen creature, and task target
- the mode and view you were on

`Import` reads that file back and restores all of it. It asks first if the current workspace has anything in it, since
importing replaces it. A file that is not valid JSON, came from another application, or holds no sessions is rejected
with a reason, and the current workspace is left untouched.

The stored session in your browser is per browser tab and disappears when the tab closes. Export is how you keep a
workspace, move it to another browser, or share it.

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

## Architecture

- `src/index.html` is the application entry point.
- `src/app/main.js` wires browser events, state restoration, and rendering.
- `src/app/features` contains shared log parsing, the Bestiary and Tasks calculations, the comparison ranking, and the charm planner.
- `src/app/services` contains data-loading concerns.
- `src/app/ui` renders the session tabs, the per-view results, summary metrics, the charm plan, and the comparison.
- `src/app/state` owns the sessions, persists the workspace in `sessionStorage`, and handles file export and import.
- The comparison consumes the same Bestiary summary each session displays, so both views always agree.
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
