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
    huntHasContent,
    removeHunt,
    resetHunt,
    restoreWorkspace
} from "./state/hunt-workspace.js";
import { loadSessionState, saveSessionState } from "./state/session-store.js";
import { renderAllTabs } from "./ui/render-all-tabs.js";
import { buildCharmPlanResultMarkup, renderCharmPlan } from "./ui/render-charm-plan.js";
import { renderComparison } from "./ui/render-comparison.js";
import { renderHuntTabs } from "./ui/render-hunt-tabs.js";
import { renderResults } from "./ui/render-results.js";
import { renderTaskResults } from "./ui/render-task-results.js";
import { formatCharmsPerHour, formatNumber } from "./utils/formatters.js";

const elements = {
    analysisSection: document.getElementById("analysisSection"),
    clearLogButton: document.getElementById("clearLogButton"),
    compareHuntsButton: document.getElementById("compareHuntsButton"),
    comparisonOutput: document.getElementById("comparisonOutput"),
    comparisonSection: document.getElementById("comparisonSection"),
    huntTabStrip: document.getElementById("huntTabStrip"),
    huntWorkspace: document.getElementById("huntWorkspace"),
    inputCopy: document.getElementById("inputCopy"),
    inputHint: document.getElementById("inputHint"),
    inputSection: document.getElementById("inputSection"),
    inputTitle: document.getElementById("inputTitle"),
    modeBestiaryButton: document.getElementById("modeBestiaryButton"),
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

const MODE_CONTENT = {
    bestiary: {
        inputCopy: "Paste the exported hunting session text from Tibia. The analyzer reads the session time and killed creatures from the log.",
        inputHint: "For the most accurate result, paste the full session block including duration and killed creatures.",
        readyHint: "Load a log to start a Bestiary estimate."
    },
    tasks: {
        inputCopy: "Tasks uses the same hunting session log, on its own. Process the log, then select one creature and enter the task target.",
        inputHint: "Process the log first, then select the creature and enter the task target.",
        readyHint: "Load a log to start a task estimate."
    }
};

const VIEW_CONTENT = {
    allTabs: {
        resultsTitle: "All Tabs Analysis",
        resultsCopy: "Every creature of every analyzed hunt, listed once per hunt. Select the entries you want and enter total kills to refine the combined Bestiary estimate."
    },
    charmPlan: {
        resultsTitle: "Charm Plan",
        resultsCopy: "Enter the hunting time you have available to see which selected Bestiary entries you can finish across the analyzed hunts, and how many charm points that earns."
    },
    tasks: {
        inputTitle: "Task Session Log",
        resultsTitle: "Task Estimate",
        resultsCopy: "Process the session log, then select the creature and enter the task target to project the time remaining."
    }
};

const FIXED_VIEW_STATUS = {
    allTabs: {
        message: "All Tabs selected",
        hint: "Every analyzed creature is listed once per hunt. Total kills entered here belong to the hunt that produced the entry."
    },
    charmPlan: {
        message: "Charm Plan selected",
        hint: "Enter the time you have available to see which Bestiary entries fit in it and the hunt route to follow."
    }
};

const state = {
    mode: "bestiary",
    activeHuntId: "",
    bestiaryData: [],
    excludedAllTabsEntries: [],
    hunts: [],
    playTimeInput: "",
    taskSession: null,
    view: "hunt"
};

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

function persistState() {
    if (!state.hunts.length) {
        return;
    }

    saveSessionState({
        mode: state.mode,
        activeHuntId: state.activeHuntId,
        excludedAllTabsEntries: state.excludedAllTabsEntries,
        hunts: state.hunts,
        playTimeInput: state.playTimeInput,
        taskSession: state.taskSession,
        view: state.view
    });
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

    if (!hunt || state.mode !== "bestiary" || state.view !== "hunt") {
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
    if (state.mode !== "bestiary" || state.view !== "allTabs") {
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
    if (state.mode !== "tasks") {
        return;
    }

    state.taskSession.sessionLog = elements.sessionLog.value;

    const taskTotalInput = document.getElementById("taskTotalKills");
    if (taskTotalInput) {
        state.taskSession.totalKills = taskTotalInput.value;
    }
}

function captureVisibleInputs() {
    if (state.mode === "tasks") {
        captureTaskInputs();
        return;
    }

    if (state.view === "allTabs") {
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

function getCharmPlanView() {
    const { analysis } = calculateAllTabsResult();
    const huntGroups = analysis.participatingHunts.map((participatingHunt) => ({
        id: participatingHunt.id,
        label: participatingHunt.label,
        monsters: participatingHunt.selectedMonsters
    }));
    const availableMinutes = parsePlayTimeMinutes(state.playTimeInput);

    return {
        playTimeValue: state.playTimeInput,
        hasAnalyzedHunts: huntGroups.length > 0,
        plan: availableMinutes === null || !huntGroups.length
            ? null
            : planCharmTime(huntGroups, availableMinutes)
    };
}

function getCharmPlanTabMeta(planView) {
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
    if (state.view === "comparison" && getComparableHunts().length < 2) {
        state.view = "hunt";
    }
}

function setEmptyOutput() {
    elements.output.className = "empty-state";
    elements.output.innerHTML = state.mode === "tasks"
        ? `
            <strong>No task estimate yet.</strong>
            <span>Process a session log to select a creature and project the time remaining.</span>
        `
        : `
            <strong>No analysis yet.</strong>
            <span>Process a session log to view matched creatures, time remaining, and charm rate.</span>
        `;
}

function renderBestiaryMode(hunt) {
    const { monsters, selectedMonsterNames, summary } = calculateBestiaryResult(hunt);

    hunt.matchedMonsters = monsters;
    hunt.selectedBestiaryMonsterNames = selectedMonsterNames;

    renderResults(elements.output, monsters, selectedMonsterNames, summary);
    attachResultActions();
}

function renderHuntTabStrip() {
    const { analysis, summary } = calculateAllTabsResult();
    const planView = getCharmPlanView();
    const fixedTabs = [
        {
            key: "allTabs",
            label: "All Tabs",
            meta: analysis.rows.length ? formatCharmsPerHour(summary.charmRate) : "No analysis",
            isActive: state.view === "allTabs"
        },
        {
            key: "charmPlan",
            label: "Charm Plan",
            meta: getCharmPlanTabMeta(planView),
            isActive: state.view === "charmPlan"
        }
    ];
    const huntTabs = state.hunts.map((hunt, index) => ({
        id: hunt.id,
        label: getHuntLabel(index),
        meta: hasBestiaryAnalysis(hunt)
            ? formatCharmsPerHour(calculateBestiaryResult(hunt).summary.totalCharmsPerHour)
            : "No analysis",
        isActive: state.view === "hunt" && hunt.id === state.activeHuntId
    }));
    const isComparing = state.view === "comparison";

    renderHuntTabs(elements.huntTabStrip, fixedTabs, huntTabs);
    attachHuntTabActions();

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
    elements.sessionLog.value = hunt.sessionLog;
    elements.inputTitle.textContent = `${huntLabel} Session Log`;
    elements.resultsTitle.textContent = `${huntLabel} Analysis`;
    elements.inputCopy.textContent = MODE_CONTENT.bestiary.inputCopy;
    elements.inputHint.textContent = MODE_CONTENT.bestiary.inputHint;
    elements.resultsCopy.textContent = "Process the session log, then select creatures and enter total kills to refine the Bestiary estimate.";

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
    elements.resultsTitle.textContent = VIEW_CONTENT.allTabs.resultsTitle;
    elements.resultsCopy.textContent = VIEW_CONTENT.allTabs.resultsCopy;

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

function renderTasksView() {
    const taskSession = state.taskSession;
    const estimate = calculateTaskEstimate(
        taskSession.monsters,
        taskSession.selectedMonsterName,
        taskSession.sessionDuration,
        taskSession.totalKills
    );

    elements.comparisonSection.hidden = true;
    elements.inputSection.hidden = false;
    elements.analysisSection.hidden = false;
    elements.sessionLog.value = taskSession.sessionLog;
    elements.inputTitle.textContent = VIEW_CONTENT.tasks.inputTitle;
    elements.resultsTitle.textContent = VIEW_CONTENT.tasks.resultsTitle;
    elements.inputCopy.textContent = MODE_CONTENT.tasks.inputCopy;
    elements.inputHint.textContent = MODE_CONTENT.tasks.inputHint;
    elements.resultsCopy.textContent = VIEW_CONTENT.tasks.resultsCopy;

    if (!taskSession.monsters.length && !taskSession.hasProcessedLog) {
        setEmptyOutput();
        return;
    }

    renderTaskResults(elements.output, taskSession.monsters, estimate, taskSession.sessionDuration);
    attachTaskActions();
}

function applyPrimaryMode() {
    const isBestiary = state.mode === "bestiary";

    elements.modeBestiaryButton.classList.toggle("is-selected", isBestiary);
    elements.modeTasksButton.classList.toggle("is-selected", !isBestiary);
    elements.modeBestiaryButton.setAttribute("aria-selected", String(isBestiary));
    elements.modeTasksButton.setAttribute("aria-selected", String(!isBestiary));
    elements.huntWorkspace.hidden = !isBestiary;
}

function renderApp() {
    applyPrimaryMode();

    if (state.mode === "tasks") {
        renderTasksView();
        return;
    }

    renderHuntTabStrip();

    if (state.view === "comparison") {
        renderComparisonView();
        return;
    }

    if (state.view === "allTabs") {
        renderAllTabsView();
        return;
    }

    if (state.view === "charmPlan") {
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
            "Tasks",
            false,
            state.taskSession.monsters.length
                ? "Select the creature and enter the task target."
                : MODE_CONTENT.tasks.readyHint
        );
        return;
    }

    setStatus(
        "Bestiary",
        false,
        getComparableHunts().length
            ? "Switch hunt tabs to review an analysis, or open Charm Plan to plan your available time."
            : MODE_CONTENT.bestiary.readyHint
    );
}

async function pasteLog() {
    try {
        const clipboardText = await navigator.clipboard.readText();
        elements.sessionLog.value = clipboardText;

        if (state.mode === "tasks") {
            state.taskSession.sessionLog = clipboardText;
        } else {
            getActiveHunt().sessionLog = clipboardText;
        }

        persistState();
        setStatus("Log pasted", false, "Review the text, then process the session.");
        elements.sessionLog.focus();
    } catch (error) {
        setStatus("Clipboard access blocked", true, "Paste manually if your browser blocks clipboard access.");
        window.alert("Failed to paste. Ensure clipboard permissions are enabled.");
    }
}

function clearLog() {
    if (state.mode === "tasks") {
        state.taskSession.sessionLog = "";
        state.taskSession.sessionDuration = 0;
        state.taskSession.monsters = [];
        state.taskSession.selectedMonsterName = "";
        state.taskSession.totalKills = "";
        state.taskSession.hasProcessedLog = false;
        renderApp();
        persistState();
        setStatus("Input cleared", false, MODE_CONTENT.tasks.readyHint);
        elements.sessionLog.focus();
        return;
    }

    const hunt = getActiveHunt();
    const clearedHunt = resetHunt(hunt);

    state.hunts = state.hunts.map((current) => (current.id === hunt.id ? clearedHunt : current));
    state.activeHuntId = clearedHunt.id;
    dropAllTabsEntriesOfHunt(hunt.id);
    normalizeView();
    renderApp();
    persistState();
    setStatus("Input cleared", false, MODE_CONTENT.bestiary.readyHint);
    elements.sessionLog.focus();
}

function selectHunt(huntId, statusHint) {
    captureVisibleInputs();
    state.activeHuntId = huntId;
    state.view = "hunt";
    renderApp();
    persistState();
    setStatus(
        `${getHuntLabelById(huntId)} selected`,
        false,
        statusHint || "This hunt keeps its own session log, creature selection, and total kills."
    );
}

function addHuntTab() {
    captureVisibleInputs();

    const { hunt, hunts } = addHunt(state.hunts);

    state.hunts = hunts;
    state.activeHuntId = hunt.id;
    state.view = "hunt";
    renderApp();
    persistState();
    setStatus(
        `${getHuntLabelById(hunt.id)} added`,
        false,
        "Paste the hunting session log for this hunt, then process it to add it to the comparison."
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
    normalizeView();
    renderApp();
    persistState();
    setStatus(`${closedLabel} closed`, false, "The remaining hunts keep their own analysis.");
}

function showComparison() {
    captureVisibleInputs();

    if (getComparableHunts().length < 2) {
        setStatus(
            "Not enough analyzed hunts",
            true,
            "Process at least two hunts before comparing them."
        );
        return;
    }

    state.view = "comparison";
    renderApp();
    persistState();
    setStatus(
        "Hunt comparison ready",
        false,
        "Charm Rate ranks the hunts. Select a hunt tab to change its Bestiary configuration."
    );
}

function selectFixedView(view) {
    if (state.view === view || !FIXED_VIEW_STATUS[view]) {
        return;
    }

    captureVisibleInputs();
    state.view = view;
    renderApp();
    persistState();
    setStatus(FIXED_VIEW_STATUS[view].message, false, FIXED_VIEW_STATUS[view].hint);
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
    setStatus("Totals reset", false, "Every hunt now estimates from session kills only.");
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
        "All Tabs selection updated",
        false,
        "Only the selected entries are part of the combined Bestiary estimate."
    );
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

function attachTaskActions() {
    const taskTotalInput = document.getElementById("taskTotalKills");

    elements.output.querySelectorAll("[data-task-monster]").forEach((button) => {
        button.addEventListener("click", () => {
            state.taskSession.selectedMonsterName = button.dataset.taskMonster;
            renderApp();
            persistState();
            setStatus("Creature selected", false, "Enter the task target to calculate the time remaining.");
        });
    });

    if (!taskTotalInput) {
        return;
    }

    taskTotalInput.addEventListener("input", (event) => {
        state.taskSession.totalKills = event.target.value;
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

function processTaskLog(logText) {
    const { monsters, sessionDuration } = analyzeTaskSession(logText);

    state.taskSession.monsters = monsters;
    state.taskSession.sessionDuration = sessionDuration;
    state.taskSession.selectedMonsterName = monsters[0]?.name ?? "";
    state.taskSession.hasProcessedLog = true;
    renderApp();
    persistState();
    setStatus(
        monsters.length ? "Task analysis updated" : "No task candidates found",
        false,
        monsters.length
            ? "Select the creature from this session, then enter the task target."
            : "Check that the pasted session includes the killed-creatures block."
    );
}

function processHuntLog(hunt, logText) {
    const { monsters, sessionDuration } = analyzeSession(logText, state.bestiaryData);

    dropAllTabsEntriesOfHunt(hunt.id);
    hunt.matchedMonsters = monsters;
    hunt.selectedBestiaryMonsterNames = monsters.map((monster) => monster.name);
    hunt.sessionDuration = sessionDuration;
    hunt.hasProcessedLog = true;
    renderApp();
    persistState();
    setStatus(
        monsters.length ? "Analysis updated" : "No matching creatures found",
        false,
        monsters.length
            ? "Select the creatures you want to keep, then enter total kills to refine the estimate."
            : "Check creature names in the log or confirm the session includes a killed-creatures section."
    );
}

function processLog() {
    captureVisibleInputs();

    const logText = state.mode === "tasks"
        ? state.taskSession.sessionLog.trim()
        : getActiveHunt().sessionLog.trim();

    if (!logText) {
        setStatus("Session log required", true, "Paste a hunting session log before running the analyzer.");
        elements.sessionLog.focus();
        window.alert("Paste the session log first.");
        return;
    }

    setBusyState(true);

    if (state.mode === "tasks") {
        processTaskLog(logText);
    } else {
        processHuntLog(getActiveHunt(), logText);
    }

    setBusyState(false);
}

function restoreWorkspaceState() {
    const workspace = restoreWorkspace(loadSessionState()) || createWorkspace();

    state.mode = workspace.mode;
    state.hunts = workspace.hunts;
    state.activeHuntId = workspace.activeHuntId;
    state.view = workspace.view;
    state.excludedAllTabsEntries = workspace.excludedAllTabsEntries;
    state.playTimeInput = workspace.playTimeInput;
    state.taskSession = workspace.taskSession;
    normalizeView();

    return state.hunts.some(huntHasContent) || Boolean(state.taskSession.sessionLog.trim());
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
                "Switch hunt tabs to review each analysis, or open Charm Plan to plan your available time."
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
    if (state.mode === "tasks") {
        if (state.taskSession) {
            state.taskSession.sessionLog = elements.sessionLog.value;
        }

        return;
    }

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
elements.processLogButton.addEventListener("click", processLog);

initializeApp();
