import { loadCharmsData } from "../services/charms-repository.js";
import { formatNumber } from "../utils/formatters.js";
import { escapeText, plainText, trackerCountCell, trackerStarCell } from "../ui/render-tracker.js";

const MAX_STAGE = 3;

/**
 * The Charms tracker: a staged counter that *spends* rather than earns.
 *
 * Every other tracker accumulates something. Charms are bought with the charm
 * points the Bestiary earns, so this is the one tracker whose headline is a
 * budget — and the budget genuinely cannot cover everything: unlocking all 25
 * charms to stage 3 costs 54,125 points, while only 37,231 exist in the game
 * (28,734 base plus the 8,497 Echo Warden pool).
 */

export function deriveCharmRow(charm, entry) {
    // Clamped rather than trusted: a hand-edited file could carry any number, and
    // a charm has exactly three stages.
    const stage = Math.min(entry.stage, MAX_STAGE);
    const unlocked = charm.stages.slice(0, stage);
    const current = unlocked[unlocked.length - 1] ?? null;
    const next = charm.stages[stage] ?? null;

    return {
        key: charm.Name,
        name: charm.Name,
        type: charm.type,
        stage,
        stages: charm.stages,
        // The effect text carries a {{}} placeholder for the stage's value; with
        // nothing unlocked the whole ladder is more use than a blank.
        effect: charm.effect.includes("{{}}")
            ? charm.effect.replace("{{}}", current ? String(current.value) : charm.stages.map((s) => s.value).join(" / "))
            : charm.effect,
        spent: current ? current.cumulativeCost : 0,
        nextCost: next ? next.cost : 0,
        totalCost: charm.totalCost,
        isComplete: stage >= MAX_STAGE,
        status: stage >= MAX_STAGE ? "done" : (stage > 0 ? "inProgress" : "notStarted"),
        bookmark: entry.bookmark,
        searchText: `${charm.Name} ${charm.type}`.toLowerCase()
    };
}

const STATUS_LABELS = { notStarted: "Locked", inProgress: "Partial", done: "Maxed" };

export const charmsTracker = {
    id: "charms",
    label: "Charms",
    tableTitle: "My Charms",
    resultsTitle: "Charm Spending",
    resultsCopy: "Charms are bought with the charm points your Bestiary earns, so this is a budget rather than a collection. Record the stage you have unlocked for each one.",
    progress: "counter",
    entryDefaults: { stage: 0, bookmark: false },
    loadItems: loadCharmsData,
    itemKey: (charm) => charm.Name,
    derive: deriveCharmRow,
    defaultSortKey: "name",

    /** Spends what the Bestiary tracker earns. */
    consumesBudgetFrom: "bestiary",

    columns: [
        { key: "bookmark", label: "", mark: "★", srLabel: "Bookmarked", isNumeric: false, cell: (row) => trackerStarCell(row) },
        { key: "name", label: "Charm", isNumeric: false, cell: (row) => `<td class="creature-cell">${escapeText(row.name)}</td>` },
        { key: "type", label: "Type", isNumeric: false, cell: (row) => `<td class="cell-muted">${escapeText(row.type) || "&mdash;"}</td>` },
        { key: "effect", label: "Effect", isNumeric: false, cell: (row) => `<td class="spoiler-cell">${plainText(row.effect) || '<span class="cell-muted">&mdash;</span>'}</td>` },
        { key: "stage", label: "Stage", isNumeric: false, cell: (row) => trackerCountCell(row, "stage", `/ ${MAX_STAGE}`) },
        {
            key: "spent",
            label: "Points Spent",
            isNumeric: true,
            cell: (row) => `<td class="is-num">${formatNumber(row.spent)}<span class="row-aside">of ${formatNumber(row.totalCost)}</span></td>`
        },
        { key: "nextCost", label: "Next Stage", isNumeric: true, cell: (row) => `<td class="is-num">${row.isComplete ? "&mdash;" : formatNumber(row.nextCost)}</td>` },
        { key: "status", label: "Status", isNumeric: false, cell: (row) => `<td><span class="status-mark">${STATUS_LABELS[row.status]}</span></td>` }
    ],

    facets: [
        { key: "search", kind: "search", label: "Search", placeholder: "Charm name", matches: (row, value) => row.searchText.includes(value.trim().toLowerCase()) },
        {
            key: "type",
            kind: "segmented",
            label: "Type",
            options: () => [
                { value: "all", label: "All" },
                { value: "Minor", label: "Minor" },
                { value: "Major", label: "Major" }
            ],
            matches: (row, value) => row.type === value
        },
        {
            key: "status",
            kind: "segmented",
            label: "Status",
            options: () => [
                { value: "all", label: "All" },
                { value: "notStarted", label: "Locked" },
                { value: "inProgress", label: "Partial" },
                { value: "done", label: "Maxed" }
            ],
            matches: (row, value) => row.status === value
        },
        { key: "bookmarkedOnly", kind: "check", label: "Bookmarked", matches: (row) => row.bookmark }
    ],

    tabMeta(rows) {
        return `${formatNumber(rows.reduce((sum, row) => sum + row.spent, 0))} spent`;
    },

    /**
     * The headline is what is left to spend, because that is the decision the
     * player is actually making. Without a Bestiary record there is no budget to
     * report, so it falls back to what has been spent.
     */
    totals(rows, context = {}) {
        const spent = rows.reduce((sum, row) => sum + row.spent, 0);
        const maxedCount = rows.filter((row) => row.isComplete).length;
        const outstanding = rows.reduce((sum, row) => sum + (row.totalCost - row.spent), 0);
        const budget = context.budget;

        if (budget === null || budget === undefined) {
            return {
                answer: {
                    label: "Charm Points Spent",
                    value: formatNumber(spent),
                    note: `of ${formatNumber(spent + outstanding)} needed to max every charm.`
                },
                stats: [
                    `${formatNumber(maxedCount)} of ${formatNumber(rows.length)} maxed`,
                    `${formatNumber(outstanding)} still to spend`
                ]
            };
        }

        const available = budget.earned - spent;

        return {
            answer: {
                label: "Charm Points Available",
                value: formatNumber(Math.max(0, available)),
                note: available < 0
                    ? `You have spent ${formatNumber(-available)} more than your Bestiary has earned &mdash; check the stages recorded here.`
                    : `${formatNumber(budget.earned)} earned from your Bestiary, ${formatNumber(spent)} spent on charms.`
            },
            stats: [
                `${formatNumber(maxedCount)} of ${formatNumber(rows.length)} maxed`,
                `${formatNumber(outstanding)} needed to max the rest`,
                `${formatNumber(budget.total)} exists in the whole game`
            ]
        };
    },

    transfer: {
        fileStem: "charm-progress",
        csvColumns: ["Name", "Type", "Stage", "Points Spent", "Total Cost", "Bookmark"],
        requiredColumns: ["Name", "Stage"],
        writeRow: (row) => [row.name, row.type, row.stage, row.spent, row.totalCost, row.bookmark ? "Yes" : "No"],
        readRow: (cell) => ({
            // Clamped on the way in as well, so a bad file cannot store nonsense.
            stage: Math.min(Number.parseInt(String(cell("Stage") ?? "").replace(/[,\s]/g, ""), 10) || 0, MAX_STAGE),
            bookmark: /^(yes|true|1|y)$/i.test(String(cell("Bookmark") ?? "").trim())
        })
    }
};
