# Bestiary Session Analyzer

> **Working name:** Bestiary Session Analyzer is still the repository and application name. The product now covers much more than Bestiary session analysis; the name will change only after a better one is chosen.

**A local-first Tibia character-progression, hunt-analysis, and objective-planning workspace.**

[Open the application](https://nesleykent.github.io/bestiary-session-analyzer/) · [Report a bug](https://github.com/nesleykent/bestiary-session-analyzer/issues)

Tibia spreads a character's progression across the Cyclopedia, Quest Log, achievements, titles, the Task Board, and hunting analytics. This application brings those systems into one character record, learns realistic kill rates from the player's own Hunt Analyzer sessions, and turns the combined information into practical estimates and plans.

It is not an automatic Tibia profile mirror. The player owns and records the progress; the application preserves it, connects it, and helps answer:

- What has this character completed?
- What remains unfinished?
- Which measured hunt advances the Bestiary most efficiently?
- What can be completed in the time available?
- How long will a Bounty or Weekly Kill Task take at this character's measured rate?

## Product model

The application keeps three kinds of information separate:

| Layer | Meaning | Examples |
|---|---|---|
| **Character progress** | Persistent truth about one character | Bestiary kills, Bosstiary stages, unlocked charms, achievements, quests, titles, discovered areas |
| **Hunt evidence** | Performance measured from one copied Hunt Analyzer | Duration, creatures killed, kill rate, respawn mode, date, route notes |
| **Decision support** | Calculations built from progress and evidence | Completion estimates, Opportunities, session comparison, Charm Points Plan, task estimates |

This separation is important. A Hunt Analyzer measures how quickly a creature was killed; it does not replace the character's Bestiary total. A Bestiary total entered once is shared by every session, Opportunity, comparison, and plan for that character.

## Feature reference

### Dashboard

The **Dashboard** summarizes the current character record using the same calculations as the individual trackers. It provides direct entry points to Bestiary, Bosstiary, Charms, Achievements, Quests, Titles, and Measuring Tibia.

### Bestiary

**Purpose:** Tracks the character's Bestiary progress and charm points across creatures. This is the current progression state used by Bestiary analysis, Opportunities, comparison, and planning.

The tracker currently covers 833 creatures and records:

- Tibia's visible Bestiary stage: `?`, `0/3`, `1/3`, `2/3`, or complete;
- an exact kill count when the player has one;
- kills remaining and completion percentage;
- charm points earned on completion;
- Echo Warden progress and its additional charm-point reward;
- Animus Mastery;
- bookmarks.

An exact kill count takes precedence over a stage. When only a stage is known, the application uses the minimum kill count implied by that stage and labels resulting estimates as bounds rather than pretending the exact total is known.

Tibia awards the normal Bestiary charm-point reward when the third detail stage is completed. Echo Warden rewards are tracked separately in the Bestiary totals while still contributing to the character's available charm-point budget.

### Bosstiary

**Purpose:** Tracks the character's Bosstiary progress across bosses.

The tracker covers 316 bosses and follows Tibia's three Bosstiary progress levels:

- **Prowess** — makes the boss eligible for a boss slot;
- **Expertise** — unlocks the boss for a Podium of Vigour;
- **Mastery** — provides the additional boss-slot equipment-loot bonus.

Bosses retain their Bane, Archfoe, or Nemesis category, because those categories determine the kill thresholds. The tracker records kills, current and next level, kills remaining, boss points earned, and bookmarks. Boss points are awarded at each reached progress level, so partial Bosstiary completion can already contribute points.

### Charms

**Purpose:** Tracks the progression of unlocking Major and Minor charms using the currencies connected to Bestiary progression, while keeping charm effects and costs available for reference.

The tracker covers 25 charms, each with three unlock or upgrade stages:

- **Major Charms** spend charm points earned through Bestiary and Echo Warden progression.
- Unlocking and upgrading Major Charms generates **Minor Charm Echoes**.
- **Minor Charms** spend Minor Charm Echoes, not charm points.
- A promoted character receives an additional Minor Charm Echo allocation in Tibia.

For every charm, the application shows its type, current stage, effect, amount spent, next-stage cost, total cost, status, and bookmark. It keeps the two currencies separate and compares recorded Major Charm spending with the charm points earned in the Bestiary tracker.

### Achievements

**Purpose:** Tracks completed achievements and achievement-point progression.

The tracker covers 570 achievements with:

- earned state;
- achievement points and grade;
- category;
- secret status;
- community rarity;
- the requirement or spoiler text;
- bookmarks.

Earned count and achievement points are reported separately. Achievements in the `Removed` category remain searchable but are excluded from obtainable totals. Achievements awarded by completing Measuring Tibia areas are derived automatically instead of being recorded twice.

### Quests

**Purpose:** Tracks quest completion states for the character and keeps questlog group and reward information searchable.

The current dataset contains 237 quests across 94 questlogs. The tracker records whether each quest is completed, not completed, or not yet reviewed, plus bookmarks. It also shows the related questlog and reward information.

**Current boundary:** Tibia's Quest Log can expose individual missions inside a questline, but this application currently tracks completion at the quest level; it does not yet model arbitrary mission-by-mission progress.

### Titles

**Purpose:** Tracks character titles and whether they are currently unlocked.

The tracker covers 113 titles and records earned state and bookmarks. It also shows each title's requirement and whether the title is permanent or can be lost when its condition is no longer met. This distinction matters because Tibia awards and removes some titles dynamically when the character logs in.

### Measuring Tibia

**Purpose:** Tracks Measuring Tibia Quest and Cyclopedia Map area progression, including the subareas required to complete each area.

The tracker covers 20 areas and 171 subareas. It records discovered subareas, groups them by area, shows how many Bestiary creatures are associated with each subarea, and derives:

- area completion;
- overall map progress;
- the achievement awarded by a completed area.

Since Tibia's 2026 discovery update, subareas are active automatically and fully discovered areas also contribute to the character's area speed bonus. The application tracks the discovery completion state; it does not simulate point-of-interest locations.

### Shared tracker tools

All seven trackers use the same progress framework:

- search, sorting, filters, status, and bookmarks;
- paged, density-preserving entry lists;
- explicit distinction between **not recorded** and a confirmed zero/no;
- CSV import and export;
- TibiaDraptor JSON progress import for Bestiary and Bosstiary;
- entry details without leaving the tracker;
- immediate undo for progress edits, including `Cmd+Z` or `Ctrl+Z`.

**Record progress** (`/`) searches every tracker and updates one value without making the player navigate away from the current task.

The detailed manual-entry contract is documented in [Tracker Data Entry UX](docs/tracker-data-entry-ux.md).

## Bestiary planning and Hunt Analyzer sessions

### Bestiary Session

**Purpose:** Converts one copied Hunt Analyzer into a Bestiary completion estimate using the active character's actual progress.

Processing a session:

1. reads the session duration;
2. reads the creature kills between `Killed Monsters:` and `Looted Items:`;
3. matches creature names against the bundled Bestiary dataset;
4. calculates each matched creature's measured kill rate;
5. combines that rate with the character-wide Bestiary total;
6. estimates kills remaining, time remaining, and charm-point efficiency.

Each session also stores a name, hunt date, notes, selected creatures, and whether it was measured under `Regular` or `Rapid Respawn` conditions.

### Bestiary Sessions

**Purpose:** Presents the Bestiary estimates from all processed sessions in one workspace.

If the same creature appears in several sessions, it remains one candidate per session because each hunt may have a different measured rate. Every candidate reads the same character-wide Bestiary progress. The player selects which session should represent an objective so the same completion reward is not intentionally planned twice.

For the combined summary, creatures inside one session progress simultaneously, while separate sessions consume time sequentially.

### Charm Points Plan

**Purpose:** Helps players plan and optimize Bestiary progression using current Bestiary progress, measured Hunt Analyzer rates, charm-point rewards, available time, and current spawn conditions.

The plan accepts time such as `90 min`, `1.5 h`, `2h 30min`, or `2:30`. It then:

- considers only selected Bestiary entries;
- filters sessions by `Regular` or `Rapid Respawn` mode;
- allows a taken or otherwise unavailable spawn to be ignored temporarily;
- treats time spent in one session as progress for all selected creatures in that session;
- treats time across different sessions as sequential;
- awards charm points in the plan only when a Bestiary entry reaches completion;
- searches the feasible session allocations for the most charm points within the time budget;
- prefers the plan that uses less time when equal rewards are possible;
- returns the entries that fit and an ordered recommended route.

Partial progress is never discarded. It simply does not produce the immediate charm-point reward until the Bestiary entry is completed.

### Opportunities

**Purpose:** Identifies unfinished Bestiary progression opportunities and surfaces creatures and locations that remain useful candidates for future hunting.

Opportunities crosses the entire Bestiary dataset with character progress and the fastest measured rate for each creature. It provides four complementary views:

- **Finishable Now** — unfinished creatures with a stored measured rate, ranked by projected charm points per hour;
- **Quick Wins** — started entries closest to completion, whether or not a session covers them;
- **Where To Go** — locations ranked by the charm points still unclaimed among their creatures;
- **Started And Dropped** — unfinished progress for which no stored session currently provides a rate.

This is intentionally broader than session analysis: creatures that have never appeared in a saved Hunt Analyzer can still be valuable opportunities.

### Session History, management, and comparison

**Purpose:** Preserves measured Hunt Analyzer sessions for later reference, comparison, correction, and planning.

**Session History** stores every session's:

- name and hunt date;
- raw Hunt Analyzer text and duration;
- recorded respawn mode;
- matched and selected creatures;
- notes about route, party, boosts, or other conditions;
- calculated charm points and charm rate;
- task creature and target.

The history can be searched across session names, notes, and creatures; filtered by respawn mode; sorted by any displayed measurement; reopened; renamed; edited; or deleted.

**Compare Sessions** ranks analyzed Bestiary sessions using the same summaries shown inside those sessions:

- charm points remaining in the selected entries;
- longest completion time within the session;
- projected charm points per hour.

### Task Sessions and Task Estimate

**Purpose:** Organizes and estimates creature-kill objectives—particularly Bounty Tasks and Weekly Kill Tasks—using performance measured from corresponding Hunt Analyzer sessions.

The task flow is separate from Bestiary thresholds and charm calculations. For each session, the player chooses one observed creature and enters the desired kill target. The application reports:

- kills already measured in the session;
- measured kills per hour;
- target kills;
- kills remaining;
- estimated remaining time and total time;
- the respawn mode under which the rate was measured.

This applies to creature-kill objectives. Tibia's Weekly Delivery Tasks are not kill-rate estimates and are therefore outside this feature.

## Calculation contract

### Per-creature Bestiary estimate

```text
kill rate per minute = session kills / session duration
kills remaining      = max(0, unlock target - character total kills)
time remaining       = kills remaining / kill rate per minute
charm rate per hour  = charm-point reward / time remaining × 60
```

The per-creature rate is annualised to one hour without capping it at the reward. For example, completing a 15-point entry in 30 minutes is correctly reported as `30 charm points/h`.

### Session summary

```text
session charm points = sum of rewards for selected, incomplete entries
session time         = longest remaining time among those entries
session charm rate   = session charm points / session time × 60
```

The longest time is used because creatures killed in the same spawn advance together.

### All-session summary

```text
combined time       = sum of each participating session's longest time
combined charm rate = selected charm points / combined time × 60
```

### Task estimate

```text
kill rate per hour = session creature kills / session duration × 60
kills remaining    = max(0, target kills - session creature kills)
remaining time     = kills remaining / measured kill rate
```

All projections assume the measured rate can be sustained. Competition, route changes, party composition, boosts, fatigue, and respawn conditions can change the real result.

## Data ownership and persistence

| Information | Owner | Persistence |
|---|---|---|
| Tracker progress | Character record | Browser local storage |
| Bestiary exact kills/stages | Character | Shared by every session and plan for that character |
| Hunt Analyzer text and measured rate | Session | Session History |
| Session name, date, notes, and respawn mode | Session | Session History |
| Bestiary creature selection | Session | Browser local storage |
| Task creature and target | Session | Browser local storage |
| Available play time and plan eligibility | Character record | Browser local storage |
| Sort, search, filters, paging, open panels | View state | Intentionally temporary |

The application is static and requires no account or backend. Data is stored in browser `localStorage`, so it survives tab closure and browser restarts but remains local to that browser profile.

Individual trackers support CSV export and reviewed CSV import. Bestiary and Bosstiary also accept TibiaDraptor JSON progress imports. Hunt sessions and planning state persist automatically in the current browser profile.

The application does not request Tibia credentials or connect to a Tibia account.

## Running locally

This is a dependency-free static application.

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:4173/src/
```

Python's basic server can leave JavaScript modules cached. After source changes, use a hard reload (`Cmd+Shift+R` or `Ctrl+Shift+R`) or use the no-cache server documented in [CONTRIBUTING.md](CONTRIBUTING.md).

### Accepted Hunt Analyzer shape

```text
Session: 01:30h
Killed Monsters:
    250x Rotworm
    500x Cyclops
Looted Items:
```

The parser currently expects `Session: HH:MMh` and creature lines formatted as `<count>x <name>` between the killed-monster and looted-item headings.

## Repository structure

```text
src/
├── app/
│   ├── features/   # parser, Bestiary analysis, comparison, opportunities, plans, tasks
│   ├── services/   # read-only dataset repositories
│   ├── state/      # character records, sessions, progress, persistence, transfer, undo
│   ├── trackers/   # tracker-specific rules, controls, totals, and transfer formats
│   ├── ui/         # shared and feature-specific renderers
│   └── main.js     # application state orchestration and browser events
├── data/           # bundled Tibia metadata snapshots
├── styles/         # design tokens and application styles
└── index.html      # application entry point
```

The important boundaries are:

- game metadata is read-only;
- saved files store player-owned progress rather than duplicated derived totals;
- tracker definitions own their rules and totals;
- shared renderers keep tracker behavior consistent;
- sessions own hunt evidence, not character-wide Bestiary progress;
- planning and comparison consume the same session calculations shown to the player;
- Measuring Tibia derives area achievements instead of duplicating completion state.

See [Repository Structure](docs/repository-structure.md), [Product Journey](docs/product-journey.md), and [UX Journey System](docs/ux-journey-system.md) for deeper implementation and product context.

## Bundled datasets

| Dataset | Snapshot contents | Application source |
|---|---:|---|
| Bestiary | 833 creatures | [TibiaDraptor](https://tibiadraptor.com/) |
| Bosstiary | 316 bosses | [TibiaDraptor](https://tibiadraptor.com/) |
| Charms | 25 Major and Minor charms | [TibiaDraptor](https://tibiadraptor.com/) |
| Achievements | 570 achievements | [TibiaDraptor](https://tibiadraptor.com/) |
| Quests | 237 quests across 94 questlogs | [TibiaDraptor](https://tibiadraptor.com/) |
| Titles | 113 titles | [TibiaDraptor](https://tibiadraptor.com/) |
| Measuring Tibia | 20 areas and 171 subareas | [Tibiopedia.pl](https://tibiopedia.pl/quests/Measuring_Tibia_Quest) |

Imported progress never replaces canonical thresholds, rewards, costs, categories, or other bundled game metadata.

## Official Tibia references

The product language and rules in this README were checked against CipSoft's documentation and announcements:

- [Cyclopedia, Bestiary, Charms, Bosstiary, and Cyclopedia Map guide](https://www.tibia.com/gameguides/?section=interface&subtopic=manual)
- [Bestiary and Charms introduction](https://www.tibia.com/news/?id=4351&subtopic=newsarchive)
- [Major Charms, Minor Charms, and Minor Charm Echoes](https://www.tibia.com/news/?id=8140&subtopic=newsarchive)
- [Bosstiary progress levels, categories, boss points, and boss slots](https://www.tibia.com/news/?id=6733&subtopic=newsarchive)
- [Achievements, grades, and achievement points](https://www.tibia.com/gameguides/?section=achievements&subtopic=manual)
- [Quests, missions, Quest Log, and Quest Tracker](https://www.tibia.com/gameguides/?section=quests&subtopic=manual)
- [Character titles](https://www.tibia.com/support/?entryid=205&subtopic=gethelp)
- [Cyclopedia Map areas and subareas](https://www.tibia.com/news/?id=4646&subtopic=newsarchive)
- [2026 Echo Wardens and discovery-system changes](https://www.tibia.com/news/?id=8834&subtopic=newsarchive)
- [Bounty and Weekly Tasks](https://www.tibia.com/gameguides/?section=combat&subtopic=manual)
- [Party Hunt Analyser and Bestiary Tracker](https://www.tibia.com/news/?id=5259&subtopic=newsarchive)

## Current boundaries

- The application is a manual progress workspace, not a live account synchronizer.
- Quest entries currently track completion, not individual mission steps.
- Task estimates cover creature-kill targets, not Weekly Delivery Tasks.
- The Charms tracker calculates Minor Charm Echoes generated by recorded Major Charm stages; it does not yet know whether the character is promoted and therefore does not add Tibia's separate 100-echo promotion grant.
- Hunt Analyzer parsing expects the documented English text structure.
- Projections reuse measured performance; they cannot guarantee future hunting conditions.
- The bundled game data is a snapshot and must be updated when Tibia content changes.
- This is an unofficial fan project and is not affiliated with CipSoft.

## Automation

- CI checks the required static-application structure and validates every bundled JSON dataset.
- GitHub Pages deploys the application from `main`.

## License

Released under the terms of the [LICENSE](LICENSE).
