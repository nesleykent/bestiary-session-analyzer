import { loadBosstiaryData } from "../services/bosstiary-repository.js";
import { formatNumber } from "../utils/formatters.js";
import { escapeAttribute } from "../ui/render-blocks.js";
import { escapeText, trackerCountCell, trackerStarCell } from "../ui/render-tracker.js";

/**
 * The Bosstiary tracker: a staged counter.
 *
 * It is not the Bestiary's shape. There, charm points arrive only when the final
 * threshold is passed. Here each of the three stages awards its own points as it
 * is reached, so partial progress is genuinely worth something and the derive has
 * to sum the stages cleared rather than test a single threshold.
 */

export function deriveBossRow(boss, entry) {
    const kills = entry.kills;
    const cleared = boss.stages.filter((stage) => kills >= stage.kills);
    const nextStage = boss.stages.find((stage) => kills < stage.kills) ?? null;
    const isComplete = cleared.length === boss.stages.length;

    return {
        key: boss.Name,
        name: boss.Name,
        category: boss.category,
        wikiLink: `https://tibia.fandom.com/wiki/${boss.Name.replace(/\s/g, "_")}`,
        kills,
        stages: boss.stages,
        stagesCleared: cleared.length,
        stageLabel: isComplete ? "Mastery" : (cleared.length ? cleared[cleared.length - 1].label : ""),
        nextThreshold: nextStage ? nextStage.kills : 0,
        killsLeft: nextStage ? Math.max(0, nextStage.kills - kills) : 0,
        totalPoints: boss.totalPoints,
        // Points accrue per stage cleared, not all at the end.
        pointsEarned: cleared.reduce((sum, stage) => sum + stage.points, 0),
        isComplete,
        status: isComplete ? "done" : (kills > 0 ? "inProgress" : "notStarted"),
        bookmark: entry.bookmark,
        searchText: boss.Name.toLowerCase()
    };
}

const STATUS_LABELS = { notStarted: "Not Started", inProgress: "In Progress", done: "Mastered" };

export const bosstiaryTracker = {
    id: "bosstiary",
    label: "Bosstiary",
    tableTitle: "My Bosstiary",
    resultsTitle: "Bosstiary Progress",
    resultsCopy: "Every boss and its three stages. Unlike the Bestiary, boss points are awarded at each stage you reach, so partial progress already counts.",
    progress: "counter",
    entryDefaults: { kills: 0, bookmark: false },
    loadItems: loadBosstiaryData,
    itemKey: (boss) => boss.Name,
    derive: deriveBossRow,
    defaultSortKey: "name",

    columns: [
        { key: "bookmark", label: "", mark: "★", srLabel: "Bookmarked", isNumeric: false, cell: (row) => trackerStarCell(row) },
        {
            key: "name",
            label: "Boss",
            isNumeric: false,
            cell: (row) => `<td class="creature-cell"><a href="${escapeAttribute(row.wikiLink)}" target="_blank" rel="noreferrer">${escapeText(row.name)}</a></td>`
        },
        { key: "category", label: "Category", isNumeric: false, cell: (row) => `<td class="cell-muted">${escapeText(row.category) || "&mdash;"}</td>` },
        {
            key: "kills",
            label: "Kills",
            isNumeric: false,
            // The suffix is the next threshold, not the last, so the field always
            // says what the next stage costs.
            cell: (row) => trackerCountCell(row, "kills", row.isComplete
                ? `/ ${formatNumber(row.stages[2].kills)}`
                : `/ ${formatNumber(row.nextThreshold)}`)
        },
        {
            key: "stagesCleared",
            label: "Stage",
            isNumeric: true,
            cell: (row) => `<td class="is-num"><span class="stage-mark">${
                row.stages.map((stage, index) => `<span class="stage-pip${index < row.stagesCleared ? " is-on" : ""}" title="${escapeAttribute(stage.label)}: ${formatNumber(stage.kills)} kills, ${formatNumber(stage.points)} points"></span>`).join("")
            }</span></td>`
        },
        {
            key: "pointsEarned",
            label: "Boss Points",
            isNumeric: true,
            cell: (row) => `<td class="is-num">${formatNumber(row.pointsEarned)}<span class="row-aside">of ${formatNumber(row.totalPoints)}</span></td>`
        },
        { key: "killsLeft", label: "To Next Stage", isNumeric: true, cell: (row) => `<td class="is-num">${row.isComplete ? "&mdash;" : formatNumber(row.killsLeft)}</td>` },
        { key: "status", label: "Status", isNumeric: false, cell: (row) => `<td><span class="status-mark">${STATUS_LABELS[row.status]}</span></td>` }
    ],

    facets: [
        { key: "search", kind: "search", label: "Search", placeholder: "Boss name", matches: (row, value) => row.searchText.includes(value.trim().toLowerCase()) },
        {
            key: "category",
            kind: "segmented",
            label: "Category",
            options: () => [
                { value: "all", label: "All" },
                { value: "Bane", label: "Bane" },
                { value: "Archfoe", label: "Archfoe" },
                { value: "Nemesis", label: "Nemesis" }
            ],
            matches: (row, value) => row.category === value
        },
        {
            key: "status",
            kind: "segmented",
            label: "Status",
            options: () => [
                { value: "all", label: "All" },
                { value: "notStarted", label: "Not Started" },
                { value: "inProgress", label: "In Progress" },
                { value: "done", label: "Mastered" }
            ],
            matches: (row, value) => row.status === value
        },
        { key: "bookmarkedOnly", kind: "check", label: "Bookmarked", matches: (row) => row.bookmark }
    ],

    tabMeta(rows) {
        return `${formatNumber(rows.reduce((sum, row) => sum + row.pointsEarned, 0))} / ${formatNumber(rows.reduce((sum, row) => sum + row.totalPoints, 0))}`;
    },

    totals(rows) {
        const earned = rows.reduce((sum, row) => sum + row.pointsEarned, 0);
        const total = rows.reduce((sum, row) => sum + row.totalPoints, 0);
        const percent = total > 0 ? (earned / total) * 100 : 0;
        const atStage = (n) => rows.filter((row) => row.stagesCleared >= n).length;

        return {
            answer: {
                label: "Boss Points",
                value: formatNumber(earned),
                note: `of ${formatNumber(total)} in the game &mdash; ${percent.toFixed(1)}% earned.`
            },
            stats: [
                `Prowess ${formatNumber(atStage(1))} of ${formatNumber(rows.length)}`,
                `Expertise ${formatNumber(atStage(2))}`,
                `Mastery ${formatNumber(atStage(3))}`,
                `${formatNumber(rows.filter((row) => row.status === "notStarted").length)} never killed`
            ]
        };
    },

    transfer: {
        fileStem: "bosstiary-progress",
        csvColumns: ["Name", "Category", "Kills", "Stage", "Boss Points", "Total Boss Points", "Bookmark"],
        requiredColumns: ["Name", "Kills"],
        writeRow: (row) => [
            row.name,
            row.category,
            row.kills,
            row.stagesCleared,
            row.pointsEarned,
            row.totalPoints,
            row.bookmark ? "Yes" : "No"
        ],
        readRow: (cell) => ({
            kills: cell("Kills"),
            bookmark: /^(yes|true|1|y)$/i.test(String(cell("Bookmark") ?? "").trim())
        }),
        readJsonRow: (item) => ({ kills: item?.user_data?.kills })
    }
};
