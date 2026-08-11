import { loadBestiaryData } from "../services/bestiary-repository.js";
import { formatNumber } from "../utils/formatters.js";
import { escapeAttribute } from "../ui/render-blocks.js";
import {
    escapeText,
    trackerCountCell,
    trackerFlagCell,
    trackerStarCell
} from "../ui/render-tracker.js";

/**
 * The Bestiary tracker: a counter, because progress is kills against an unlock
 * threshold rather than a checkbox.
 *
 * Charm points and Echo Warden points are two separate pools and are reported
 * as separate totals, the way TibiaDraptor does it. Echo Warden points are never
 * folded into charm points.
 */

export const STATUS_LABELS = {
    notStarted: "Not Started",
    inProgress: "In Progress",
    done: "Done"
};

export function deriveBestiaryRow(creature, entry) {
    const kills = entry.kills;
    const unlockTarget = Number(creature["Kills to Unlock"]) || 0;
    const firstStage = Number(creature["Stage 1"]) || 0;
    const secondStage = Number(creature["Stage 2"]) || 0;
    const charms = Number(creature.Charms) || 0;
    const isComplete = unlockTarget > 0 && kills >= unlockTarget;

    return {
        key: creature.Name,
        name: creature.Name,
        className: creature.Class,
        wikiLink: `https://tibia.fandom.com/wiki/${creature.Name.replace(/\s/g, "_")}`,
        kills,
        unlockTarget,
        isComplete,
        stage: isComplete ? 3 : (kills >= secondStage ? 2 : (kills >= firstStage && kills > 0 ? 1 : 0)),
        status: isComplete ? "done" : (kills > 0 ? "inProgress" : "notStarted"),
        killsLeft: Math.max(0, unlockTarget - kills),
        progress: unlockTarget > 0 ? Math.min(1, kills / unlockTarget) : 0,
        charms,
        charmsEarned: isComplete ? charms : 0,
        echoWardenEligible: creature.echoWarden.eligible,
        echoWardenPoints: creature.echoWarden.eligible ? creature.echoWarden.points : 0,
        echoWarden: entry.echoWarden && creature.echoWarden.eligible,
        animusMastery: entry.animusMastery,
        bookmark: entry.bookmark,
        searchText: creature.Name.toLowerCase()
    };
}

export const bestiaryTracker = {
    id: "bestiary",
    label: "Bestiary",
    tableTitle: "My Bestiary",
    resultsTitle: "Bestiary Progress",
    resultsCopy: "Your whole Bestiary, not just the creatures in a session. Charm points and stage thresholds come from the game data; only kills and flags are yours.",
    progress: "counter",
    entryDefaults: { kills: 0, echoWarden: false, animusMastery: false, bookmark: false },
    loadItems: loadBestiaryData,
    itemKey: (creature) => creature.Name,
    derive: deriveBestiaryRow,

    columns: [
        { key: "bookmark", label: "", mark: "★", srLabel: "Bookmarked", isNumeric: false, cell: (row) => trackerStarCell(row) },
        {
            key: "name",
            label: "Creature",
            isNumeric: false,
            cell: (row) => `<td class="creature-cell"><a href="${escapeAttribute(row.wikiLink)}" target="_blank" rel="noreferrer">${escapeText(row.name)}</a></td>`
        },
        { key: "className", label: "Class", isNumeric: false, cell: (row) => `<td class="cell-muted">${escapeText(row.className) || "&mdash;"}</td>` },
        { key: "charms", label: "Charm Points", isNumeric: true, cell: (row) => `<td class="is-num">${formatNumber(row.charms)}</td>` },
        {
            key: "echoWardenPoints",
            label: "Echo Warden",
            isNumeric: true,
            cell: (row) => trackerFlagCell(row, "echoWarden", {
                label: formatNumber(row.echoWardenPoints),
                eligible: row.echoWardenEligible
            })
        },
        { key: "kills", label: "Kills", isNumeric: false, cell: (row) => trackerCountCell(row, "kills", `/ ${formatNumber(row.unlockTarget)}`) },
        { key: "killsLeft", label: "Kills Left", isNumeric: true, cell: (row) => `<td class="is-num">${row.isComplete ? "&mdash;" : formatNumber(row.killsLeft)}</td>` },
        { key: "status", label: "Status", isNumeric: false, cell: (row) => `<td><span class="status-mark">${STATUS_LABELS[row.status]}</span></td>` }
    ],

    facets: [
        { key: "search", kind: "search", label: "Search", placeholder: "Creature name", matches: (row, value) => row.searchText.includes(value.trim().toLowerCase()) },
        {
            key: "className",
            kind: "select",
            label: "Class",
            allLabel: "All classes",
            options: (items) => [...new Set(items.map((item) => item.Class).filter(Boolean))].sort().map((name) => ({ value: name, label: name })),
            matches: (row, value) => row.className === value
        },
        {
            key: "status",
            kind: "segmented",
            label: "Status",
            options: () => [
                { value: "all", label: "All" },
                { value: "notStarted", label: "Not Started" },
                { value: "inProgress", label: "In Progress" },
                { value: "done", label: "Done" }
            ],
            matches: (row, value) => row.status === value
        },
        { key: "bookmarkedOnly", kind: "check", label: "Bookmarked", matches: (row) => row.bookmark },
        { key: "echoWardenOnly", kind: "check", label: "Echo Warden eligible", matches: (row) => row.echoWardenEligible }
    ],

    /** Shown under the tracker's name in the tab strip. */
    tabMeta(rows) {
        const earned = rows.reduce((sum, row) => sum + row.charmsEarned, 0);
        const total = rows.reduce((sum, row) => sum + row.charms, 0);

        return `${formatNumber(earned)} / ${formatNumber(total)}`;
    },

    totals(rows) {
        const totals = rows.reduce((acc, row) => {
            acc.charmPointsTotal += row.charms;
            acc.charmPointsEarned += row.charmsEarned;
            acc.echoWardenTotal += row.echoWardenPoints;
            acc.echoWardenEarned += row.echoWarden ? row.echoWardenPoints : 0;
            acc.completed += row.isComplete ? 1 : 0;
            acc.inProgress += row.status === "inProgress" ? 1 : 0;
            acc.notStarted += row.status === "notStarted" ? 1 : 0;
            return acc;
        }, {
            charmPointsTotal: 0,
            charmPointsEarned: 0,
            echoWardenTotal: 0,
            echoWardenEarned: 0,
            completed: 0,
            inProgress: 0,
            notStarted: 0
        });
        const percent = totals.charmPointsTotal > 0
            ? (totals.charmPointsEarned / totals.charmPointsTotal) * 100
            : 0;

        return {
            answer: {
                label: "Charm Points",
                value: formatNumber(totals.charmPointsEarned),
                note: `of ${formatNumber(totals.charmPointsTotal)} in the game &mdash; ${percent.toFixed(1)}% earned.`
            },
            stats: [
                `${formatNumber(totals.completed)} of ${formatNumber(rows.length)} completed`,
                `${formatNumber(totals.inProgress)} in progress`,
                `${formatNumber(totals.notStarted)} never hunted`,
                `Echo Warden ${formatNumber(totals.echoWardenEarned)} of ${formatNumber(totals.echoWardenTotal)}`
            ]
        };
    },

    /**
     * Exported in the reference spreadsheet's column order so it opens in the
     * original sheet and imports straight back. The derived columns are written
     * for the reader and ignored on the way in.
     *
     * Echo Warden and Animus Mastery are appended after the original columns:
     * they are user-owned facts with nowhere to live in the reference layout, and
     * without them a CSV round trip silently dropped them. Appending keeps older
     * files importable, since columns are read by header name.
     */
    transfer: {
        fileStem: "bestiary-progress",
        csvColumns: ["Bookmark", "Name", "Charms", "Earned", "Killed", "Stage 1", "Stage 2", "Kills to Unlock", "Status", "Kills Left", "Progress (%)", "Echo Warden", "Animus Mastery"],
        requiredColumns: ["Name", "Killed"],
        writeRow: (row, creature) => [
            row.bookmark ? "Yes" : "No",
            row.name,
            row.charms,
            row.isComplete ? row.charms : "",
            row.kills,
            creature["Stage 1"],
            creature["Stage 2"],
            row.unlockTarget,
            STATUS_LABELS[row.status],
            row.killsLeft,
            `${Math.round(row.progress * 100)}%`,
            row.echoWardenEligible ? (row.echoWarden ? "Yes" : "No") : "",
            row.animusMastery ? "Yes" : "No"
        ],
        writeTotals: (rows) => [
            "Total",
            rows.length,
            rows.reduce((sum, row) => sum + row.charms, 0),
            rows.reduce((sum, row) => sum + row.charmsEarned, 0),
            "", "", "", "",
            `${(() => {
                const all = rows.reduce((sum, row) => sum + row.charms, 0);
                const got = rows.reduce((sum, row) => sum + row.charmsEarned, 0);
                return all > 0 ? ((got / all) * 100).toFixed(2) : "0.00";
            })()}%`,
            "", "", "", ""
        ],
        readRow: (cell) => {
            const isYes = (value) => /^(yes|true|1|y)$/i.test(String(value ?? "").trim());

            return {
                kills: cell("Killed"),
                bookmark: isYes(cell("Bookmark")),
                echoWarden: isYes(cell("Echo Warden")),
                animusMastery: isYes(cell("Animus Mastery"))
            };
        },
        // A TibiaDraptor bestiary export carries its own user_data block.
        readJsonRow: (item) => ({
            kills: item?.user_data?.kills,
            echoWarden: Boolean(item?.user_data?.echo_warden),
            animusMastery: Boolean(item?.user_data?.animus_mastery)
        })
    }
};
