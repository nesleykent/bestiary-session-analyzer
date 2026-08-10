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
import { loadSessionState, saveSessionState } from "./state/session-store.js";
import { buildExportFileName, parseWorkspaceFile, serializeWorkspace } from "./state/workspace-transfer.js";
import { renderAllTabs } from "./ui/render-all-tabs.js";
import { buildCharmPlanResultMarkup, renderCharmPlan } from "./ui/render-charm-plan.js";
import { renderComparison } from "./ui/render-comparison.js";
import { renderHuntTabs } from "./ui/render-hunt-tabs.js";
import { renderResults } from "./ui/render-results.js";
import { renderTaskResults } from "./ui/render-task-results.js";
import { renderTaskSessions } from "./ui/render-task-sessions.js";
import { formatCharmsPerHour, formatNumber, formatTaskRate } from "./utils/formatters.js";

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
    inputCopy: document.getElementById("inputCopy"),
    inputHint: document.getElementById("inputHint"),
    inputSection: document.getElementById("inputSection"),
    inputTitle: document.getElementById("inputTitle"),
    modeBestiaryButton: document.getElementById("modeBestiaryButton"),
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
    sessionLog: document.getElementById("sessionLog"),
    statusHint: document.getElementById("statusHint"),
    statusMessage: document.getElementById("statusMessage")
};

const RESPAWN_MODE_HINTS = {
    bestiary: "The spawn conditions this Hunt Analyzer was recorded under. It changes no calculation: the kill rates and estimates stay exactly as recorded. Charm Plan uses it to match sessions to the environment you are planning for.",
    tasks: "The spawn conditions this Hunt Analyzer was recorded under. It changes no calculation: it records that this session's kill rate was measured under these conditions."
};

const MODE_CONTENT = {
    bestiary: {
        inputHint: "For the most accurate result, paste the full Hunt Analyzer block including duration and killed creatures.",
        readyHint: "Paste a Hunt Analyzer to create your first session."
    },
    tasks: {
        inputHint: "Process the Hunt Analyzer first, then select the creature your task asks for.",
        readyHint: "Paste a Hunt Analyzer to measure a kill rate for your task."
    }
};

const VIEW_CONTENT = {
    allSessions: {
        resultsTitle: "All Sessions Analysis",
        resultsCopy: "Every creature of every analyzed session, listed once per session. Select the entries you want and enter total kills to refine the combined Bestiary estimate."
    },
    charmPlan: {
        resultsTitle: "Charm Plan",
        resultsCopy: "Enter the hunting time you have available to see which selected Bestiary entries you can finish across your sessions, and how many charm points that earns."
    },
    tasks: {
        resultsCopy: "Select one creature from this session and enter the task target to project the time remaining at the kill rate this session recorded."
    }
};

const TASKS_VIEW_STATUS = {
    allSessions: {
        message: "All Sessions selected",
        hint: "Every processed session with its own creature, task target, and estimated time."
    }
};

const FIXED_VIEW_STATUS = {
    allSessions: {
        message: "All Sessions selected",
        hint: "Every analyzed creature is listed once per session. Total kills entered here belong to the session that produced the entry."
    },
    charmPlan: {
        message: "Charm Plan selected",
        hint: "Enter the time you have available to see which Bestiary entries fit in it and the route to follow."
    }
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
    excludedAllTabsEntries: [],
    hunts: [],
    ignoredPlanHuntIds: [],
    planRespawnMode: "regular",
    playTimeInput: "",
    tasksView: "session"
};

function getModeView() {
    return state.mode === "tasks" ? state.tasksView : state.bestiaryView;
}

function setModeView(view) {
    if (state.mode === "tasks") {
        state.tasksView = view;
        return;
    }

    state.bestiaryView = view;
}

function setStatus(message, isError = false, hint = "") {
    elements.statusMessage.textContent = message;
    elements.statusMessage.dataset.state = isError ? "error" : "default";
    elements.statusHint.textContent = hint;
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
    return getHuntLabel(state.hunts.findIndex((hunt) => hunt.id === huntId));
}

function getComparableHunts() {
    return state.hunts.filter(hasBestiaryAnalysis);
}

function getWorkspaceSnapshot() {
    return {
        mode: state.mode,
        activeHuntId: state.activeHuntId,
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

    saveSessionState(getWorkspaceSnapshot());
}

function readTotalKillsInputs(hunt) {
    const inputs = document.querySelectorAll(".kills-input");

    return Array.from(inputs).reduce((totals, input) => {
        totals[input.dataset.monsterName] = Number.parseInt(input.value, 10) || 0;
        return totals;
    }, Object.fromEntries(
        hunt.matchedMonsters.map((monster) => [monster.name, monster.totalKills || 0])
    ));
}

function captureActiveHuntInputs() {
    const hunt = getActiveHunt();

    if (!hunt || state.mode !== "bestiary" || getModeView() !== "session") {
        return;
    }

    hunt.sessionLog = elements.sessionLog.value;

    const totalKillsByName = readTotalKillsInputs(hunt);
    hunt.matchedMonsters = hunt.matchedMonsters.map((monster) => ({
        ...monster,
        totalKills: totalKillsByName[monster.name] ?? monster.totalKills ?? 0
    }));
}

function captureAllTabsInputs() {
    if (state.mode !== "bestiary" || getModeView() !== "allSessions") {
        return;
    }

    const totalKillsByHuntId = new Map();

    elements.output.querySelectorAll(".kills-input").forEach((input) => {
        const huntTotals = totalKillsByHuntId.get(input.dataset.huntId) || {};
        huntTotals[input.dataset.monsterName] = Number.parseInt(input.value, 10) || 0;
        totalKillsByHuntId.set(input.dataset.huntId, huntTotals);
    });

    state.hunts.forEach((hunt) => {
        const huntTotals = totalKillsByHuntId.get(hunt.id);

        if (!huntTotals) {
            return;
        }

        hunt.matchedMonsters = hunt.matchedMonsters.map((monster) => ({
            ...monster,
            totalKills: huntTotals[monster.name] ?? monster.totalKills ?? 0
        }));
    });
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

function calculateBestiaryResult(hunt) {
    const monsters = recalculateProgress(
        hunt.matchedMonsters,
        state.bestiaryData,
        hunt.sessionDuration,
        Object.fromEntries(hunt.matchedMonsters.map((monster) => [monster.name, monster.totalKills || 0]))
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
        .map((hunt, index) => ({ hunt, label: getHuntLabel(index) }))
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
        .map((hunt, index) => ({ hunt, id: hunt.id, label: getHuntLabel(index) }))
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

    hunt.matchedMonsters = monsters;
    hunt.selectedBestiaryMonsterNames = selectedMonsterNames;

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

function buildFixedTabs(view) {
    if (state.mode === "tasks") {
        const processedCount = state.hunts.filter(hasTaskAnalysis).length;

        return [{
            key: "allSessions",
            label: "All Sessions",
            meta: processedCount
                ? `${formatNumber(processedCount)} processed`
                : "No analysis",
            isActive: view === "allSessions"
        }];
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
        }
    ];
}

function renderHuntTabStrip() {
    const view = getModeView();
    const isBestiary = state.mode === "bestiary";
    const huntTabs = state.hunts.map((hunt, index) => ({
        id: hunt.id,
        label: getHuntLabel(index),
        meta: isBestiary ? getBestiaryTabMeta(hunt) : getTaskTabMeta(hunt),
        note: hunt.hasProcessedLog ? RESPAWN_MODE_SHORT_LABELS[hunt.respawnMode] : "",
        isActive: view === "session" && hunt.id === state.activeHuntId
    }));
    const isComparing = view === "comparison";

    renderHuntTabs(elements.huntTabStrip, buildFixedTabs(view), huntTabs);
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
    elements.respawnModeBlock.hidden = false;
    elements.respawnModeHint.textContent = RESPAWN_MODE_HINTS.bestiary;
    elements.sessionRegularButton.classList.toggle("is-selected", hunt.respawnMode === "regular");
    elements.sessionRapidButton.classList.toggle("is-selected", hunt.respawnMode === "rapid");
    elements.sessionRegularButton.setAttribute("aria-pressed", String(hunt.respawnMode === "regular"));
    elements.sessionRapidButton.setAttribute("aria-pressed", String(hunt.respawnMode === "rapid"));
    elements.sessionLog.value = hunt.sessionLog;
    elements.inputTitle.textContent = "Hunt Analyzer";
    elements.resultsTitle.textContent = `${huntLabel} Analysis`;
    elements.inputCopy.textContent = `Paste the Hunt Analyzer text from Tibia. Processing it builds the Bestiary analysis for ${huntLabel}.`;
    elements.inputHint.textContent = MODE_CONTENT.bestiary.inputHint;
    elements.resultsCopy.textContent = "Select the creatures you want and enter total kills to refine the Bestiary estimate.";

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
        label: getHuntLabel(index),
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
    elements.respawnModeBlock.hidden = false;
    elements.respawnModeHint.textContent = RESPAWN_MODE_HINTS.tasks;
    elements.sessionRegularButton.classList.toggle("is-selected", hunt.respawnMode === "regular");
    elements.sessionRapidButton.classList.toggle("is-selected", hunt.respawnMode === "rapid");
    elements.sessionRegularButton.setAttribute("aria-pressed", String(hunt.respawnMode === "regular"));
    elements.sessionRapidButton.setAttribute("aria-pressed", String(hunt.respawnMode === "rapid"));
    elements.sessionLog.value = hunt.sessionLog;
    elements.inputTitle.textContent = "Hunt Analyzer";
    elements.resultsTitle.textContent = `${huntLabel} Task Estimate`;
    elements.inputCopy.textContent = `Paste the Hunt Analyzer text from Tibia. Processing it measures the kill rates for ${huntLabel}.`;
    elements.inputHint.textContent = MODE_CONTENT.tasks.inputHint;
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

function renderTaskSessionsView() {
    const sessions = state.hunts
        .map((hunt, index) => ({ hunt, id: hunt.id, label: getHuntLabel(index) }))
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
    const isBestiary = state.mode === "bestiary";

    elements.modeBestiaryButton.classList.toggle("is-selected", isBestiary);
    elements.modeTasksButton.classList.toggle("is-selected", !isBestiary);
    elements.modeBestiaryButton.setAttribute("aria-selected", String(isBestiary));
    elements.modeTasksButton.setAttribute("aria-selected", String(!isBestiary));
}

function renderApp() {
    const view = getModeView();

    applyPrimaryMode();
    renderHuntTabStrip();

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
    if (state.mode === mode) {
        return;
    }

    captureVisibleInputs();
    state.mode = mode;
    renderApp();
    persistState();

    if (mode === "tasks") {
        setStatus(
            "Tasks selected",
            false,
            state.hunts.some(hasTaskAnalysis)
                ? "Your sessions carry over. Select the creature your task asks for and enter its target."
                : MODE_CONTENT.tasks.readyHint
        );
        return;
    }

    setStatus(
        "Bestiary selected",
        false,
        getComparableHunts().length
            ? "Switch sessions to review an analysis, or open Charm Plan to plan your available time."
            : MODE_CONTENT.bestiary.readyHint
    );
}

async function pasteLog() {
    try {
        const clipboardText = await navigator.clipboard.readText();
        elements.sessionLog.value = clipboardText;
        getActiveHunt().sessionLog = clipboardText;
        persistState();
        setStatus("Hunt Analyzer pasted", false, "Review the text, then process it.");
        elements.sessionLog.focus();
    } catch (error) {
        setStatus("Clipboard access blocked", true, "Paste manually if your browser blocks clipboard access.");
        window.alert("Failed to paste. Ensure clipboard permissions are enabled.");
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
    setStatus("Input cleared", false, MODE_CONTENT[state.mode].readyHint);
    elements.sessionLog.focus();
}

function selectHunt(huntId, statusHint) {
    captureVisibleInputs();
    state.activeHuntId = huntId;
    setModeView("session");
    renderApp();
    persistState();
    setStatus(
        `${getHuntLabelById(huntId)} selected`,
        false,
        statusHint || "This session keeps its own Hunt Analyzer, creature selection, and total kills."
    );
}

function addHuntTab() {
    captureVisibleInputs();

    const { hunt, hunts } = addHunt(state.hunts);

    state.hunts = hunts;
    state.activeHuntId = hunt.id;
    setModeView("session");
    renderApp();
    persistState();
    setStatus(
        `${getHuntLabelById(hunt.id)} added`,
        false,
        "Paste a Hunt Analyzer here and process it to add this session to the comparison."
    );
}

function closeHuntTab(huntId) {
    if (state.hunts.length < 2) {
        return;
    }

    captureVisibleInputs();

    const closedLabel = getHuntLabelById(huntId);
    const { activeHuntId, hunts } = removeHunt(state.hunts, huntId, state.activeHuntId);

    state.hunts = hunts;
    state.activeHuntId = activeHuntId;
    dropAllTabsEntriesOfHunt(huntId);
    dropIgnoredPlanHunt(huntId);
    normalizeView();
    renderApp();
    persistState();
    setStatus(`${closedLabel} closed`, false, "The remaining sessions keep their own analysis.");
}

function showComparison() {
    captureVisibleInputs();

    if (getComparableHunts().length < 2) {
        setStatus(
            "Not enough analyzed sessions",
            true,
            "Process at least two sessions before comparing them."
        );
        return;
    }

    state.bestiaryView = "comparison";
    renderApp();
    persistState();
    setStatus(
        "Session comparison ready",
        false,
        "Charm Rate ranks your sessions. Select a session to change its Bestiary configuration."
    );
}

function selectFixedView(view) {
    if (getModeView() === view) {
        return;
    }

    const status = state.mode === "tasks" ? TASKS_VIEW_STATUS[view] : FIXED_VIEW_STATUS[view];

    if (!status) {
        return;
    }

    captureVisibleInputs();
    setModeView(view);
    renderApp();
    persistState();
    setStatus(status.message, false, status.hint);
}

function updateRemainingTime() {
    captureActiveHuntInputs();
    renderApp();
    persistState();
    setStatus("Estimate updated", false, "The time remaining now reflects the total kills you entered.");
}

function clearInputs() {
    const hunt = getActiveHunt();

    hunt.matchedMonsters = hunt.matchedMonsters.map((monster) => ({
        ...monster,
        totalKills: 0
    }));

    renderApp();
    persistState();
    setStatus("Totals reset", false, "The estimate now uses session kills only.");
}

function updateAllTabsEstimate() {
    captureAllTabsInputs();
    renderApp();
    persistState();
    setStatus("Estimate updated", false, "The combined estimate now reflects the total kills you entered.");
}

function resetAllTabsTotals() {
    state.hunts.forEach((hunt) => {
        hunt.matchedMonsters = hunt.matchedMonsters.map((monster) => ({
            ...monster,
            totalKills: 0
        }));
    });

    renderApp();
    persistState();
    setStatus("Totals reset", false, "Every session now estimates from its own kills only.");
}

function toggleAllTabsEntry(entryKey) {
    captureAllTabsInputs();

    const isExcluded = state.excludedAllTabsEntries.includes(entryKey);

    state.excludedAllTabsEntries = isExcluded
        ? state.excludedAllTabsEntries.filter((key) => key !== entryKey)
        : [...state.excludedAllTabsEntries, entryKey];

    renderApp();
    persistState();
    setStatus(
        "All Sessions selection updated",
        false,
        "Only the selected entries are part of the combined Bestiary estimate."
    );
}

function toggleHuntPlanAvailability(huntId) {
    captureVisibleInputs();

    const isIgnored = state.ignoredPlanHuntIds.includes(huntId);

    state.ignoredPlanHuntIds = isIgnored
        ? state.ignoredPlanHuntIds.filter((ignoredId) => ignoredId !== huntId)
        : [...state.ignoredPlanHuntIds, huntId];

    renderApp();
    persistState();
    setStatus(
        `${getHuntLabelById(huntId)} ${isIgnored ? "available" : "ignored"} for Charm Plan`,
        false,
        isIgnored
            ? "The plan can use this session again."
            : "The plan skips this session. Its own analysis, All Sessions, and Compare Sessions are unchanged."
    );
}

function setPlanRespawnMode(respawnMode) {
    if (state.planRespawnMode === respawnMode) {
        return;
    }

    captureVisibleInputs();
    state.planRespawnMode = respawnMode;
    renderApp();
    persistState();
    setStatus(
        `Planning for ${RESPAWN_MODE_LABELS[respawnMode]}`,
        false,
        "Charm Plan uses only sessions recorded in this respawn mode. Every session keeps its own analysis."
    );
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
    setStatus(
        `${getHuntLabelById(hunt.id)} recorded as ${RESPAWN_MODE_LABELS[respawnMode]}`,
        false,
        "This only records the spawn conditions. The kill rates and estimates are unchanged."
    );
}

function dropIgnoredPlanHunt(huntId) {
    state.ignoredPlanHuntIds = state.ignoredPlanHuntIds.filter((ignoredId) => ignoredId !== huntId);
}

function dropAllTabsEntriesOfHunt(huntId) {
    state.excludedAllTabsEntries = state.excludedAllTabsEntries
        .filter((entryKey) => !isEntryKeyForHunt(entryKey, huntId));
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
        button.addEventListener("click", () => selectHunt(
            button.dataset.planHunt,
            "Adjust the total kills or creature selection here, then open Charm Plan again to see the updated plan."
        ));
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

function attachAllTabsActions() {
    const updateButton = document.getElementById("allTabsUpdateButton");
    const resetButton = document.getElementById("allTabsResetButton");

    if (updateButton) {
        updateButton.addEventListener("click", updateAllTabsEstimate);
    }

    if (resetButton) {
        resetButton.addEventListener("click", resetAllTabsTotals);
    }

    elements.output.querySelectorAll("[data-all-tabs-entry]").forEach((button) => {
        button.addEventListener("click", () => toggleAllTabsEntry(button.dataset.allTabsEntry));
    });
}

function attachResultActions() {
    const updateButton = document.getElementById("updateRemainingTimeButton");
    const clearInputsButton = document.getElementById("clearInputsButton");

    if (updateButton) {
        updateButton.addEventListener("click", updateRemainingTime);
    }

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
            setStatus("Creature selection updated", false, "Only the selected creatures remain in the Bestiary estimate below.");
        });
    });
}

function attachTaskSessionLinks() {
    elements.output.querySelectorAll("[data-task-session]").forEach((button) => {
        button.addEventListener("click", () => selectHunt(
            button.dataset.taskSession,
            "Change the creature or the task target for this session here."
        ));
    });
}

function attachTaskActions() {
    const taskTotalInput = document.getElementById("taskTotalKills");

    elements.output.querySelectorAll("[data-task-monster]").forEach((button) => {
        button.addEventListener("click", () => {
            getActiveHunt().selectedTaskMonsterName = button.dataset.taskMonster;
            renderApp();
            persistState();
            setStatus("Creature selected", false, "Enter the task target to calculate the time remaining.");
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
    hunt.matchedMonsters = bestiary.monsters;
    hunt.selectedBestiaryMonsterNames = bestiary.monsters.map((monster) => monster.name);
    hunt.taskMonsters = tasks.monsters;
    hunt.selectedTaskMonsterName = taskNames.has(hunt.selectedTaskMonsterName)
        ? hunt.selectedTaskMonsterName
        : (tasks.monsters[0]?.name ?? "");

    renderApp();
    persistState();

    if (state.mode === "tasks") {
        setStatus(
            tasks.monsters.length ? "Task analysis updated" : "No creatures found",
            false,
            tasks.monsters.length
                ? "Select the creature your task asks for, then enter its target."
                : "Check that the pasted Hunt Analyzer includes the killed-creatures block."
        );
        return;
    }

    setStatus(
        bestiary.monsters.length ? "Analysis updated" : "No matching creatures found",
        false,
        bestiary.monsters.length
            ? "Select the creatures you want to keep, then enter total kills to refine the estimate."
            : "Check creature names in the Hunt Analyzer text, or confirm it includes a killed-creatures section."
    );
}

function processLog() {
    captureVisibleInputs();

    const logText = getActiveHunt().sessionLog.trim();

    if (!logText) {
        setStatus("Hunt Analyzer required", true, "Paste the Hunt Analyzer text before processing.");
        elements.sessionLog.focus();
        window.alert("Paste the Hunt Analyzer text first.");
        return;
    }

    setBusyState(true);
    processHuntLog(getActiveHunt(), logText);
    setBusyState(false);
}

function applyWorkspace(workspace) {
    state.mode = workspace.mode;
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
    applyWorkspace(restoreWorkspace(loadSessionState()) || createWorkspace());

    return hasWorkspaceContent();
}

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

    setStatus(
        "Workspace exported",
        false,
        `${fileName} holds every Hunt Analyzer, creature selection, total kills, and play time you entered.`
    );
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
        setStatus(
            "Workspace imported",
            false,
            `${state.hunts.length} session${state.hunts.length === 1 ? "" : "s"} restored with their creature selections, total kills, and play time.`
        );
    } catch (error) {
        setStatus("Import failed", true, error.message);
        window.alert(error.message);
    }
}

async function initializeApp() {
    try {
        setBusyState(true);
        state.bestiaryData = await loadBestiaryData();

        const hasRestoredContent = restoreWorkspaceState();
        renderApp();

        if (hasRestoredContent) {
            setStatus(
                "Previous session restored",
                false,
                "Switch sessions to review each analysis, or open Charm Plan to plan your available time."
            );
            return;
        }

        setStatus("Ready", false, MODE_CONTENT[state.mode].readyHint);
    } catch (error) {
        setStatus("Failed to load data", true, "Refresh the page and try again. The dataset could not be loaded.");
        window.alert("Failed to load Bestiary data.");
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
elements.modeTasksButton.addEventListener("click", () => setMode("tasks"));
elements.sessionRegularButton.addEventListener("click", () => setSessionRespawnMode("regular"));
elements.sessionRapidButton.addEventListener("click", () => setSessionRespawnMode("rapid"));
elements.processLogButton.addEventListener("click", processLog);
elements.exportWorkspaceButton.addEventListener("click", exportWorkspace);
elements.importWorkspaceButton.addEventListener("click", requestWorkspaceImport);
elements.importWorkspaceInput.addEventListener("change", (event) => {
    const [file] = event.target.files;

    if (file) {
        importWorkspaceFile(file);
    }
});

initializeApp();
