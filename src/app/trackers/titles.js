import { loadTitlesData } from "../services/titles-repository.js";
import { formatNumber } from "../utils/formatters.js";
import { escapeText, plainText, trackerFlagCell, trackerStarCell } from "../ui/render-tracker.js";

/** Titles: boolean progress, no points — the title itself is the reward. */

export function deriveTitleRow(title, entry) {
    return {
        key: title.Name,
        name: title.Name,
        requirement: title.requirement,
        isPermanent: title.isPermanent,
        earned: entry.earned,
        status: entry.earned ? "done" : "notStarted",
        bookmark: entry.bookmark,
        searchText: `${title.Name} ${title.requirement}`.toLowerCase()
    };
}

export const titlesTracker = {
    id: "titles",
    label: "Titles",
    tableTitle: "My Titles",
    resultsTitle: "Title Progress",
    resultsCopy: "Every title in the game and what it takes to earn one. Permanent titles stay once earned; the rest can be lost again.",
    progress: "boolean",
    entryDefaults: { earned: false, bookmark: false },
    loadItems: loadTitlesData,
    itemKey: (title) => title.Name,
    derive: deriveTitleRow,
    defaultSortKey: "name",

    columns: [
        { key: "bookmark", label: "", mark: "★", srLabel: "Bookmarked", isNumeric: false, cell: (row) => trackerStarCell(row) },
        {
            key: "name",
            label: "Title",
            isNumeric: false,
            cell: (row) => `<td class="creature-cell">${escapeText(row.name)}</td>`
        },
        {
            key: "requirement",
            label: "How To Earn It",
            isNumeric: false,
            cell: (row) => `<td class="spoiler-cell">${plainText(row.requirement) || '<span class="cell-muted">&mdash;</span>'}</td>`
        },
        {
            key: "isPermanent",
            label: "Permanent",
            isNumeric: true,
            cell: (row) => `<td class="is-num cell-muted">${row.isPermanent ? "Yes" : "No"}</td>`
        },
        {
            key: "earned",
            label: "Earned",
            isNumeric: true,
            cell: (row) => trackerFlagCell(row, "earned", { label: row.earned ? "Yes" : "No" })
        }
    ],

    facets: [
        { key: "search", kind: "search", label: "Search", placeholder: "Title or requirement", matches: (row, value) => row.searchText.includes(value.trim().toLowerCase()) },
        {
            key: "status",
            kind: "segmented",
            label: "Status",
            options: () => [
                { value: "all", label: "All" },
                { value: "notStarted", label: "Missing" },
                { value: "done", label: "Earned" }
            ],
            matches: (row, value) => row.status === value
        },
        {
            key: "permanence",
            kind: "segmented",
            label: "Permanence",
            options: () => [
                { value: "all", label: "Any" },
                { value: "permanent", label: "Permanent" },
                { value: "losable", label: "Losable" }
            ],
            matches: (row, value) => (value === "permanent") === row.isPermanent
        },
        { key: "bookmarkedOnly", kind: "check", label: "Bookmarked", matches: (row) => row.bookmark }
    ],

    tabMeta(rows) {
        return `${formatNumber(rows.filter((row) => row.earned).length)} / ${formatNumber(rows.length)}`;
    },

    totals(rows) {
        const earned = rows.filter((row) => row.earned).length;
        const percent = rows.length > 0 ? (earned / rows.length) * 100 : 0;

        return {
            answer: {
                label: "Titles Earned",
                value: formatNumber(earned),
                note: `of ${formatNumber(rows.length)} in the game &mdash; ${percent.toFixed(1)}% earned.`
            },
            stats: [
                `${formatNumber(rows.length - earned)} still missing`,
                `Permanent ${formatNumber(rows.filter((row) => row.earned && row.isPermanent).length)} of ${formatNumber(rows.filter((row) => row.isPermanent).length)}`
            ]
        };
    },

    transfer: {
        fileStem: "title-progress",
        csvColumns: ["Name", "Permanent", "Earned", "Bookmark"],
        requiredColumns: ["Name", "Earned"],
        writeRow: (row) => [row.name, row.isPermanent ? "Yes" : "No", row.earned ? "Yes" : "No", row.bookmark ? "Yes" : "No"],
        readRow: (cell) => {
            const isYes = (value) => /^(yes|true|1|y)$/i.test(String(value ?? "").trim());

            return { earned: isYes(cell("Earned")), bookmark: isYes(cell("Bookmark")) };
        }
    }
};
