import { loadBosstiaryData } from "../services/bosstiary-repository.js";
import { formatNumber } from "../utils/formatters.js";
import { escapeAttribute } from "../ui/render-blocks.js";
import { escapeText, trackerCountCell, trackerStageCell, trackerStarCell } from "../ui/render-tracker.js";
import { STATUS_LABELS, buildStatusFacet } from "./status.js";

/**
 * The Bosstiary tracker: a staged counter.
 *
 * It is not the Bestiary's shape. There, charm points arrive only when the final
 * threshold is passed. Here each of the three stages awards its own points as it
 * is reached, so partial progress is genuinely worth something and the derive has
 * to sum the stages cleared rather than test a single threshold.
 *
 * The client shows a progress *level*, never a kill count, and the thresholds are
 * fixed per category — Bane 25/100/300, Archfoe 5/20/60, Nemesis 1/3/5. So the
 * level is the input and the count is optional, exactly as in the Bestiary: asking
 * for a Nemesis kill count invites a guess, while asking for the level gets a fact.
 */

export const BOSS_STAGE_UNSET = 0;
export const BOSS_STAGE_NONE = 1;

/** Level 2..4 are Prowess, Expertise and Mastery — the three stages in the data. */
function bossStageFloor(stage, boss) {
    if (stage <= BOSS_STAGE_NONE) {
        return 0;
    }

    return boss.stages[stage - 2]?.kills ?? 0;
}

export function buildBossStages(boss) {
    return [
        { value: BOSS_STAGE_NONE, label: "None", title: "No kills yet" },
        ...boss.stages.map((stage, index) => ({
            value: index + 2,
            label: stage.label,
            title: `${stage.label}: ${stage.kills} kills, ${stage.points} points`
        }))
    ];
}

export function deriveBossRow(boss, entry) {
    const typedKills = entry.kills;
    const hasTypedKills = typedKills > 0;
    const kills = hasTypedKills ? typedKills : bossStageFloor(entry.stage, boss);
    const cleared = boss.stages.filter((stage) => kills >= stage.kills);
    const nextStage = boss.stages.find((stage) => kills < stage.kills) ?? null;
    const isComplete = cleared.length === boss.stages.length;

    const answered = hasTypedKills || entry.stage > BOSS_STAGE_UNSET;

    return {
        key: boss.Name,
        name: boss.Name,
        category: boss.category,
        unit: boss.category,
        answered,
        typedKills,
        hasTypedKills,
        // The control shows the level the stored count implies, so typing 60 on an
        // Archfoe lights up Mastery without the player setting it twice.
        stage: answered ? cleared.length + 1 : BOSS_STAGE_UNSET,
        storedStage: entry.stage,
        isFloor: !hasTypedKills && entry.stage > BOSS_STAGE_NONE,
        stageOptions: buildBossStages(boss),
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

export const bosstiaryTracker = {
    id: "bosstiary",
    label: "Bosstiary",
    tableTitle: "My Bosstiary",
    resultsTitle: "Bosstiary Progress",
    resultsCopy: "Every boss and its three stages. Unlike the Bestiary, boss points are awarded at each stage you reach, so partial progress already counts.",
    progress: "counter",
    entryDefaults: { kills: 0, stage: BOSS_STAGE_UNSET, bookmark: false },
    loadItems: loadBosstiaryData,
    itemKey: (boss) => boss.Name,
    derive: deriveBossRow,
    defaultSortKey: "name",

    /** The client groups bosses in three categories; 83–124 each, so paged at 20. */
    unit: {
        key: "category",
        label: "Category",
        pageSize: 20,
        instruction: (unitKey) => `Cyclopedia → Bosstiary → ${unitKey}`
    },

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
                : `/ ${formatNumber(row.nextThreshold)}`, {
                valueField: "typedKills",
                placeholder: row.isFloor ? `≥ ${formatNumber(row.kills)}` : "",
                title: row.isFloor ? "From the level you picked — type the exact count if you have it" : ""
            })
        },
        {
            key: "stage",
            label: "Level",
            isInput: true,
            isNumeric: false,
            cell: (row) => trackerStageCell(row, "stage", row.stageOptions, { label: "Level" })
        },
        {
            key: "pointsEarned",
            label: "Boss Points",
            isNumeric: true,
            cell: (row) => `<td class="is-num">${formatNumber(row.pointsEarned)}<span class="row-aside">of ${formatNumber(row.totalPoints)}</span></td>`
        },
        {
            key: "killsLeft",
            label: "To Next Level",
            isNumeric: true,
            cell: (row) => `<td class="is-num">${
                !row.known
                    ? '<span class="cell-muted">&mdash;</span>'
                    : (row.isComplete
                        ? "&mdash;"
                        : (row.isFloor ? `at most ${formatNumber(row.killsLeft)}` : formatNumber(row.killsLeft)))
            }</td>`
        },
        {
            key: "status",
            label: "Status",
            isNumeric: false,
            cell: (row) => `<td><span class="status-mark">${row.known ? STATUS_LABELS[row.status] : STATUS_LABELS.unknown}</span></td>`
        }
    ],

    facets: [
        { key: "search", kind: "search", label: "Search", placeholder: "Boss name", matches: (row, value) => row.searchText.includes(value.trim().toLowerCase()) },
        {
            key: "category",
            kind: "select",
            label: "Category",
            allLabel: "All categories",
            options: () => ["Bane", "Archfoe", "Nemesis"].map((name) => ({ value: name, label: name })),
            matches: (row, value) => row.category === value
        },
        buildStatusFacet({ doneWord: "Mastery" }),
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
                `${formatNumber(rows.filter((row) => row.known && row.status === "notStarted").length)} not started`,
                `${formatNumber(rows.filter((row) => !row.known).length)} not recorded yet`
            ]
        };
    },

    transfer: {
        fileStem: "bosstiary-progress",
        csvColumns: ["Name", "Category", "Kills", "Level", "Boss Points", "Total Boss Points", "Bookmark"],
        requiredColumns: ["Name"],
        writeRow: (row) => [
            row.name,
            row.category,
            row.hasTypedKills ? row.typedKills : "",
            row.answered ? (row.stageOptions.find((stage) => stage.value === row.stage)?.label ?? "") : "",
            row.pointsEarned,
            row.totalPoints,
            row.bookmark ? "Yes" : "No"
        ],
        readRow: (cell) => {
            const level = String(cell("Level") ?? "").trim().toLowerCase();
            const named = ["none", "prowess", "expertise", "mastery"].indexOf(level);

            return {
                kills: cell("Kills"),
                stage: named === -1 ? BOSS_STAGE_UNSET : named + 1,
                bookmark: /^(yes|true|1|y)$/i.test(String(cell("Bookmark") ?? "").trim())
            };
        },
        readJsonRow: (item) => ({ kills: item?.user_data?.kills, stage: BOSS_STAGE_UNSET })
    }
};
