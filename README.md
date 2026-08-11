# Bestiary Session Analyzer

Bestiary Session Analyzer answers one question for Tibia charm-point farming: given the hunting sessions you actually
played and the time you have tonight, which Bestiary entries can you finish and where should you hunt? It reads the kill
data out of the Hunt Analyzer text you paste and turns it into a route.

`Tasks` is the second mode, not a Bestiary feature. It answers a different question from the same sessions: how long will
this task target take at the performance this session recorded? A task target is a number you choose rather than a fixed
unlock threshold, so it never enters the charm-point maths.

## Terminology

- **Hunt Analyzer** is the data you paste. It is Tibia's own tool, named for hunting because that is what it is mostly
  used for.
- **Session** is what this app builds from one Hunt Analyzer: the Bestiary analysis derived from it. `+` adds a session
  by pasting and processing another Hunt Analyzer.
- **Library** is the archive of every stored session, where you name them, date them and note the conditions.
- **All Sessions** is the aggregated Bestiary workspace across every processed session.
- **Compare Sessions** ranks those sessions by their Bestiary result.
- **Charm Plan** optimizes across the sessions for the play time you have.
- **Bestiary** is what the player is completing, and **charm points** are the reward being optimized.

Two different numbers are both called "kills", and keeping them apart is the point of the design:

- **Session kills** are the kills in one Hunt Analyzer. They measure *speed* — the kill rate and charm rate a session
  can sustain — and belong to that session alone.
- **Total kills** are your Bestiary progress. They measure *how far along* an entry is, they are a single player-wide
  number per creature, and they live in the `Bestiary` tab. Every session reads the same value, so a creature that
  appears in three logs can no longer hold three disagreeing totals.

Three separate ideas control what `Charm Plan` uses:

- **Respawn mode** is session metadata: the spawn conditions that Hunt Analyzer was recorded under, `Regular` or
  `Rapid Respawn`. Set it in the session's own tab.
- **Availability** is a temporary planning constraint you flip as spawns get taken.
- **Plan respawn mode** is the environment you are planning for right now.

## The Three Modes

`Sessions` and `Tasks` are built from the same pasted logs; `Trackers` is your own progress record that both read
from. Each tracker is one collection you are completing — `Bestiary` today, with more sharing the same engine.

| | Sessions | Trackers | Tasks |
|---|---|---|---|
| Question | What should I complete for charm points? | Where am I across everything? | How long will this task target take? |
| Scope | The logs you pasted | Every tracked collection | The logs you pasted |
| Focus | Charm points | Progress, points, completion | Kill target |
| Extra views | `Charm Plan`, `All Sessions`, `Library`, `Compare Sessions` | one tab per tracker | `All Sessions`, `Library` |

Switching modes never asks you to paste again. Charm points, charm rate, `Charm Plan`, `Compare Sessions`, and Bestiary
completion never appear in the Tasks flow.

## Navigation

Two levels:

- `Sessions`, `Trackers` and `Tasks` are the top-level choice. All three share the same stored logs and the same
  tracker progress.
- Inside `Sessions`: `Charm Plan`, `Opportunities`, `All Sessions`, `Library`, one tab per session, `+` to add a
  session, and `Compare Sessions` as a separate action on the right.
- Inside `Trackers`: one tab per tracker, each showing its own progress — `Bestiary`, `Bosstiary`, `Charms`,
  `Achievements`, `Quests`, `Titles` and `Measuring Tibia`. Adding another is a definition plus a dataset.
- Inside `Tasks`: `All Sessions`, `Library`, one tab per session, and `+`. No `Charm Plan` and no `Compare Sessions`.

Every view is one click from every other view, so re-checking a single creature never means restarting. From
`Charm Plan`, selecting the session tag on an entry or a route step opens that session directly; adjust its total kills
and return to `Charm Plan` to see the updated plan.

## Tasks

1. Open `Tasks`, then pick a session or process a Hunt Analyzer into one.
2. Select the creature your task asks for.
3. Enter the task target.
4. Read the session kills, kill rate, kills remaining, and estimated time to finish.

The session is the evidence. Its recorded respawn mode travels with the estimate, stated alongside it, because a rate
measured under `Rapid Respawn` is not interchangeable with one measured under `Regular`. Tasks has
no respawn filter and no availability control: it estimates from the one session you selected rather than optimizing
across sessions. `All Sessions` in Tasks lists one row per processed session with its own creature and target.

## What The Tool Does

- Parses the Hunt Analyzer text from Tibia.
- Extracts the session duration and killed monsters.
- In `Bestiary` mode, matches those monsters against the Bestiary dataset.
- In `Bestiary` mode, calculates kill rate, remaining kills, and estimated time to unlock.
- In `Bestiary` mode, lets you enter your current total kills to recalculate remaining time more accurately.
- In `Tasks`, lets you choose one creature per session and estimate how long a task target takes at that session's kill rate.
- Keeps each processed Hunt Analyzer as its own session, with its own creature selection and total kills.
- Compares the Bestiary result of the analyzed sessions and highlights the one with the highest charm rate.
- Provides a fixed `All Sessions` tab that combines the creatures of every analyzed session, once per session, into one Bestiary estimate.
- Plans a session against the hunting time you actually have, and works out which Bestiaries you can finish in it.
- Answers what you are *missing* under `Opportunities`, not only what your sessions can see: the charm points still
  unclaimed, the entries closest to unlocking, locations ranked by the points left in them, and entries you started
  but no stored session covers any more. Most of the points available are in creatures no log has ever mentioned,
  so this is the part a session-only analysis cannot reach.
- Records each session's respawn mode and lets `Charm Plan` plan for one mode at a time.
- Lets you ignore a session in `Charm Plan` while its spawn is taken, without touching the session itself.
- Keeps a `Library` of every stored session with a name, a hunt date and free-text notes, sortable by any column and filterable by respawn mode or a search across names, notes and creatures.
- Tracks the Cyclopedia Map discovery quest under `Trackers`: 20 areas and their 171 subareas, with how many Bestiary creatures live in each. Completing every subarea of an area earns that area's achievement, which is filled in under `Achievements` automatically rather than recorded twice.
- Tracks all 570 achievements under `Trackers`, with what it takes to earn each one, its grade, category and community rarity, filterable by any of those. Points and the unlocked count are reported separately, and the one `Removed` achievement is excluded from both because it can no longer be earned.
- Tracks your whole Bestiary under `Trackers`: all 833 creatures with your kills, `Echo Warden` and `Animus Mastery` flags, and a bookmark, filterable by class, status, bookmark and Echo Warden eligibility. Sorting, filtering, paging, totals and import/export are shared by every tracker.
- Reports charm points, the separate `Echo Warden` pool, and completion as three independent totals.
- Imports tracker progress from a CSV or a TibiaDraptor JSON export, and exports it back to CSV losslessly. Only your own progress is read; points and thresholds always come from the game data.
- Exports the whole workspace to a file and imports it back, including everything you configured.
- Persists the workspace in `localStorage`, so closing the tab no longer discards it.

## How To Use It

1. Start a local static server from the repository root. Port **4173** is the one port this project uses; stop any
   previous one first rather than starting a second:

```bash
pkill -f "http.server 4173"; python3 -m http.server 4173 --bind 127.0.0.1
```

2. Open the app in your browser:

- `http://127.0.0.1:4173/src/`

   After editing a module or the stylesheet, reload with `Cmd+Shift+R` (or `Ctrl+Shift+R`). `http.server` sends no
   cache headers, so a plain reload can keep running the previous version of `src/app/**/*.js`. See
   [CONTRIBUTING.md](CONTRIBUTING.md#stale-modules-are-the-trap) for a no-cache server if you prefer.

3. Choose `Sessions`, `Bestiary` or `Tasks` in the top-level navigation.
4. Paste the Hunt Analyzer text into the text area.
5. Click `Process Log`. The paste area collapses to a one-line session summary; click that line to edit the text
   or the recorded respawn mode again.
6. In `Bestiary` mode, review the generated table for:
   - Creature name
   - Session kills
   - Kills to unlock
   - Kill rate
   - Kills left
   - Estimated time remaining
   - Charms per hour
7. Fill in `Total Kills` for any creature, either in the session table or in the `Bestiary` tab. The estimate applies
   when you leave the field, so pressing `Tab` or `Enter` or clicking elsewhere is enough. Because that number is your
   Bestiary progress, editing it anywhere updates every session that features the creature.
   Faster still: open `Bestiary` and import your progress once, and every session is correct without typing anything.
8. In `Tasks`, select the task creature for a session and enter the total kills that task requires.
9. Use `Clear Log` to discard a session's Hunt Analyzer text. `Reset Totals` clears your saved Bestiary kills for the
   creatures in view and asks first, because that is real progress rather than a per-session value.

## Comparing Several Sessions

1. Analyze the first session as described above.
2. Click `+` to add another session, then paste and process the next Hunt Analyzer.
3. Switch between sessions at any time. Each keeps its own Hunt Analyzer, recorded respawn mode, Bestiary creature
   selection and total kills, and task creature and target.
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
- `Plan For Respawn Mode` picks the environment you are planning for. Only sessions recorded in that mode are used.
- `Sessions Considered` lists every processed session with its recorded mode and why it is or is not being used:
  `Available`, `Wrong respawn mode`, or `Spawn unavailable`. `Ignore` and `Enable` flip availability from there, and the
  plan recalculates immediately.
- A session is used only when both hold: it is available, and its recorded respawn mode matches the plan mode.
- Charm points are discrete completion rewards. An entry at 80% progress contributes nothing, so only entries whose
  `Time Remaining` fits in the available time count.
- Already-completed entries add no time and no obtainable charms.
- Only selected creatures take part, so the `Select Creatures` state controls the plan.
- The summary shows `Play Time Available`, `Charm Points Obtainable`, `Time Used`, `Unused Time`, and
  `Bestiaries Completed`, followed by the entries that fit.

It plans across every available session and uses the same entries as `All Sessions`, so the session you picked there for
a Bestiary that appears in several sessions is the one the plan uses.

Recorded respawn modes are never converted. A `Rapid Respawn` session keeps the kill rates it was recorded with, and it
is simply not considered while you plan for `Regular`. The same holds in reverse.

Excluding is not deleting, for either reason. It applies to `Charm Plan` only and is meant to be flipped as often as spawns change. An
excluded session keeps everything it had: its own tab and Bestiary estimate, its rows in `All Sessions`, its ranking in
`Compare Sessions`, `Tasks`, and its place in the saved and exported workspace. Only the planner leaves it out. Processed
sessions are the opportunities you know about; eligible sessions are the ones you can use right now.

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
- each session's recorded respawn mode, and the mode `Charm Plan` is planning for
- each session's task creature and task target
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
|   |   |   |-- opportunity-analysis.js
|   |   |   |-- session-analysis.js
|   |   |   |-- session-parser.js
|   |   |   `-- task-analysis.js
|   |   |-- services/
|   |   |   |-- achievements-repository.js
|   |   |   |-- bestiary-repository.js
|   |   |   |-- bosstiary-repository.js
|   |   |   |-- charms-repository.js
|   |   |   |-- measuring-tibia-repository.js
|   |   |   |-- quests-repository.js
|   |   |   `-- titles-repository.js
|   |   |-- state/
|   |   |   |-- hunt-workspace.js
|   |   |   |-- local-store.js
|   |   |   |-- tracker-progress.js
|   |   |   |-- tracker-transfer.js
|   |   |   `-- workspace-transfer.js
|   |   |-- trackers/
|   |   |   |-- achievements.js
|   |   |   |-- bestiary.js
|   |   |   |-- bosstiary.js
|   |   |   |-- charms.js
|   |   |   |-- measuring-tibia.js
|   |   |   |-- quests.js
|   |   |   |-- registry.js
|   |   |   `-- titles.js
|   |   |-- ui/
|   |   |   |-- render-all-tabs.js
|   |   |   |-- render-blocks.js
|   |   |   |-- render-charm-plan.js
|   |   |   |-- render-comparison.js
|   |   |   |-- render-hunt-tabs.js
|   |   |   |-- render-opportunities.js
|   |   |   |-- render-results.js
|   |   |   |-- render-session-library.js
|   |   |   |-- render-tracker.js
|   |   |   |-- render-task-results.js
|   |   |   `-- render-task-sessions.js
|   |   |-- utils/
|   |   |   `-- formatters.js
|   |   `-- main.js
|   |-- data/
|   |   |-- achievements.json
|   |   |-- bestiary.json
|   |   |-- bosstiary.json
|   |   |-- charms.json
|   |   |-- measuring-tibia.json
|   |   |-- quests.json
|   |   `-- titles.json
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
- `src/app/ui` renders the session tabs, the per-view results, the charm plan, and the comparison.
- `src/app/ui/render-blocks.js` holds the shared presentation primitives every view is built from, so the same
  information reads the same way everywhere. The Bestiary estimate table in a session and in `All Sessions` comes from
  one builder and cannot drift.
- `src/app/state` owns the sessions and the Bestiary progress record, persists the workspace in `localStorage`, and handles file export and import.
- `src/app/trackers` holds one definition per tracker — its columns, filters, totals and import format. Adding a tracker is a definition plus a dataset, not a new view, store or navigation.
- `src/app/state/tracker-progress.js` stores only what cannot be derived, keyed by tracker: kills for a counter, a done flag for a checklist, plus the tracker's own flags. Status, points earned and remaining are derived from the game data, so a rebalanced item is picked up instead of going stale in a saved file. Field types come from the shape of each tracker's declared defaults, so no tracker writes its own coercion code.
- `src/app/ui/render-tracker.js` is the one table every tracker renders through, so they cannot drift apart.
- The comparison consumes the same Bestiary summary each session displays, so both views always agree.
- `src/data` stores application-owned datasets.

## Data Sources

Game data is stored as dated snapshots. It is read-only: the app never writes to it, and it always wins over a
value carried in an imported file, because an export goes stale as soon as CipSoft rebalances something.

| File | Contents | Source |
|---|---|---|
| `src/data/bestiary.json` | 833 creatures — charm points, stage thresholds, class, difficulty, occurrence, locations, Echo Warden eligibility | [TibiaDraptor](https://tibiadraptor.com/) |
| `src/data/bosstiary.json` | 316 bosses — three stage thresholds and the points each awards, category | [TibiaDraptor](https://tibiadraptor.com/) |
| `src/data/charms.json` | 25 charms — 14 Major and 11 Minor, three stages each with cost and effect value | [TibiaDraptor](https://tibiadraptor.com/) |
| `src/data/achievements.json` | 570 achievements and 18 categories — points, grade, secret flag, spoiler, community rarity | [TibiaDraptor](https://tibiadraptor.com/) |
| `src/data/quests.json` | 237 quests across 94 questlogs, with rewards | [TibiaDraptor](https://tibiadraptor.com/) |
| `src/data/titles.json` | 113 titles — how to earn each, and whether it is permanent | [TibiaDraptor](https://tibiadraptor.com/) |
| `src/data/measuring-tibia.json` | 20 Cyclopedia Map areas, 171 subareas, and the achievement each area awards | [Tibiopedia.pl](https://tibiopedia.pl/quests/Measuring_Tibia_Quest) |

Charms are bought in **two different currencies**, which the tracker keeps apart because they cannot be added
together:

- **Major charms** (14) cost **charm points**, earned from the Bestiary — including the points an Echo Warden first
  kill awards. Maxing all of them needs 48,900, and only 37,231 charm points exist in the game.
- **Minor charms** (11) cost **Minor Charm Echoes**, which are not charm points. Echoes are earned by unlocking
  Major charm stages — 50, 100 and 200 for stages 1, 2 and 3 — so majors fund minors. A promoted character also
  receives 100. Maxing all 11 minors needs 5,225 echoes, while maxing every major generates 4,900.

Upstream names are not tidy — 47 quest names and one achievement name carry a trailing space — so names are trimmed
when the data is read and keys are matched whitespace-insensitively. Without both, importing a progress CSV silently
skipped every affected row.

Two things worth knowing about the achievements data:

- **569 of the 570 are obtainable.** One (`The More the Merrier`) sits in the `Removed` category and is excluded
  from the totals, which is why the count reads 569.
- **The obtainable total is 1,499 points, not the 1,490 TibiaDraptor's own header shows.** Their aggregate predates
  five achievements added in August 2026 that are present in the data. The app totals what the dataset actually
  contains rather than repeating a stale figure.

Achievement names are canonicalised across the two sources at capture time, so the Measuring Tibia areas join the
achievements list on exact string equality — Tibiopedia writes `Mummys Dearest` and `King of the Jungle` where
TibiaDraptor writes `Mummy's Dearest` and `King Of The Jungle`.

## Automation

- `.github/workflows/ci.yml` validates repository structure and JSON integrity on pushes and pull requests.
- `.github/workflows/deploy-pages.yml` publishes the static site to GitHub Pages.

## Documentation

- [Repository structure](docs/repository-structure.md)

## License

Released under the terms of the [LICENSE](LICENSE).
