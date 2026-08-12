import { loadQuestsData } from "../services/quests-repository.js";
import { formatNumber } from "../utils/formatters.js";
import { escapeText, plainText, trackerStarCell, trackerTickCell } from "../ui/render-tracker.js";
import { STATUS_LABELS, buildStatusFacet } from "./status.js";

/** Quests: boolean progress, grouped by the questlog entry they appear under. */

export function deriveQuestRow(quest, entry) {
    return {
        key: quest.Name,
        name: quest.Name,
        unit: quest.questlog || "Ungrouped",
        rewards: quest.rewards,
        questlog: quest.questlog,
        completed: entry.completed,
        status: entry.completed ? "done" : "notStarted",
        bookmark: entry.bookmark,
        searchText: `${quest.Name} ${quest.questlog} ${quest.rewards}`.toLowerCase()
    };
}

export const questsTracker = {
    id: "quests",
    label: "Quests",
    tableTitle: "My Quests",
    resultsTitle: "Quest Progress",
    resultsCopy: "Every quest in the game with what it rewards. Several quests can share one questlog entry, so the questlog is shown alongside.",
    progress: "boolean",
    entryDefaults: { completed: false, bookmark: false },
    tickField: "completed",
    loadItems: loadQuestsData,
    itemKey: (quest) => quest.Name,
    derive: deriveQuestRow,
    defaultSortKey: "name",

    /**
     * Grouping by questlog does not work as a unit: 104 of the 237 quests carry no
     * questlog at all and 86 questlogs hold exactly one quest. So the unit is an
     * alphabetical page of 20 until the client's own Quest Log structure is checked
     * in game — bounded and verifiable either way.
     */
    unit: {
        key: "unit",
        label: "Questlog",
        pageSize: 20,
        alphabetical: true,
        instruction: () => "Quest Log"
    },

    columns: [
        { key: "bookmark", label: "", mark: "★", srLabel: "Bookmarked", isNumeric: false, cell: (row) => trackerStarCell(row) },
        {
            key: "name",
            label: "Quest",
            isNumeric: false,
            cell: (row) => `<td class="creature-cell">${escapeText(row.name)}</td>`
        },
        {
            key: "rewards",
            label: "Rewards",
            isNumeric: false,
            cell: (row) => `<td class="spoiler-cell">${plainText(row.rewards) || '<span class="cell-muted">&mdash;</span>'}</td>`
        },
        {
            key: "questlog",
            label: "Questlog",
            isNumeric: false,
            cell: (row) => `<td class="cell-muted">${escapeText(row.questlog) || "&mdash;"}</td>`
        },
        {
            key: "completed",
            label: "Completed",
            isNumeric: true,
            isInput: true,
            cell: (row) => trackerTickCell(row, "completed", { label: "Completed" })
        }
    ],

    facets: [
        { key: "search", kind: "search", label: "Search", placeholder: "Quest, questlog or reward", matches: (row, value) => row.searchText.includes(value.trim().toLowerCase()) },
        {
            key: "questlog",
            kind: "select",
            label: "Questlog",
            allLabel: "All questlogs",
            options: (items) => [...new Set(items.map((item) => item.questlog).filter(Boolean))].sort().map((name) => ({ value: name, label: name })),
            matches: (row, value) => row.questlog === value
        },
        buildStatusFacet({ doneWord: "Completed", hasInProgress: false }),
        { key: "bookmarkedOnly", kind: "check", label: "Bookmarked", matches: (row) => row.bookmark }
    ],

    tabMeta(rows) {
        return `${formatNumber(rows.filter((row) => row.completed).length)} / ${formatNumber(rows.length)}`;
    },

    totals(rows) {
        const done = rows.filter((row) => row.completed).length;
        const percent = rows.length > 0 ? (done / rows.length) * 100 : 0;
        const questlogs = new Set(rows.map((row) => row.questlog).filter(Boolean));
        const doneLogs = [...questlogs].filter((log) => rows
            .filter((row) => row.questlog === log)
            .every((row) => row.completed)).length;

        return {
            answer: {
                label: "Quests Completed",
                value: formatNumber(done),
                note: `of ${formatNumber(rows.length)} in the game &mdash; ${percent.toFixed(1)}% complete.`
            },
            stats: [
                `${formatNumber(rows.filter((row) => row.known && !row.completed).length)} not started`,
                `${formatNumber(rows.filter((row) => !row.known).length)} not recorded yet`,
                `${formatNumber(doneLogs)} of ${formatNumber(questlogs.size)} questlogs finished`
            ]
        };
    },

    transfer: {
        fileStem: "quest-progress",
        csvColumns: ["Name", "Questlog", "Completed", "Bookmark"],
        requiredColumns: ["Name", "Completed"],
        writeRow: (row) => [row.name, row.questlog, row.completed ? "Yes" : "No", row.bookmark ? "Yes" : "No"],
        readRow: (cell) => {
            const isYes = (value) => /^(yes|true|1|y)$/i.test(String(value ?? "").trim());

            return { completed: isYes(cell("Completed")), bookmark: isYes(cell("Bookmark")) };
        }
    }
};
