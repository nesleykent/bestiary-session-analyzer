import { parsePlayTimeMinutes, planCharmTime } from "./features/charm-plan.js";
import {
    aggregateAllTabsSummary,
    buildAllTabsAnalysis,
    buildHuntComparison,
    isEntryKeyForHunt
} from "./features/hunt-comparison.js";
import { analyzeSession, recalculateProgress, summarizeBestiaryMonsters } from "./features/session-analysis.js";
import { analyzeTaskSession, calculateTaskEstimate } from "./features/task-analysis.js";
import { loadBestiaryData } from "./services/bestiary-repository.js";
import {
    addHunt,
    createWorkspace,
    getHuntLabel,
    hasBestiaryAnalysis,
    hasTaskAnalysis,
    huntHasContent,
    removeHunt,
    resetHunt,
    restoreWorkspace
} from "./state/hunt-workspace.js";
import { loadWorkspaceState, saveWorkspaceState } from "./state/local-store.js";
import {
    countTrackedEntries,
    createTrackerProgress,
    getEntry,
    getTrackerRecord,
    setEntry,
    toggleEntryFlag
} from "./state/tracker-progress.js";
import {
    buildTrackerExportFileName,
    exportTrackerCsv,
    importTrackerCsv,
    importTrackerJson
} from "./state/tracker-transfer.js";
import { bestiaryTracker } from "./trackers/bestiary.js";
import {
    buildInitialFilters,
    getTracker,
    getTrackerEntryDefaults,
    getTrackerIds,
    TRACKERS
} from "./trackers/registry.js";
import { buildExportFileName, parseWorkspaceFile, serializeWorkspace } from "./state/workspace-transfer.js";
import { renderAllTabs } from "./ui/render-all-tabs.js";
import { renderTracker } from "./ui/render-tracker.js";
import { buildCharmPlanResultMarkup, renderCharmPlan } from "./ui/render-charm-plan.js";
import { renderComparison } from "./ui/render-comparison.js";
import { renderHuntTabs } from "./ui/render-hunt-tabs.js";
import { renderResults } from "./ui/render-results.js";
import { LIBRARY_COLUMNS, renderSessionLibrary } from "./ui/render-session-library.js";
import { renderTaskResults } from "./ui/render-task-results.js";
import { renderTaskSessions } from "./ui/render-task-sessions.js";
import { formatCharmsPerHour, formatNumber, formatTaskRate, formatTimeDetailed } from "./utils/formatters.js";

const elements = {
    analysisSection: document.getElementById("analysisSection"),
    clearLogButton: document.getElementById("clearLogButton"),
    compareHuntsButton: document.getElementById("compareHuntsButton"),
    comparisonOutput: document.getElementById("comparisonOutput"),
    comparisonSection: document.getElementById("comparisonSection"),
    exportWorkspaceButton: document.getElementById("exportWorkspaceButton"),
    importWorkspaceButton: document.getElementById("importWorkspaceButton"),
    importWorkspaceInput: document.getElementById("importWorkspaceInput"),
    huntTabStrip: document.getElementById("huntTabStrip"),
    huntWorkspace: document.getElementById("huntWorkspace"),
    huntWorkspaceActions: document.getElementById("huntWorkspaceActions"),
    appAlert: document.getElementById("appAlert"),
    inputSection: document.getElementById("inputSection"),
    modeBestiaryButton: document.getElementById("modeBestiaryButton"),
    modeProgressButton: document.getElementById("modeProgressButton"),
    respawnModeBlock: document.getElementById("respawnModeBlock"),
    respawnModeHint: document.getElementById("respawnModeHint"),
    sessionRapidButton: document.getElementById("sessionRapidButton"),
    sessionRegularButton: document.getElementById("sessionRegularButton"),
    modeTasksButton: document.getElementById("modeTasksButton"),
    output: document.getElementById("output"),
    pasteLogButton: document.getElementById("pasteLogButton"),
    processLogButton: document.getElementById("processLogButton"),
    resultsCopy: document.getElementById("resultsCopy"),
    resultsTitle: document.getElementById("resultsTitle"),
    sessionEditor: document.getElementById("sessionEditor"),
    sessionLog: document.getElementById("sessionLog"),
    sessionToggle: document.getElementById("sessionToggle"),
    srStatus: document.getElementById("srStatus")
};

const RESPAWN_MODE_HINT = "Records the spawn conditions this Hunt Analyzer was captured under. It changes no calculation.";

const VIEW_CONTENT = {
    allSessions: {
        resultsTitle: "All Sessions Analysis",
        resultsCopy: "A creature analyzed in several sessions appears once per session; keep the one you will hunt. Combined time adds each session's longest remaining time, and total kills belong to the session that produced the entry."
    },
    charmPlan: {
        resultsTitle: "Charm Plan",
        resultsCopy: "Charm points are only earned once an entry is complete, so partial progress counts for nothing."
    },
    tasks: {
        resultsCopy: "Estimated from the kill rate this session recorded."
    },
    session: {
        resultsCopy: "Total kills apply when you leave the field."
    },
    library: {
        resultsTitle: "Session Library",
        resultsCopy: "Every Hunt Analyzer you have stored. Name them, date them, and note the conditions so a rate you recorded months ago still means something."
    }
};

const FIXED_VIEWS = {
    bestiary: ["charmPlan", "allSessions", "library"],
    // In Trackers mode the fixed tabs ARE the trackers.
    trackers: getTrackerIds(),
    tasks: ["allSessions", "library"]
};

const RESPAWN_MODE_LABELS = {
    regular: "Regular",
    rapid: "Rapid Respawn"
};

const RESPAWN_MODE_SHORT_LABELS = {
    regular: "Regular",
    rapid: "Rapid"
};

const state = {
    mode: "bestiary",
    activeHuntId: "",
    bestiaryData: [],
    bestiaryView: "session",
    isSessionInputOpen: false,
    // Library sort and filters are view state, not workspace data, so they are
    // deliberately absent from getWorkspaceSnapshot() and the export format.
    librarySort: { key: "label", direction: "asc" },
    libraryFilters: { respawnMode: "all", search: "" },
    // Tracker progress is user data and IS persisted, keyed by tracker id. Sort,
    // filters and paging are view state and are deliberately not.
    trackerProgress: {},
    trackerItems: {},
    activeTrackerId: TRACKERS[0].id,
    trackerSort: {},
    trackerFilters: {},
    trackerPageSize: 60,
    trackerPageIndex: 0,
    excludedAllTabsEntries: [],
    hunts: [],
    ignoredPlanHuntIds: [],
    planRespawnMode: "regular",
    playTimeInput: "",
    tasksView: "session"
};

function getModeView() {
    if (state.mode === "trackers") {
        return state.activeTrackerId;
    }

    return state.mode === "tasks" ? state.tasksView : state.bestiaryView;
}

function setModeView(view) {
    if (state.mode === "trackers") {
        state.activeTrackerId = view;
        // Paging is per-view, so opening another tracker starts at its first page.
        state.trackerPageIndex = 0;
        return;
    }

    if (state.mode === "tasks") {
        state.tasksView = view;
        return;
    }

    state.bestiaryView = view;
}

function showAlert(message) {
    elements.appAlert.textContent = message;
}

function announce(message) {
    elements.srStatus.textContent = message;
}

function setBusyState(isBusy) {
    elements.processLogButton.disabled = isBusy;
    elements.pasteLogButton.disabled = isBusy;
    elements.clearLogButton.disabled = isBusy;
}

function getActiveHunt() {
    return state.hunts.find((hunt) => hunt.id === state.activeHuntId) || state.hunts[0];
}

function getHuntLabelById(huntId) {
    const index = state.hunts.findIndex((hunt) => hunt.id === huntId);

    return getHuntLabel(index, state.hunts[index]);
}

function getComparableHunts() {
    return state.hunts.filter(hasBestiaryAnalysis);
}

function getWorkspaceSnapshot() {
    return {
        mode: state.mode,
        activeHuntId: state.activeHuntId,
        trackerProgress: state.trackerProgress,
        bestiaryView: state.bestiaryView,
        excludedAllTabsEntries: state.excludedAllTabsEntries,
        hunts: state.hunts,
        ignoredPlanHuntIds: state.ignoredPlanHuntIds,
        planRespawnMode: state.planRespawnMode,
        playTimeInput: state.playTimeInput,
        tasksView: state.tasksView
    };
}

function hasWorkspaceContent() {
    return state.hunts.some(huntHasContent);
}

function persistState() {
    if (!state.hunts.length) {
        return;
    }

    saveWorkspaceState(getWorkspaceSnapshot());
}

/**
 * Reads every visible total-kills field into the canonical progress record.
 * Editing the number anywhere is editing your Bestiary, so all sessions that
 * feature the creature update together.
 */
function commitVisibleTotalKills() {
    elements.output.querySelectorAll(".kills-input").forEach((input) => {
        setEntry(state.trackerProgress, "bestiary", input.dataset.monsterName, bestiaryTracker.entryDefaults, {
            kills: input.value
        });
    });
}

/**
 * Bestiary total kills are a property of the player, not of a session, so every
 * session reads the same canonical record. The arithmetic in recalculateProgress
 * is untouched — only the source of its totalKills argument.
 */
function getBestiaryKills(creatureName) {
    return getEntry(state.trackerProgress, "bestiary", creatureName, bestiaryTracker.entryDefaults).kills;
}

function buildBestiaryTotalKills(creatureNames) {
    return creatureNames.reduce((totals, creatureName) => {
        totals[creatureName] = getBestiaryKills(creatureName);
        return totals;
    }, {});
}

function commitAllHuntProgress() {
    state.hunts.forEach(commitHuntProgress);
}

function commitHuntProgress(hunt) {
    const { monsters, selectedMonsterNames } = calculateBestiaryResult(hunt);

    hunt.matchedMonsters = monsters;
    hunt.selectedBestiaryMonsterNames = selectedMonsterNames;
}

function captureActiveHuntInputs() {
    const hunt = getActiveHunt();

    if (!hunt || state.mode !== "bestiary" || getModeView() !== "session") {
        return;
    }

    hunt.sessionLog = elements.sessionLog.value;

    commitVisibleTotalKills();
    commitAllHuntProgress();
}

function captureAllTabsInputs() {
    if (state.mode !== "bestiary" || getModeView() !== "allSessions") {
        return;
    }

    // All Sessions shows one row per session, but the totals behind them are a
    // single per-creature fact, so the hunt id on the field no longer matters.
    commitVisibleTotalKills();
    commitAllHuntProgress();
}

function captureTaskInputs() {
    const hunt = getActiveHunt();

    if (!hunt || state.mode !== "tasks" || getModeView() !== "session") {
        return;
    }

    hunt.sessionLog = elements.sessionLog.value;

    const taskTargetInput = document.getElementById("taskTotalKills");
    if (taskTargetInput) {
        hunt.taskTargetKills = taskTargetInput.value;
    }
}

function captureVisibleInputs() {
    if (state.mode === "trackers") {
        captureTrackerInputs();
        return;
    }

    if (state.mode === "tasks") {
        captureTaskInputs();
        return;
    }

    if (getModeView() === "allSessions") {
        captureAllTabsInputs();
        return;
    }

    captureActiveHuntInputs();
}

/**
 * Bestiary totals are a property of the player, not of a session. Every session
 * reads the same canonical record, so a creature that appears in three logs can
 * no longer hold three disagreeing totals.
 *
 * The arithmetic in recalculateProgress is untouched — only the source of its
 * totalKills argument changed.
 */
function calculateBestiaryResult(hunt) {
    const monsters = recalculateProgress(
        hunt.matchedMonsters,
        state.bestiaryData,
        hunt.sessionDuration,
        buildBestiaryTotalKills(hunt.matchedMonsters.map((monster) => monster.name))
    );
    const availableMonsterNames = new Set(monsters.map((monster) => monster.name));
    const selectedMonsterNames = hunt.selectedBestiaryMonsterNames
        .filter((monsterName) => availableMonsterNames.has(monsterName));
    const selectedNameSet = new Set(selectedMonsterNames);
    const selectedMonsters = monsters.filter((monster) => selectedNameSet.has(monster.name));

    return {
        monsters,
        selectedMonsterNames,
        selectedMonsters,
        summary: summarizeBestiaryMonsters(selectedMonsters)
    };
}

function calculateAllTabsResult() {
    const huntEntries = state.hunts
        .map((hunt, index) => ({ hunt, label: getHuntLabel(index, hunt) }))
        .filter((huntEntry) => hasBestiaryAnalysis(huntEntry.hunt))
        .map((huntEntry) => ({
            id: huntEntry.hunt.id,
            label: huntEntry.label,
            monsters: calculateBestiaryResult(huntEntry.hunt).selectedMonsters
        }))
        .filter((huntEntry) => huntEntry.monsters.length > 0);
    const analysis = buildAllTabsAnalysis(huntEntries, state.excludedAllTabsEntries);
    const huntSummaries = analysis.participatingHunts
        .map((participatingHunt) => summarizeBestiaryMonsters(participatingHunt.selectedMonsters));

    return {
        analysis,
        summary: aggregateAllTabsSummary(huntSummaries)
    };
}

function isHuntAvailableForPlan(huntId) {
    return !state.ignoredPlanHuntIds.includes(huntId);
}

function getProcessedSessions() {
    return state.hunts
        .map((hunt, index) => ({ hunt, id: hunt.id, label: getHuntLabel(index, hunt) }))
        .filter((session) => hasBestiaryAnalysis(session.hunt));
}

function matchesPlanRespawnMode(hunt) {
    return hunt.respawnMode === state.planRespawnMode;
}

function isHuntEligibleForPlan(hunt) {
    return isHuntAvailableForPlan(hunt.id) && matchesPlanRespawnMode(hunt);
}

function getCharmPlanView() {
    const { analysis } = calculateAllTabsResult();
    const consideredSessions = getProcessedSessions().map((session) => ({
        id: session.id,
        label: session.label,
        respawnModeLabel: RESPAWN_MODE_SHORT_LABELS[session.hunt.respawnMode],
        isAvailable: isHuntAvailableForPlan(session.id),
        matchesPlanMode: matchesPlanRespawnMode(session.hunt)
    }));
    const eligibleHuntIds = new Set(state.hunts.filter(isHuntEligibleForPlan).map((hunt) => hunt.id));
    const huntGroups = analysis.participatingHunts
        .filter((participatingHunt) => eligibleHuntIds.has(participatingHunt.id))
        .map((participatingHunt) => ({
            id: participatingHunt.id,
            label: participatingHunt.label,
            monsters: participatingHunt.selectedMonsters
        }));
    const availableMinutes = parsePlayTimeMinutes(state.playTimeInput);

    return {
        playTimeValue: state.playTimeInput,
        planRespawnMode: state.planRespawnMode,
        planRespawnModeLabel: RESPAWN_MODE_LABELS[state.planRespawnMode],
        consideredSessions,
        hasAnalyzedHunts: consideredSessions.length > 0,
        hasModeMatchedHunts: consideredSessions.some((session) => session.matchesPlanMode),
        hasEligibleHunts: huntGroups.length > 0,
        plan: availableMinutes === null || !huntGroups.length
            ? null
            : planCharmTime(huntGroups, availableMinutes)
    };
}

function getCharmPlanTabMeta(planView) {
    if (planView.hasAnalyzedHunts && !planView.hasEligibleHunts) {
        return "None eligible";
    }

    return planView.plan ? `+${formatNumber(planView.plan.charms)} charms` : "No play time";
}

function updateCharmPlanResult() {
    const planResult = document.getElementById("charmPlanResult");

    if (!planResult) {
        return;
    }

    const planView = getCharmPlanView();
    const planTabMeta = elements.huntTabStrip
        .querySelector('[data-fixed-select="charmPlan"] .hunt-tab-meta');

    planResult.innerHTML = buildCharmPlanResultMarkup(planView);
    attachPlanHuntLinks();

    if (planTabMeta) {
        planTabMeta.textContent = getCharmPlanTabMeta(planView);
    }
}

function normalizeView() {
    if (state.bestiaryView === "comparison" && getComparableHunts().length < 2) {
        state.bestiaryView = "session";
    }
}

function setEmptyOutput() {
    elements.output.className = "empty-state";
    elements.output.innerHTML = state.mode === "tasks"
        ? `
            <strong>No task estimate yet.</strong>
            <span>Process a Hunt Analyzer to select a creature and project the time remaining.</span>
        `
        : `
            <strong>No analysis yet.</strong>
            <span>Process a Hunt Analyzer to view matched creatures, time remaining, and charm rate.</span>
        `;
}

function renderBestiaryMode(hunt) {
    const { monsters, selectedMonsterNames, summary } = calculateBestiaryResult(hunt);

    commitHuntProgress(hunt);

    renderResults(elements.output, monsters, selectedMonsterNames, summary);
    attachResultActions();
}

function getTaskEstimateForHunt(hunt) {
    return calculateTaskEstimate(
        hunt.taskMonsters,
        hunt.selectedTaskMonsterName,
        hunt.sessionDuration,
        hunt.taskTargetKills
    );
}

function getBestiaryTabMeta(hunt) {
    return hasBestiaryAnalysis(hunt)
        ? formatCharmsPerHour(calculateBestiaryResult(hunt).summary.totalCharmsPerHour)
        : "No analysis";
}

function getTaskTabMeta(hunt) {
    if (!hasTaskAnalysis(hunt)) {
        return "No analysis";
    }

    const estimate = getTaskEstimateForHunt(hunt);

    return estimate.selectedMonster
        ? formatTaskRate(estimate.killRatePerHour)
        : `${formatNumber(hunt.taskMonsters.length)} creatures`;
}

function buildLibraryTab(view) {
    return {
        key: "library",
        label: "Library",
        meta: `${formatNumber(state.hunts.length)} ${state.hunts.length === 1 ? "session" : "sessions"}`,
        isActive: view === "library"
    };
}

function buildFixedTabs(view) {
    if (state.mode === "trackers") {
        return TRACKERS.map((tracker) => ({
            key: tracker.id,
            label: tracker.label,
            meta: tracker.tabMeta(buildTrackerRows(tracker)),
            isActive: view === tracker.id
        }));
    }

    if (state.mode === "tasks") {
        const processedCount = state.hunts.filter(hasTaskAnalysis).length;

        return [
            {
                key: "allSessions",
                label: "All Sessions",
                meta: processedCount
                    ? `${formatNumber(processedCount)} processed`
                    : "No analysis",
                isActive: view === "allSessions"
            },
            buildLibraryTab(view)
        ];
    }

    const { analysis, summary } = calculateAllTabsResult();
    const planView = getCharmPlanView();

    return [
        {
            key: "charmPlan",
            label: "Charm Plan",
            meta: getCharmPlanTabMeta(planView),
            isActive: view === "charmPlan"
        },
        {
            key: "allSessions",
            label: "All Sessions",
            meta: analysis.rows.length ? formatCharmsPerHour(summary.charmRate) : "No analysis",
            isActive: view === "allSessions"
        },
        buildLibraryTab(view)
    ];
}

function applySessionInput(hunt, creatureCount) {
    const canCollapse = hunt.hasProcessedLog;
    const isOpen = !canCollapse || state.isSessionInputOpen;

    elements.respawnModeBlock.hidden = false;
    elements.respawnModeHint.textContent = RESPAWN_MODE_HINT;
    elements.sessionRegularButton.classList.toggle("is-selected", hunt.respawnMode === "regular");
    elements.sessionRapidButton.classList.toggle("is-selected", hunt.respawnMode === "rapid");
    elements.sessionRegularButton.setAttribute("aria-pressed", String(hunt.respawnMode === "regular"));
    elements.sessionRapidButton.setAttribute("aria-pressed", String(hunt.respawnMode === "rapid"));
    elements.sessionLog.value = hunt.sessionLog;

    elements.sessionToggle.hidden = !canCollapse;
    elements.sessionToggle.setAttribute("aria-expanded", String(isOpen));
    elements.sessionToggle.textContent = isOpen
        ? "Hide Hunt Analyzer"
        : [
            getHuntLabelById(hunt.id),
            formatTimeDetailed(hunt.sessionDuration),
            `${formatNumber(creatureCount)} ${creatureCount === 1 ? "creature" : "creatures"}`,
            RESPAWN_MODE_LABELS[hunt.respawnMode]
        ].join(" · ");
    elements.sessionEditor.hidden = !isOpen;
}

function renderHuntTabStrip() {
    const view = getModeView();
    const isBestiary = state.mode === "bestiary";
    // Trackers are not session-scoped, so the strip carries only tracker tabs —
    // no session tabs and no "add session" control.
    const isTrackers = state.mode === "trackers";
    const huntTabs = isTrackers ? [] : state.hunts.map((hunt, index) => ({
        id: hunt.id,
        label: getHuntLabel(index, hunt),
        meta: [
            isBestiary ? getBestiaryTabMeta(hunt) : getTaskTabMeta(hunt),
            hunt.hasProcessedLog ? RESPAWN_MODE_SHORT_LABELS[hunt.respawnMode] : ""
        ].filter(Boolean).join(" · "),
        isActive: view === "session" && hunt.id === state.activeHuntId
    }));
    const isComparing = view === "comparison";

    renderHuntTabs(elements.huntTabStrip, buildFixedTabs(view), huntTabs, { canAdd: !isTrackers });
    attachHuntTabActions();

    elements.huntWorkspaceActions.hidden = !isBestiary;
    elements.compareHuntsButton.disabled = getComparableHunts().length < 2;
    elements.compareHuntsButton.classList.toggle("is-selected", isComparing);
    elements.compareHuntsButton.setAttribute("aria-pressed", String(isComparing));
}

function renderHuntView() {
    const hunt = getActiveHunt();
    const huntLabel = getHuntLabelById(hunt.id);

    elements.comparisonSection.hidden = true;
    elements.inputSection.hidden = false;
    elements.analysisSection.hidden = false;
    applySessionInput(hunt, hunt.matchedMonsters.length);
    elements.resultsTitle.textContent = `${huntLabel} Analysis`;
    elements.resultsCopy.textContent = VIEW_CONTENT.session.resultsCopy;

    if (hunt.matchedMonsters.length || hunt.hasProcessedLog) {
        renderBestiaryMode(hunt);
        return;
    }

    setEmptyOutput();
}

function renderAllTabsView() {
    const { analysis, summary } = calculateAllTabsResult();

    elements.comparisonSection.hidden = true;
    elements.inputSection.hidden = true;
    elements.analysisSection.hidden = false;
    elements.resultsTitle.textContent = VIEW_CONTENT.allSessions.resultsTitle;
    elements.resultsCopy.textContent = VIEW_CONTENT.allSessions.resultsCopy;

    renderAllTabs(elements.output, analysis, summary);
    attachAllTabsActions();
}

function renderCharmPlanView() {
    elements.comparisonSection.hidden = true;
    elements.inputSection.hidden = true;
    elements.analysisSection.hidden = false;
    elements.resultsTitle.textContent = VIEW_CONTENT.charmPlan.resultsTitle;
    elements.resultsCopy.textContent = VIEW_CONTENT.charmPlan.resultsCopy;

    renderCharmPlan(elements.output, getCharmPlanView());
    attachCharmPlanActions();
    attachPlanHuntLinks();
}

function renderComparisonView() {
    const comparison = buildHuntComparison(state.hunts.map((hunt, index) => ({
        id: hunt.id,
        label: getHuntLabel(index, hunt),
        summary: hasBestiaryAnalysis(hunt) ? calculateBestiaryResult(hunt).summary : null
    })));

    elements.inputSection.hidden = true;
    elements.analysisSection.hidden = true;
    elements.comparisonSection.hidden = false;

    renderComparison(elements.comparisonOutput, comparison);
}

function renderTaskSessionView() {
    const hunt = getActiveHunt();
    const huntLabel = getHuntLabelById(hunt.id);
    const estimate = getTaskEstimateForHunt(hunt);

    elements.comparisonSection.hidden = true;
    elements.inputSection.hidden = false;
    elements.analysisSection.hidden = false;
    applySessionInput(hunt, hunt.taskMonsters.length);
    elements.resultsTitle.textContent = `${huntLabel} Task Estimate`;
    elements.resultsCopy.textContent = VIEW_CONTENT.tasks.resultsCopy;

    if (!hasTaskAnalysis(hunt) && !hunt.hasProcessedLog) {
        setEmptyOutput();
        return;
    }

    renderTaskResults(
        elements.output,
        hunt.taskMonsters,
        estimate,
        hunt.sessionDuration,
        RESPAWN_MODE_LABELS[hunt.respawnMode]
    );
    attachTaskActions();
}

/* --------------------------------------------------------------------------
   Bestiary manager
   -------------------------------------------------------------------------- */


/* --------------------------------------------------------------------------
   Trackers
   -------------------------------------------------------------------------- */

/**
 * Datasets load once at boot, in registry order, and each loader is handed what
 * has loaded already — which is how the Cyclopedia Map subareas pick up their
 * Bestiary creature counts without fetching bestiary.json a second time.
 *
 * Bestiary itself reuses the copy the session analysis already needs.
 */
async function loadTrackerItems(bestiaryData) {
    const loaded = { bestiary: bestiaryData };

    for (const tracker of TRACKERS) {
        if (!loaded[tracker.id]) {
            loaded[tracker.id] = await tracker.loadItems(loaded);
        }
    }

    return loaded;
}

/**
 * Some progress is a consequence of another tracker: completing every subarea of
 * a Cyclopedia Map area earns that area's achievement, so the Achievements
 * tracker should show it without the user recording it twice.
 *
 * One level only — a tracker that supplies derived keys must not itself consume
 * them, which keeps this a single pass with no cycle to resolve.
 */
function getExternalDoneKeys(trackerId) {
    return TRACKERS.reduce((keys, tracker) => {
        if (tracker.derivesFor === trackerId && tracker.deriveExternalDone) {
            tracker.deriveExternalDone(buildTrackerRows(tracker)).forEach((key) => keys.add(key));
        }

        return keys;
    }, new Set());
}

function getActiveTracker() {
    return getTracker(state.activeTrackerId);
}

/** Sort and filter state is created per tracker on first use, from its facets. */
function getTrackerSort(tracker) {
    if (!state.trackerSort[tracker.id]) {
        state.trackerSort[tracker.id] = { key: tracker.defaultSortKey ?? tracker.columns[1].key, direction: "asc" };
    }

    return state.trackerSort[tracker.id];
}

function getTrackerFilters(tracker) {
    if (!state.trackerFilters[tracker.id]) {
        state.trackerFilters[tracker.id] = buildInitialFilters(tracker);
    }

    return state.trackerFilters[tracker.id];
}

function getTrackerItems(tracker) {
    return state.trackerItems[tracker.id] ?? [];
}

function entryFor(tracker, item) {
    return getEntry(state.trackerProgress, tracker.id, tracker.itemKey(item), tracker.entryDefaults);
}

function buildTrackerRows(tracker, externalDone) {
    const context = {
        externalDone: externalDone ?? (tracker.consumesDerived ? getExternalDoneKeys(tracker.id) : null)
    };

    return getTrackerItems(tracker).map((item) => tracker.derive(item, entryFor(tracker, item), context));
}

function filterTrackerRows(tracker, rows) {
    const filters = getTrackerFilters(tracker);

    return rows.filter((row) => tracker.facets.every((facet) => {
        const value = filters[facet.key];

        if (facet.kind === "check") {
            return !value || facet.matches(row, value);
        }

        if (facet.kind === "search") {
            return !String(value).trim() || facet.matches(row, value);
        }

        return value === "all" || facet.matches(row, value);
    }));
}

function sortTrackerRows(tracker, rows) {
    const { key, direction } = getTrackerSort(tracker);
    const column = tracker.columns.find((candidate) => candidate.key === key) ?? tracker.columns[1];
    const factor = direction === "desc" ? -1 : 1;
    // Booleans and counters both sort numerically; only labels sort as text.
    const numeric = column.isNumeric || typeof rows[0]?.[key] === "number" || typeof rows[0]?.[key] === "boolean";

    return [...rows].sort((left, right) => {
        const a = numeric ? Number(left[key]) || 0 : String(left[key] ?? "").toLowerCase();
        const b = numeric ? Number(right[key]) || 0 : String(right[key] ?? "").toLowerCase();

        if (a === b) {
            return left.name.localeCompare(right.name) * factor;
        }

        return (a < b ? -1 : 1) * factor;
    });
}

/**
 * Hundreds of rows re-render on every keystroke in a count field, so the default
 * page size is a deliberate performance guard rather than a nicety.
 */
function paginateTrackerRows(rows) {
    const size = state.trackerPageSize;

    if (!size) {
        return { rows, page: { from: rows.length ? 1 : 0, to: rows.length, total: rows.length, size, index: 0, lastIndex: 0 } };
    }

    const lastIndex = Math.max(0, Math.ceil(rows.length / size) - 1);
    const index = Math.min(state.trackerPageIndex, lastIndex);

    state.trackerPageIndex = index;

    const start = index * size;
    const pageRows = rows.slice(start, start + size);

    return {
        rows: pageRows,
        page: { from: rows.length ? start + 1 : 0, to: start + pageRows.length, total: rows.length, size, index, lastIndex }
    };
}

function getTrackerView(tracker) {
    const allRows = buildTrackerRows(tracker);
    const visible = sortTrackerRows(tracker, filterTrackerRows(tracker, allRows));
    const { rows, page } = paginateTrackerRows(visible);

    return {
        tracker,
        rows,
        page,
        columns: tracker.columns,
        sort: getTrackerSort(tracker),
        filters: getTrackerFilters(tracker),
        items: getTrackerItems(tracker),
        totals: tracker.totals(allRows)
    };
}

/**
 * A tracker's tab shows its own progress, so a change has to reach the strip.
 * Re-rendering the whole strip would destroy the field being typed into, so the
 * one affected tab's meta is updated in place — the same approach
 * updateCharmPlanResult and syncHuntTabLabel already use.
 */
function syncTrackerTabMeta(tracker) {
    const meta = elements.huntTabStrip
        .querySelector(`[data-fixed-select="${tracker.id}"] .hunt-tab-meta`);

    if (meta) {
        meta.textContent = tracker.tabMeta(buildTrackerRows(tracker));
    }
}

function renderTrackerView() {
    const tracker = getActiveTracker();

    elements.comparisonSection.hidden = true;
    elements.inputSection.hidden = true;
    elements.analysisSection.hidden = false;
    elements.respawnModeBlock.hidden = true;
    elements.resultsTitle.textContent = tracker.resultsTitle;
    elements.resultsCopy.textContent = tracker.resultsCopy;

    renderTracker(elements.output, getTrackerView(tracker));
    attachTrackerActions();
    // Completing a Cyclopedia Map area changes the Achievements total too, so
    // every tab's meta is refreshed rather than only the active one.
    TRACKERS.forEach(syncTrackerTabMeta);
}




/**
 * 833 rows re-render on every keystroke in a kills field, so the default page
 * size is a deliberate performance guard rather than a nicety.
 */



function buildLibraryRows() {
    return state.hunts.map((hunt, index) => {
        const summary = hasBestiaryAnalysis(hunt) ? calculateBestiaryResult(hunt).summary : null;

        return {
            id: hunt.id,
            name: hunt.name,
            label: getHuntLabel(index, hunt),
            huntedOn: hunt.huntedOn,
            notes: hunt.notes,
            respawnMode: hunt.respawnMode,
            respawnModeLabel: RESPAWN_MODE_LABELS[hunt.respawnMode],
            duration: hunt.sessionDuration,
            creatureCount: hunt.matchedMonsters.length,
            charmPoints: summary ? summary.totalCharms : 0,
            charmRate: summary ? summary.totalCharmsPerHour : 0,
            hasProcessedLog: hunt.hasProcessedLog,
            isActive: hunt.id === state.activeHuntId,
            canDelete: state.hunts.length > 1,
            searchText: [hunt.name, hunt.notes, ...hunt.matchedMonsters.map((monster) => monster.name)]
                .join(" ")
                .toLowerCase()
        };
    });
}

function filterLibraryRows(rows) {
    const { respawnMode, search } = state.libraryFilters;
    const needle = search.trim().toLowerCase();

    return rows.filter((row) => {
        if (respawnMode !== "all" && row.respawnMode !== respawnMode) {
            return false;
        }

        return !needle || row.searchText.includes(needle) || row.label.toLowerCase().includes(needle);
    });
}

function sortLibraryRows(rows) {
    const { key, direction } = state.librarySort;
    const column = LIBRARY_COLUMNS.find((candidate) => candidate.key === key) || LIBRARY_COLUMNS[0];
    const factor = direction === "desc" ? -1 : 1;

    // Sorting a copy keeps state.hunts in its own order: the positional
    // "Session N" labels must not renumber just because the table is re-sorted.
    return [...rows].sort((left, right) => {
        const a = column.isNumeric ? Number(left[key]) || 0 : String(left[key] ?? "").toLowerCase();
        const b = column.isNumeric ? Number(right[key]) || 0 : String(right[key] ?? "").toLowerCase();

        if (a === b) {
            return left.label.localeCompare(right.label, undefined, { numeric: true }) * factor;
        }

        return (a < b ? -1 : 1) * factor;
    });
}

function renderSessionLibraryView() {
    const rows = buildLibraryRows();
    const visible = sortLibraryRows(filterLibraryRows(rows));

    elements.comparisonSection.hidden = true;
    elements.inputSection.hidden = true;
    elements.analysisSection.hidden = false;
    elements.respawnModeBlock.hidden = true;
    elements.resultsTitle.textContent = VIEW_CONTENT.library.resultsTitle;
    elements.resultsCopy.textContent = VIEW_CONTENT.library.resultsCopy;

    renderSessionLibrary(
        elements.output,
        visible,
        state.librarySort,
        state.libraryFilters,
        { shown: visible.length, total: rows.length }
    );
    attachLibraryActions();
}

function renderTaskSessionsView() {
    const sessions = state.hunts
        .map((hunt, index) => ({ hunt, id: hunt.id, label: getHuntLabel(index, hunt) }))
        .filter((session) => hasTaskAnalysis(session.hunt))
        .map((session) => ({
            id: session.id,
            label: session.label,
            respawnModeLabel: RESPAWN_MODE_SHORT_LABELS[session.hunt.respawnMode],
            estimate: getTaskEstimateForHunt(session.hunt)
        }));

    elements.comparisonSection.hidden = true;
    elements.inputSection.hidden = true;
    elements.analysisSection.hidden = false;
    elements.respawnModeBlock.hidden = true;
    elements.resultsTitle.textContent = "All Sessions Task Estimates";
    elements.resultsCopy.textContent = "Every processed session with the creature and task target you chose for it, estimated from that session's own kill rate.";

    renderTaskSessions(elements.output, sessions);
    attachTaskSessionLinks();
}

function applyPrimaryMode() {
    const buttonsByMode = {
        bestiary: elements.modeBestiaryButton,
        trackers: elements.modeProgressButton,
        tasks: elements.modeTasksButton
    };

    Object.entries(buttonsByMode).forEach(([mode, button]) => {
        const isSelected = state.mode === mode;

        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-selected", String(isSelected));
    });
}

function renderApp() {
    const view = getModeView();

    elements.appAlert.textContent = "";

    applyPrimaryMode();

    elements.huntWorkspace.hidden = false;
    renderHuntTabStrip();

    if (state.mode === "trackers") {
        renderTrackerView();
        return;
    }

    // The library manages the logs both modes share, so it renders identically
    // in either one.
    if (view === "library") {
        renderSessionLibraryView();
        return;
    }

    if (state.mode === "tasks") {
        if (view === "allSessions") {
            renderTaskSessionsView();
            return;
        }

        renderTaskSessionView();
        return;
    }

    if (view === "comparison") {
        renderComparisonView();
        return;
    }

    if (view === "allSessions") {
        renderAllTabsView();
        return;
    }

    if (view === "charmPlan") {
        renderCharmPlanView();
        return;
    }

    renderHuntView();
}

function setMode(mode) {
    state.isSessionInputOpen = false;
    if (state.mode === mode) {
        return;
    }

    captureVisibleInputs();
    state.mode = mode;
    renderApp();
    persistState();

    if (mode === "tasks") {
        return;
    }

}

async function pasteLog() {
    try {
        const clipboardText = await navigator.clipboard.readText();
        getActiveHunt().sessionLog = clipboardText;
        state.isSessionInputOpen = true;
        renderApp();
        persistState();
        elements.sessionLog.focus();
    } catch (error) {
        showAlert("Clipboard access blocked. Paste the text manually.");
    }
}

function clearLog() {
    const hunt = getActiveHunt();
    const clearedHunt = resetHunt(hunt);

    state.hunts = state.hunts.map((current) => (current.id === hunt.id ? clearedHunt : current));
    state.activeHuntId = clearedHunt.id;
    dropAllTabsEntriesOfHunt(hunt.id);
    dropIgnoredPlanHunt(hunt.id);
    normalizeView();
    renderApp();
    persistState();
    elements.sessionLog.focus();
}

function selectHunt(huntId) {
    state.isSessionInputOpen = false;
    captureVisibleInputs();
    state.activeHuntId = huntId;
    setModeView("session");
    renderApp();
    persistState();
}

function addHuntTab() {
    state.isSessionInputOpen = false;
    captureVisibleInputs();

    const { hunt, hunts } = addHunt(state.hunts);

    state.hunts = hunts;
    state.activeHuntId = hunt.id;
    setModeView("session");
    renderApp();
    persistState();
}

function closeHuntTab(huntId) {
    if (state.hunts.length < 2) {
        return;
    }

    captureVisibleInputs();

    const closedLabel = getHuntLabelById(huntId);
    const closedHunt = findHuntById(huntId);

    // Closing discards the pasted Hunt Analyzer and everything derived from it,
    // and there is no undo. An empty session has nothing to lose, so only ask
    // when there is something.
    if (closedHunt && huntHasContent(closedHunt)
        && !window.confirm(`Delete ${closedLabel}? Its Hunt Analyzer text, creature selection and total kills are discarded.`)) {
        return;
    }

    const { activeHuntId, hunts } = removeHunt(state.hunts, huntId, state.activeHuntId);

    state.hunts = hunts;
    state.activeHuntId = activeHuntId;
    dropAllTabsEntriesOfHunt(huntId);
    dropIgnoredPlanHunt(huntId);
    normalizeView();
    renderApp();
    persistState();
}

function showComparison() {
    captureVisibleInputs();

    if (getComparableHunts().length < 2) {
        return;
    }

    state.bestiaryView = "comparison";
    renderApp();
    persistState();
}

function selectFixedView(view) {
    if (getModeView() === view || !FIXED_VIEWS[state.mode].includes(view)) {
        return;
    }

    captureVisibleInputs();
    setModeView(view);
    renderApp();
    persistState();
}

/**
 * Totals are Bestiary progress now, so resetting them edits the player's record
 * rather than a scratch value on one session. That is worth confirming.
 */
function resetTotalsForCreatures(creatureNames, promptText) {
    const names = [...new Set(creatureNames)];
    const withKills = names.filter((name) => getBestiaryKills(name) > 0);

    if (!withKills.length || !window.confirm(promptText(withKills.length))) {
        return;
    }

    withKills.forEach((name) => setEntry(state.trackerProgress, "bestiary", name, bestiaryTracker.entryDefaults, { kills: 0 }));
    commitAllHuntProgress();
    renderApp();
    persistState();
    announce(`Total kills reset for ${withKills.length} creatures.`);
}

function clearInputs() {
    resetTotalsForCreatures(
        getActiveHunt().matchedMonsters.map((monster) => monster.name),
        (count) => `Reset your Bestiary total kills for ${count} ${count === 1 ? "creature" : "creatures"} in this session? This is your saved progress, not a per-session value.`
    );
}

function resetAllTabsTotals() {
    resetTotalsForCreatures(
        state.hunts.flatMap((hunt) => hunt.matchedMonsters.map((monster) => monster.name)),
        (count) => `Reset your Bestiary total kills for ${count} ${count === 1 ? "creature" : "creatures"} across every session? This is your saved progress, not a per-session value.`
    );
}

function toggleAllTabsEntry(entryKey) {
    captureAllTabsInputs();

    const isExcluded = state.excludedAllTabsEntries.includes(entryKey);

    state.excludedAllTabsEntries = isExcluded
        ? state.excludedAllTabsEntries.filter((key) => key !== entryKey)
        : [...state.excludedAllTabsEntries, entryKey];

    renderApp();
    persistState();
}

function toggleHuntPlanAvailability(huntId) {
    captureVisibleInputs();

    const isIgnored = state.ignoredPlanHuntIds.includes(huntId);

    state.ignoredPlanHuntIds = isIgnored
        ? state.ignoredPlanHuntIds.filter((ignoredId) => ignoredId !== huntId)
        : [...state.ignoredPlanHuntIds, huntId];

    renderApp();
    persistState();
}

function setPlanRespawnMode(respawnMode) {
    if (state.planRespawnMode === respawnMode) {
        return;
    }

    captureVisibleInputs();
    state.planRespawnMode = respawnMode;
    renderApp();
    persistState();
}

function setSessionRespawnMode(respawnMode) {
    const hunt = getActiveHunt();

    if (!hunt || hunt.respawnMode === respawnMode) {
        return;
    }

    captureVisibleInputs();
    hunt.respawnMode = respawnMode;
    renderApp();
    persistState();
}

function dropIgnoredPlanHunt(huntId) {
    state.ignoredPlanHuntIds = state.ignoredPlanHuntIds.filter((ignoredId) => ignoredId !== huntId);
}

function dropAllTabsEntriesOfHunt(huntId) {
    state.excludedAllTabsEntries = state.excludedAllTabsEntries
        .filter((entryKey) => !isEntryKeyForHunt(entryKey, huntId));
}

function getModelTotalKills(input) {
    const huntId = input.dataset.huntId;
    const hunt = huntId ? state.hunts.find((candidate) => candidate.id === huntId) : getActiveHunt();
    const monster = hunt?.matchedMonsters.find((candidate) => candidate.name === input.dataset.monsterName);

    return monster ? (monster.totalKills || 0) : 0;
}

function handleKillsCommit(event) {
    const input = event.target;

    if (!input.classList || !input.classList.contains("kills-input")) {
        return;
    }

    if ((Number.parseInt(input.value, 10) || 0) === getModelTotalKills(input)) {
        return;
    }

    captureVisibleInputs();
    persistState();

    const next = event.relatedTarget;

    if (next && next.classList && next.classList.contains("kills-input")) {
        const selector = next.dataset.huntId
            ? `.kills-input[data-monster-name="${next.dataset.monsterName}"][data-hunt-id="${next.dataset.huntId}"]`
            : `.kills-input[data-monster-name="${next.dataset.monsterName}"]`;

        renderApp();

        const restored = elements.output.querySelector(selector);

        if (restored) {
            restored.focus();
            restored.select();
        }

        return;
    }

    if (!next) {
        renderApp();
    }
}

function attachHuntTabActions() {
    const addHuntButton = document.getElementById("addHuntButton");

    if (addHuntButton) {
        addHuntButton.addEventListener("click", addHuntTab);
    }

    elements.huntTabStrip.querySelectorAll("[data-fixed-select]").forEach((button) => {
        button.addEventListener("click", () => selectFixedView(button.dataset.fixedSelect));
    });

    elements.huntTabStrip.querySelectorAll("[data-hunt-select]").forEach((button) => {
        button.addEventListener("click", () => selectHunt(button.dataset.huntSelect));
    });

    elements.huntTabStrip.querySelectorAll("[data-hunt-close]").forEach((button) => {
        button.addEventListener("click", () => closeHuntTab(button.dataset.huntClose));
    });
}

function attachPlanHuntLinks() {
    elements.output.querySelectorAll("[data-plan-hunt]").forEach((button) => {
        button.addEventListener("click", () => selectHunt(button.dataset.planHunt));
    });
}

function attachCharmPlanActions() {
    const playTimeInput = document.getElementById("playTimeInput");

    elements.output.querySelectorAll("[data-plan-availability]").forEach((button) => {
        button.addEventListener("click", () => toggleHuntPlanAvailability(button.dataset.planAvailability));
    });

    elements.output.querySelectorAll("[data-plan-respawn-mode]").forEach((button) => {
        button.addEventListener("click", () => setPlanRespawnMode(button.dataset.planRespawnMode));
    });

    if (!playTimeInput) {
        return;
    }

    playTimeInput.addEventListener("input", () => {
        state.playTimeInput = playTimeInput.value;
        updateCharmPlanResult();
        persistState();
    });
}

/**
 * The manager's kills fields deliberately use their own class and data
 * attribute. Reusing `.kills-input` would put them on the session commit path,
 * which reads every visible field into whichever hunt is active.
 */

function captureTrackerInputs() {
    const tracker = getActiveTracker();

    elements.output.querySelectorAll(".tracker-count").forEach((input) => {
        setEntry(state.trackerProgress, tracker.id, input.dataset.trackerItem, tracker.entryDefaults, {
            [input.dataset.trackerField]: input.value
        });
    });
}

/**
 * Tracker count fields deliberately use their own class and data attributes.
 * Reusing `.kills-input` would put them on the session commit path, which reads
 * every visible field into whichever hunt is active.
 */
function commitTrackerCount(input) {
    const tracker = getActiveTracker();
    const { trackerItem: itemKey, trackerField: field } = input.dataset;
    const previous = getEntry(state.trackerProgress, tracker.id, itemKey, tracker.entryDefaults)[field];

    if ((Number.parseInt(input.value, 10) || 0) === previous) {
        return;
    }

    setEntry(state.trackerProgress, tracker.id, itemKey, tracker.entryDefaults, { [field]: input.value });
    onTrackerProgressChanged();
    renderTrackerView();

    const restored = elements.output
        .querySelector(`.tracker-count[data-tracker-item="${CSS.escape(itemKey)}"][data-tracker-field="${CSS.escape(field)}"]`);

    if (restored) {
        restored.focus();
        restored.select();
    }
}

/**
 * A tracker's progress can feed the session analysis (Bestiary total kills), so a
 * change has to refresh the derived per-session values as well as persist.
 */
function onTrackerProgressChanged() {
    commitAllHuntProgress();
    persistState();
}

function attachTrackerActions() {
    const tracker = getActiveTracker();

    elements.output.querySelectorAll(".tracker-count").forEach((input) => {
        input.addEventListener("focusout", () => commitTrackerCount(input));
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                input.blur();
            }
        });
    });

    elements.output.querySelectorAll("[data-tracker-flag]").forEach((button) => {
        button.addEventListener("click", () => {
            toggleEntryFlag(
                state.trackerProgress,
                tracker.id,
                button.dataset.trackerItem,
                tracker.entryDefaults,
                button.dataset.trackerFlag
            );
            onTrackerProgressChanged();
            renderTrackerView();
        });
    });

    elements.output.querySelectorAll("[data-tracker-sort]").forEach((button) => {
        button.addEventListener("click", () => {
            state.trackerSort[tracker.id] = {
                key: button.dataset.trackerSort,
                direction: button.dataset.trackerDirection === "desc" ? "desc" : "asc"
            };
            renderTrackerView();
        });
    });

    elements.output.querySelectorAll("[data-tracker-page-size]").forEach((button) => {
        button.addEventListener("click", () => {
            state.trackerPageSize = Number(button.dataset.trackerPageSize) || 0;
            state.trackerPageIndex = 0;
            renderTrackerView();
        });
    });

    elements.output.querySelectorAll("[data-tracker-page]").forEach((button) => {
        button.addEventListener("click", () => {
            state.trackerPageIndex = Math.max(0, state.trackerPageIndex + (button.dataset.trackerPage === "next" ? 1 : -1));
            renderTrackerView();
        });
    });

    attachTrackerFacets(tracker);
    attachTrackerTransfer(tracker);
}

function attachTrackerFacets(tracker) {
    const filters = getTrackerFilters(tracker);

    tracker.facets.forEach((facet) => {
        const setFilter = (value) => {
            filters[facet.key] = value;
            state.trackerPageIndex = 0;
        };

        if (facet.kind === "segmented") {
            elements.output.querySelectorAll(`[data-tracker-facet="${facet.key}"][data-tracker-facet-value]`)
                .forEach((button) => button.addEventListener("click", () => {
                    setFilter(button.dataset.trackerFacetValue);
                    renderTrackerView();
                }));
            return;
        }

        const field = document.getElementById(`trackerFacet-${facet.key}`);

        if (!field) {
            return;
        }

        if (facet.kind === "search") {
            field.addEventListener("input", () => {
                setFilter(field.value);
                renderTrackerView();

                // Re-rendering replaces the field, so focus and caret are restored.
                const restored = document.getElementById(`trackerFacet-${facet.key}`);

                if (restored) {
                    restored.focus();
                    restored.setSelectionRange(restored.value.length, restored.value.length);
                }
            });
            return;
        }

        field.addEventListener("change", () => {
            setFilter(facet.kind === "check" ? field.checked : field.value);
            renderTrackerView();
        });
    });
}

function attachTrackerTransfer(tracker) {
    if (!tracker.transfer) {
        return;
    }

    const importButton = document.getElementById("trackerImportButton");
    const importInput = document.getElementById("trackerImportInput");
    const exportButton = document.getElementById("trackerExportButton");

    if (importButton && importInput) {
        importButton.addEventListener("click", () => importInput.click());
        importInput.addEventListener("change", () => importTrackerFile(importInput, tracker));
    }

    if (exportButton) {
        exportButton.addEventListener("click", () => exportTrackerFile(tracker));
    }
}

function exportTrackerFile(tracker) {
    captureVisibleInputs();

    const exportedAt = new Date().toISOString();

    downloadFile(
        exportTrackerCsv(buildTrackerRows(tracker), getTrackerItems(tracker), tracker),
        buildTrackerExportFileName(tracker, exportedAt),
        "text/csv"
    );
    announce(`${tracker.label} progress exported.`);
}

/**
 * Import replaces this tracker's whole record, so it asks first when there is
 * something to lose. Points and thresholds are never read from the file.
 */
async function importTrackerFile(input, tracker) {
    const file = input.files?.[0];

    input.value = "";

    if (!file) {
        return;
    }

    try {
        const text = await file.text();
        const isJson = /\.json$/i.test(file.name) || /^[[{]/.test(text.trimStart());
        const items = getTrackerItems(tracker);
        const result = isJson
            ? importTrackerJson(text, items, tracker)
            : importTrackerCsv(text, items, tracker);

        if (!result.matched) {
            throw new Error(`No ${tracker.label} entry in that file matched the dataset.`);
        }

        const existing = Object.keys(getTrackerRecord(state.trackerProgress, tracker.id)).length;

        if (existing && !window.confirm(`Replace your saved ${tracker.label} progress (${existing} entries) with ${result.matched} rows from this file?`)) {
            return;
        }

        state.trackerProgress[tracker.id] = result.record;
        onTrackerProgressChanged();
        renderApp();

        const unmatched = result.unmatched.length;

        announce(`Imported ${result.matched} ${tracker.label} entries.`);

        if (unmatched) {
            showAlert(`Imported ${result.matched} entries. ${unmatched} name${unmatched === 1 ? "" : "s"} did not match the dataset and were skipped: ${result.unmatched.slice(0, 5).join(", ")}${unmatched > 5 ? "\u2026" : ""}`);
        }
    } catch (error) {
        showAlert(error.message);
    }
}


function findHuntById(huntId) {
    return state.hunts.find((hunt) => hunt.id === huntId);
}

/**
 * Renaming has to show up in the tab strip immediately, but a full re-render
 * while typing would destroy the field. So the one affected tab label is
 * updated in place, the same way updateCharmPlanResult() refreshes its tab.
 */
function syncHuntTabLabel(huntId) {
    const label = elements.huntTabStrip
        .querySelector(`[data-hunt-select="${huntId}"] .hunt-tab-label`);

    if (label) {
        label.textContent = getHuntLabelById(huntId);
    }
}

/**
 * Library text fields write straight to state on every keystroke and do not
 * re-render, so the caret is never disturbed while typing.
 */
function attachLibraryFieldEditors() {
    const bindField = (attribute, apply) => {
        elements.output.querySelectorAll(`[${attribute}]`).forEach((input) => {
            input.addEventListener("input", () => {
                const huntId = input.getAttribute(attribute);
                const hunt = findHuntById(huntId);

                if (!hunt) {
                    return;
                }

                apply(hunt, input.value);
                persistState();
                syncHuntTabLabel(huntId);
            });
        });
    };

    bindField("data-library-name", (hunt, value) => { hunt.name = value; });
    bindField("data-library-date", (hunt, value) => { hunt.huntedOn = value; });
    bindField("data-library-notes", (hunt, value) => { hunt.notes = value; });
}

function attachLibraryActions() {
    attachLibraryFieldEditors();

    elements.output.querySelectorAll("[data-library-sort]").forEach((button) => {
        button.addEventListener("click", () => {
            state.librarySort = {
                key: button.dataset.librarySort,
                direction: button.dataset.libraryDirection === "desc" ? "desc" : "asc"
            };
            renderApp();
        });
    });

    elements.output.querySelectorAll("[data-library-filter-respawn]").forEach((button) => {
        button.addEventListener("click", () => {
            state.libraryFilters.respawnMode = button.dataset.libraryFilterRespawn;
            renderApp();
        });
    });

    const search = document.getElementById("librarySearch");

    if (search) {
        search.addEventListener("input", () => {
            state.libraryFilters.search = search.value;
            renderSessionLibraryView();

            // Re-rendering replaces the field, so focus and caret are restored.
            const restored = document.getElementById("librarySearch");

            if (restored) {
                restored.focus();
                restored.setSelectionRange(restored.value.length, restored.value.length);
            }
        });
    }

    elements.output.querySelectorAll("[data-library-open]").forEach((button) => {
        button.addEventListener("click", () => selectHunt(button.dataset.libraryOpen));
    });

    elements.output.querySelectorAll("[data-library-delete]").forEach((button) => {
        button.addEventListener("click", () => closeHuntTab(button.dataset.libraryDelete));
    });

    const addButton = document.getElementById("libraryAddButton");

    if (addButton) {
        addButton.addEventListener("click", addHuntTab);
    }
}

function attachAllTabsActions() {
    const resetButton = document.getElementById("allTabsResetButton");

    if (resetButton) {
        resetButton.addEventListener("click", resetAllTabsTotals);
    }

    elements.output.querySelectorAll("[data-all-tabs-entry]").forEach((button) => {
        button.addEventListener("click", () => toggleAllTabsEntry(button.dataset.allTabsEntry));
    });
}

function attachResultActions() {
    const clearInputsButton = document.getElementById("clearInputsButton");

    if (clearInputsButton) {
        clearInputsButton.addEventListener("click", clearInputs);
    }

    elements.output.querySelectorAll("[data-bestiary-monster]").forEach((button) => {
        button.addEventListener("click", () => {
            captureActiveHuntInputs();

            const hunt = getActiveHunt();
            const monsterName = button.dataset.bestiaryMonster;
            const isSelected = hunt.selectedBestiaryMonsterNames.includes(monsterName);

            hunt.selectedBestiaryMonsterNames = isSelected
                ? hunt.selectedBestiaryMonsterNames.filter((name) => name !== monsterName)
                : [...hunt.selectedBestiaryMonsterNames, monsterName];

            renderApp();
            persistState();
        });
    });
}

function attachTaskSessionLinks() {
    elements.output.querySelectorAll("[data-task-session]").forEach((button) => {
        button.addEventListener("click", () => selectHunt(button.dataset.taskSession));
    });
}

function attachTaskActions() {
    const taskTotalInput = document.getElementById("taskTotalKills");

    elements.output.querySelectorAll("[data-task-monster]").forEach((button) => {
        button.addEventListener("click", () => {
            getActiveHunt().selectedTaskMonsterName = button.dataset.taskMonster;
            renderApp();
            persistState();
        });
    });

    if (!taskTotalInput) {
        return;
    }

    taskTotalInput.addEventListener("input", (event) => {
        getActiveHunt().taskTargetKills = event.target.value;
        persistState();
    });

    taskTotalInput.addEventListener("change", () => {
        renderApp();
    });

    taskTotalInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") {
            return;
        }

        event.preventDefault();
        renderApp();
    });
}

function processHuntLog(hunt, logText) {
    const bestiary = analyzeSession(logText, state.bestiaryData);
    const tasks = analyzeTaskSession(logText);
    const taskNames = new Set(tasks.monsters.map((monster) => monster.name));

    dropAllTabsEntriesOfHunt(hunt.id);
    hunt.sessionDuration = bestiary.sessionDuration;
    hunt.hasProcessedLog = true;

    // Stamp the archive date on first processing only, so a date the user
    // corrected in the library is never overwritten by re-processing.
    if (!hunt.huntedOn) {
        hunt.huntedOn = new Date().toISOString().slice(0, 10);
    }

    hunt.matchedMonsters = bestiary.monsters;
    hunt.selectedBestiaryMonsterNames = bestiary.monsters.map((monster) => monster.name);
    hunt.taskMonsters = tasks.monsters;
    hunt.selectedTaskMonsterName = taskNames.has(hunt.selectedTaskMonsterName)
        ? hunt.selectedTaskMonsterName
        : (tasks.monsters[0]?.name ?? "");
    state.isSessionInputOpen = false;

    renderApp();
    persistState();
    announce(bestiary.monsters.length
        ? `Analysis updated, ${bestiary.monsters.length} creatures matched.`
        : "No creatures matched the Bestiary dataset.");

    if (bestiary.sessionDuration === 0) {
        showAlert("No session duration found in the pasted text, so no time can be estimated.");
    }
}

function processLog() {
    captureVisibleInputs();

    const logText = getActiveHunt().sessionLog.trim();

    if (!logText) {
        state.isSessionInputOpen = true;
        renderApp();
        showAlert("Paste the Hunt Analyzer text before processing.");
        elements.sessionLog.focus();
        return;
    }

    setBusyState(true);
    processHuntLog(getActiveHunt(), logText);
    setBusyState(false);
}

function applyWorkspace(workspace) {
    state.mode = workspace.mode;
    state.trackerProgress = workspace.trackerProgress ?? createTrackerProgress();
    state.hunts = workspace.hunts;
    state.activeHuntId = workspace.activeHuntId;
    state.excludedAllTabsEntries = workspace.excludedAllTabsEntries;
    state.bestiaryView = workspace.bestiaryView;
    state.tasksView = workspace.tasksView;
    state.ignoredPlanHuntIds = workspace.ignoredPlanHuntIds;
    state.planRespawnMode = workspace.planRespawnMode;
    state.playTimeInput = workspace.playTimeInput;
    normalizeView();
}

function restoreWorkspaceState() {
    applyWorkspace(restoreWorkspace(loadWorkspaceState()) || createWorkspace());

    return hasWorkspaceContent();
}

function downloadFile(text, fileName, mimeType) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = url;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(url);
}


/**
 * Import replaces the whole progress record, so it asks first when there is
 * something to lose. Charm points and thresholds are never read from the file.
 */

function exportWorkspace() {
    captureVisibleInputs();
    persistState();

    const exportedAt = new Date().toISOString();
    const fileName = buildExportFileName(exportedAt);
    const blob = new Blob([serializeWorkspace(getWorkspaceSnapshot(), exportedAt)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = url;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(url);

}

function requestWorkspaceImport() {
    if (hasWorkspaceContent()
        && !window.confirm("Importing replaces the sessions you have now. Continue?")) {
        return;
    }

    elements.importWorkspaceInput.value = "";
    elements.importWorkspaceInput.click();
}

async function importWorkspaceFile(file) {
    try {
        const workspace = restoreWorkspace(parseWorkspaceFile(await file.text()));

        if (!workspace) {
            throw new Error("That file does not contain any exported sessions.");
        }

        applyWorkspace(workspace);
        renderApp();
        persistState();
    } catch (error) {
        showAlert(error.message);
    }
}

async function initializeApp() {
    try {
        setBusyState(true);
        state.bestiaryData = await loadBestiaryData();
        state.trackerItems = await loadTrackerItems(state.bestiaryData);

        const hasRestoredContent = restoreWorkspaceState();
        renderApp();

        if (hasRestoredContent) {
            return;
        }

    } catch (error) {
        showAlert("Could not load Bestiary data. Refresh the page to try again.");
    } finally {
        setBusyState(false);
    }
}

elements.sessionLog.addEventListener("input", () => {
    const hunt = getActiveHunt();

    if (hunt) {
        hunt.sessionLog = elements.sessionLog.value;
    }
});
elements.sessionLog.addEventListener("change", persistState);
elements.pasteLogButton.addEventListener("click", pasteLog);
elements.clearLogButton.addEventListener("click", clearLog);
elements.compareHuntsButton.addEventListener("click", showComparison);
elements.modeBestiaryButton.addEventListener("click", () => setMode("bestiary"));
elements.modeProgressButton.addEventListener("click", () => setMode("trackers"));
elements.modeTasksButton.addEventListener("click", () => setMode("tasks"));
elements.sessionRegularButton.addEventListener("click", () => setSessionRespawnMode("regular"));
elements.sessionRapidButton.addEventListener("click", () => setSessionRespawnMode("rapid"));
elements.processLogButton.addEventListener("click", processLog);
elements.sessionToggle.addEventListener("click", () => {
    captureVisibleInputs();
    state.isSessionInputOpen = !state.isSessionInputOpen;
    renderApp();
    persistState();

    if (state.isSessionInputOpen) {
        elements.sessionLog.focus();
    }
});
elements.output.addEventListener("focusout", handleKillsCommit);
elements.output.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.classList?.contains("kills-input")) {
        event.preventDefault();
        event.target.blur();
    }
});
elements.exportWorkspaceButton.addEventListener("click", exportWorkspace);
elements.importWorkspaceButton.addEventListener("click", requestWorkspaceImport);
elements.importWorkspaceInput.addEventListener("change", (event) => {
    const [file] = event.target.files;

    if (file) {
        importWorkspaceFile(file);
    }
});

initializeApp();
