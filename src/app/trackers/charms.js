import { loadCharmsData } from "../services/charms-repository.js";
import { formatNumber } from "../utils/formatters.js";
import { escapeText, plainText, trackerCountCell, trackerStarCell } from "../ui/render-tracker.js";

const MAX_STAGE = 3;

/**
 * The Charms tracker: a staged counter that spends rather than earns, in two
 * different currencies.
 *
 *   Major charms cost Charm Points, earned from the Bestiary (including the
 *   points an Echo Warden first kill awards).
 *
 *   Minor charms cost Minor Charm Echoes, which are not charm points at all.
 *   They are earned by unlocking Major charm stages — 50, 100 and 200 for
 *   stages 1, 2 and 3 — so majors fund minors. A promoted character also
 *   receives 100.
 *
 * Neither budget can cover everything, which is why this tracker reports budgets
 * rather than a collection:
 *
 *   majors need 48,900 charm points, and only 37,231 exist in the game
 *   minors need 5,225 echoes, and maxing every major yields 4,900 (+100 promoted)
 *
 * Costs come from the dataset, not from these notes; the notes only explain why
 * the two currencies are kept apart.
 */

/** Minor Charm Echoes awarded for reaching each Major charm stage. */
const ECHOES_PER_MAJOR_STAGE = [50, 100, 200];

/** A promoted character receives this many echoes on top. */
export const PROMOTION_ECHOES = 100;

export const CURRENCY_LABELS = { points: "charm points", echoes: "echoes" };

function currencyFor(type) {
    return type === "Minor" ? "echoes" : "points";
}

export function deriveCharmRow(charm, entry) {
    // Clamped rather than trusted: a hand-edited file could carry any number, and
    // a charm has exactly three stages.
    const stage = Math.min(entry.stage, MAX_STAGE);
    const unlocked = charm.stages.slice(0, stage);
    const current = unlocked[unlocked.length - 1] ?? null;
    const next = charm.stages[stage] ?? null;
    const currency = currencyFor(charm.type);

    return {
        key: charm.Name,
        name: charm.Name,
        type: charm.type,
        currency,
        currencyLabel: CURRENCY_LABELS[currency],
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
        // Only majors generate echoes, and only for the stages actually unlocked.
        echoesGenerated: charm.type === "Minor"
            ? 0
            : ECHOES_PER_MAJOR_STAGE.slice(0, stage).reduce((sum, value) => sum + value, 0),
        isComplete: stage >= MAX_STAGE,
        status: stage >= MAX_STAGE ? "done" : (stage > 0 ? "inProgress" : "notStarted"),
        bookmark: entry.bookmark,
        searchText: `${charm.Name} ${charm.type}`.toLowerCase()
    };
}

const STATUS_LABELS = { notStarted: "Locked", inProgress: "Partial", done: "Maxed" };

/** Splits the rows into the two budgets they actually draw on. */
function summarizeCurrencies(rows) {
    const of = (currency) => rows.filter((row) => row.currency === currency);
    const sum = (list, field) => list.reduce((total, row) => total + row[field], 0);
    const majors = of("points");
    const minors = of("echoes");

    return {
        majors: { rows: majors, spent: sum(majors, "spent"), needed: sum(majors, "totalCost") },
        minors: { rows: minors, spent: sum(minors, "spent"), needed: sum(minors, "totalCost") },
        // Majors fund minors, so the echo budget comes from this tracker itself.
        echoesEarned: sum(majors, "echoesGenerated")
    };
}

export const charmsTracker = {
    id: "charms",
    label: "Charms",
    tableTitle: "My Charms",
    resultsTitle: "Charm Spending",
    resultsCopy: "Charms are bought, not collected, and in two currencies: Major charms cost charm points your Bestiary earns, while Minor charms cost echoes that unlocking Major stages generates.",
    progress: "counter",
    entryDefaults: { stage: 0, bookmark: false },
    loadItems: loadCharmsData,
    itemKey: (charm) => charm.Name,
    derive: deriveCharmRow,
    defaultSortKey: "name",

    /** Major charms spend what the Bestiary earns. */
    consumesBudgetFrom: "bestiary",

    columns: [
        { key: "bookmark", label: "", mark: "★", srLabel: "Bookmarked", isNumeric: false, cell: (row) => trackerStarCell(row) },
        { key: "name", label: "Charm", isNumeric: false, cell: (row) => `<td class="creature-cell">${escapeText(row.name)}</td>` },
        {
            key: "type",
            label: "Type",
            isNumeric: false,
            // The type IS the currency, so it says which.
            cell: (row) => `<td class="cell-muted">${escapeText(row.type)}<span class="row-aside">${escapeText(row.currencyLabel)}</span></td>`
        },
        { key: "effect", label: "Effect", isNumeric: false, cell: (row) => `<td class="spoiler-cell">${plainText(row.effect) || '<span class="cell-muted">&mdash;</span>'}</td>` },
        { key: "stage", label: "Stage", isNumeric: false, cell: (row) => trackerCountCell(row, "stage", `/ ${MAX_STAGE}`) },
        {
            key: "spent",
            label: "Spent",
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
                { value: "Major", label: "Major" },
                { value: "Minor", label: "Minor" }
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
        const { majors, minors } = summarizeCurrencies(rows);

        return `${formatNumber(majors.spent)} pts · ${formatNumber(minors.spent)} echoes`;
    },

    /**
     * The headline is the charm points left, because that is the scarcer decision.
     * The echo budget is reported alongside it, since it is a different currency
     * and cannot be added to the first.
     */
    totals(rows, context = {}) {
        const { majors, minors, echoesEarned } = summarizeCurrencies(rows);
        const maxed = rows.filter((row) => row.isComplete).length;
        const budget = context.budget;
        const echoesLeft = echoesEarned - minors.spent;
        const echoStat = `Echoes ${formatNumber(Math.max(0, echoesLeft))} of ${formatNumber(echoesEarned)} generated`;
        const stats = [
            `${formatNumber(maxed)} of ${formatNumber(rows.length)} maxed`,
            echoStat,
            `Minors need ${formatNumber(minors.needed)} echoes in total`
        ];

        if (budget === null || budget === undefined) {
            return {
                answer: {
                    label: "Charm Points Spent",
                    value: formatNumber(majors.spent),
                    note: `of ${formatNumber(majors.needed)} needed to max every Major charm.`
                },
                stats
            };
        }

        const available = budget.earned - majors.spent;

        return {
            answer: {
                label: "Charm Points Available",
                value: formatNumber(Math.max(0, available)),
                note: available < 0
                    ? `Major charms have used ${formatNumber(-available)} more charm points than your Bestiary has earned &mdash; check the stages recorded here.`
                    : `${formatNumber(budget.earned)} earned from your Bestiary, ${formatNumber(majors.spent)} spent on Major charms of ${formatNumber(majors.needed)} needed.`
            },
            stats: [
                ...stats,
                `${formatNumber(budget.total)} charm points exist in the game`
            ]
        };
    },

    transfer: {
        fileStem: "charm-progress",
        csvColumns: ["Name", "Type", "Currency", "Stage", "Spent", "Total Cost", "Bookmark"],
        requiredColumns: ["Name", "Stage"],
        writeRow: (row) => [row.name, row.type, row.currencyLabel, row.stage, row.spent, row.totalCost, row.bookmark ? "Yes" : "No"],
        readRow: (cell) => ({
            // Clamped on the way in as well, so a bad file cannot store nonsense.
            stage: Math.min(Number.parseInt(String(cell("Stage") ?? "").replace(/[,\s]/g, ""), 10) || 0, MAX_STAGE),
            bookmark: /^(yes|true|1|y)$/i.test(String(cell("Bookmark") ?? "").trim())
        })
    }
};
