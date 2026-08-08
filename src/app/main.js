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
import { renderComparison } from "./ui/render-comparison.js";
import { renderHuntTabs } from "./ui/render-hunt-tabs.js";
import { renderResults } from "./ui/render-results.js";
import { renderTaskResults } from "./ui/render-task-results.js";

const elements = {
    analysisSection: document.getElementById("analysisSection"),
    clearLogButton: document.getElementById("clearLogButton"),
    compareHuntsButton: document.getElementById("compareHuntsButton"),
    comparisonOutput: document.getElementById("comparisonOutput"),
    comparisonSection: document.getElementById("comparisonSection"),
    huntTabStrip: document.getElementById("huntTabStrip"),
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
        resultsCopy: "Process the session log, then select creatures and enter total kills to refine the Bestiary estimate.",
        readyHint: "Load a log to start a Bestiary estimate."
    },
    tasks: {
        inputCopy: "Tasks mode uses the same hunting session log. After processing the log, select one creature and enter the task target.",
        inputHint: "Process the log first, then select the creature and enter the task target.",
        resultsCopy: "Process the session log, then select the creature and enter the task target to project the time remaining.",
        readyHint: "Load a log to start a task estimate."
    }
};

const ALL_TABS_CONTENT = {
    resultsCopy: "Every creature of every analyzed hunt, listed once per hunt. Select the entries you want and enter total kills to refine the combined Bestiary estimate.",
    resultsTitle: "All Tabs Analysis"
};

const state = {
    activeHuntId: "",
    bestiaryData: [],
    excludedAllTabsEntries: [],
    hunts: [],
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

function getEmptyStateMarkup(hunt) {
    if (hunt.mode === "tasks") {
        return `
            <strong>No task estimate yet.</strong>
            <span>Process a session log to select a creature and project the time remaining.</span>
        `;
    }

    return `
        <strong>No analysis yet.</strong>
        <span>Process a session log to view matched creatures, time remaining, and charm rate.</span>
    `;
}

function setEmptyOutput(hunt) {
    elements.output.className = "empty-state";
    elements.output.innerHTML = getEmptyStateMarkup(hunt);
}

function applyModeContent(hunt) {
    const modeContent = MODE_CONTENT[hunt.mode];
    const isBestiary = hunt.mode === "bestiary";
    const huntLabel = getHuntLabelById(hunt.id);

    elements.inputTitle.textContent = `${huntLabel} Session Log`;
    elements.resultsTitle.textContent = `${huntLabel} Analysis`;
    elements.inputCopy.textContent = modeContent.inputCopy;
    elements.inputHint.textContent = modeContent.inputHint;
    elements.resultsCopy.textContent = modeContent.resultsCopy;
    elements.modeBestiaryButton.classList.toggle("is-selected", isBestiary);
    elements.modeTasksButton.classList.toggle("is-selected", !isBestiary);
    elements.modeBestiaryButton.setAttribute("aria-selected", String(isBestiary));
    elements.modeTasksButton.setAttribute("aria-selected", String(!isBestiary));
}

function persistState() {
    if (!state.hunts.length) {
        return;
    }

    saveSessionState({
        activeHuntId: state.activeHuntId,
        excludedAllTabsEntries: state.excludedAllTabsEntries,
        hunts: state.hunts,
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

    if (!hunt || state.view !== "hunt") {
        return;
    }

    hunt.sessionLog = elements.sessionLog.value;

    const totalKillsByName = readTotalKillsInputs(hunt);
    hunt.matchedMonsters = hunt.matchedMonsters.map((monster) => ({
        ...monster,
        totalKills: totalKillsByName[monster.name] ?? monster.totalKills ?? 0
    }));

    const taskTotalInput = document.getElementById("taskTotalKills");
    if (taskTotalInput) {
        hunt.taskTotalKills = taskTotalInput.value;
    }
}

function captureAllTabsInputs() {
    if (state.view !== "allTabs") {
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

function captureVisibleInputs() {
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

function normalizeView() {
    if (state.view === "comparison" && getComparableHunts().length < 2) {
        state.view = "hunt";
    }
}

function renderBestiaryMode(hunt) {
    const { monsters, selectedMonsterNames, summary } = calculateBestiaryResult(hunt);

    hunt.matchedMonsters = monsters;
    hunt.selectedBestiaryMonsterNames = selectedMonsterNames;

    renderResults(elements.output, monsters, selectedMonsterNames, summary);
    attachResultActions();
}

function renderTaskMode(hunt) {
    const estimate = calculateTaskEstimate(
        hunt.taskMonsters,
        hunt.selectedTaskMonsterName,
        hunt.sessionDuration,
        hunt.taskTotalKills
    );

    renderTaskResults(elements.output, hunt.taskMonsters, estimate, hunt.sessionDuration);
    attachResultActions();
}

function getAnalyzedHuntEntries() {
    return state.hunts
        .map((hunt, index) => ({ hunt, label: getHuntLabel(index) }))
        .filter((huntEntry) => hasBestiaryAnalysis(huntEntry.hunt))
        .map((huntEntry) => ({
            id: huntEntry.hunt.id,
            label: huntEntry.label,
            monsters: calculateBestiaryResult(huntEntry.hunt).selectedMonsters
        }))
        .filter((huntEntry) => huntEntry.monsters.length > 0);
}

function calculateAllTabsResult() {
    const analysis = buildAllTabsAnalysis(getAnalyzedHuntEntries(), state.excludedAllTabsEntries);
    const huntSummaries = analysis.participatingHunts
        .map((participatingHunt) => summarizeBestiaryMonsters(participatingHunt.selectedMonsters));

    return {
        analysis,
        summary: aggregateAllTabsSummary(huntSummaries)
    };
}

function renderHuntTabStrip() {
    const { analysis, summary } = calculateAllTabsResult();
    const allTabsTab = {
        label: "All Tabs",
        charmRate: analysis.rows.length ? summary.charmRate : null,
        isActive: state.view === "allTabs"
    };
    const tabs = state.hunts.map((hunt, index) => ({
        id: hunt.id,
        label: getHuntLabel(index),
        charmRate: hasBestiaryAnalysis(hunt) ? calculateBestiaryResult(hunt).summary.totalCharmsPerHour : null,
        isActive: state.view === "hunt" && hunt.id === state.activeHuntId
    }));
    const isComparing = state.view === "comparison";

    renderHuntTabs(elements.huntTabStrip, allTabsTab, tabs);
    attachHuntTabActions();

    elements.compareHuntsButton.disabled = getComparableHunts().length < 2;
    elements.compareHuntsButton.classList.toggle("is-selected", isComparing);
    elements.compareHuntsButton.setAttribute("aria-pressed", String(isComparing));
}

function renderHuntView() {
    const hunt = getActiveHunt();

    elements.comparisonSection.hidden = true;
    elements.inputSection.hidden = false;
    elements.analysisSection.hidden = false;
    elements.sessionLog.value = hunt.sessionLog;
    applyModeContent(hunt);

    if (hunt.mode === "tasks") {
        if (hunt.taskMonsters.length || hunt.processedMode === "tasks") {
            renderTaskMode(hunt);
            return;
        }

        setEmptyOutput(hunt);
        return;
    }

    if (hunt.matchedMonsters.length || hunt.processedMode === "bestiary") {
        renderBestiaryMode(hunt);
        return;
    }

    setEmptyOutput(hunt);
}

function renderAllTabsView() {
    const { analysis, summary } = calculateAllTabsResult();

    elements.comparisonSection.hidden = true;
    elements.inputSection.hidden = true;
    elements.analysisSection.hidden = false;
    elements.resultsTitle.textContent = ALL_TABS_CONTENT.resultsTitle;
    elements.resultsCopy.textContent = ALL_TABS_CONTENT.resultsCopy;

    renderAllTabs(elements.output, analysis, summary);
    attachAllTabsActions();
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

function renderWorkspace() {
    renderHuntTabStrip();

    if (state.view === "comparison") {
        renderComparisonView();
        return;
    }

    if (state.view === "allTabs") {
        renderAllTabsView();
        return;
    }

    renderHuntView();
}

async function pasteLog() {
    try {
        const clipboardText = await navigator.clipboard.readText();
        elements.sessionLog.value = clipboardText;
        getActiveHunt().sessionLog = clipboardText;
        persistState();
        setStatus("Log pasted", false, "Review the text, then process the session.");
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
    normalizeView();
    renderWorkspace();
    persistState();
    setStatus("Input cleared", false, MODE_CONTENT[clearedHunt.mode].readyHint);
    elements.sessionLog.focus();
}

function selectHunt(huntId) {
    if (huntId === state.activeHuntId && state.view === "hunt") {
        return;
    }

    captureVisibleInputs();
    state.activeHuntId = huntId;
    state.view = "hunt";
    renderWorkspace();
    persistState();
    setStatus(
        `${getHuntLabelById(huntId)} selected`,
        false,
        "This hunt keeps its own session log, creature selection, and total kills."
    );
}

function addHuntTab() {
    captureVisibleInputs();

    const { hunt, hunts } = addHunt(state.hunts);

    state.hunts = hunts;
    state.activeHuntId = hunt.id;
    state.view = "hunt";
    renderWorkspace();
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
    renderWorkspace();
    persistState();
    setStatus(`${closedLabel} closed`, false, "The remaining hunts keep their own analysis.");
}

function showComparison() {
    captureVisibleInputs();

    if (getComparableHunts().length < 2) {
        setStatus(
            "Not enough analyzed hunts",
            true,
            "Process at least two hunts in Bestiary mode before comparing them."
        );
        return;
    }

    state.view = "comparison";
    renderWorkspace();
    persistState();
    setStatus(
        "Hunt comparison ready",
        false,
        "Charm Rate ranks the hunts. Select a hunt tab to change its Bestiary configuration."
    );
}

function selectAllTabs() {
    if (state.view === "allTabs") {
        return;
    }

    captureVisibleInputs();
    state.view = "allTabs";
    renderWorkspace();
    persistState();
    setStatus(
        "All Tabs selected",
        false,
        "Every analyzed creature is listed once per hunt. Total kills entered here belong to the hunt that produced the entry."
    );
}

function updateAllTabsEstimate() {
    captureAllTabsInputs();
    renderWorkspace();
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

    renderWorkspace();
    persistState();
    setStatus("Totals reset", false, "Every hunt now estimates from session kills only.");
}

function toggleAllTabsEntry(entryKey) {
    captureAllTabsInputs();

    const isExcluded = state.excludedAllTabsEntries.includes(entryKey);

    state.excludedAllTabsEntries = isExcluded
        ? state.excludedAllTabsEntries.filter((key) => key !== entryKey)
        : [...state.excludedAllTabsEntries, entryKey];

    renderWorkspace();
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

function setMode(mode) {
    captureActiveHuntInputs();

    const hunt = getActiveHunt();
    hunt.mode = mode;
    state.view = "hunt";
    renderWorkspace();
    persistState();

    const hasModeResults = mode === "bestiary" ? hunt.matchedMonsters.length : hunt.taskMonsters.length;

    if (!hasModeResults) {
        setStatus("Ready", false, MODE_CONTENT[mode].readyHint);
        return;
    }

    setStatus(
        mode === "bestiary" ? "Bestiary mode" : "Tasks mode",
        false,
        mode === "bestiary"
            ? "Select the creatures you want to keep, then update total kills if needed."
            : "Select the creature and enter the task target."
    );
}

function attachHuntTabActions() {
    const addHuntButton = document.getElementById("addHuntButton");
    const allTabsButton = elements.huntTabStrip.querySelector("[data-all-tabs-select]");

    if (addHuntButton) {
        addHuntButton.addEventListener("click", addHuntTab);
    }

    if (allTabsButton) {
        allTabsButton.addEventListener("click", selectAllTabs);
    }

    elements.huntTabStrip.querySelectorAll("[data-hunt-select]").forEach((button) => {
        button.addEventListener("click", () => selectHunt(button.dataset.huntSelect));
    });

    elements.huntTabStrip.querySelectorAll("[data-hunt-close]").forEach((button) => {
        button.addEventListener("click", () => closeHuntTab(button.dataset.huntClose));
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
    const bestiaryMonsterButtons = document.querySelectorAll("[data-bestiary-monster]");
    const clearInputsButton = document.getElementById("clearInputsButton");
    const taskMonsterButtons = document.querySelectorAll("[data-task-monster]");
    const taskTotalInput = document.getElementById("taskTotalKills");

    if (updateButton) {
        updateButton.addEventListener("click", updateRemainingTime);
    }

    if (clearInputsButton) {
        clearInputsButton.addEventListener("click", clearInputs);
    }

    bestiaryMonsterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            captureActiveHuntInputs();

            const hunt = getActiveHunt();
            const monsterName = button.dataset.bestiaryMonster;
            const isSelected = hunt.selectedBestiaryMonsterNames.includes(monsterName);

            hunt.selectedBestiaryMonsterNames = isSelected
                ? hunt.selectedBestiaryMonsterNames.filter((name) => name !== monsterName)
                : [...hunt.selectedBestiaryMonsterNames, monsterName];

            renderWorkspace();
            persistState();
            setStatus("Creature selection updated", false, "Only the selected creatures remain in the Bestiary estimate below.");
        });
    });

    taskMonsterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            getActiveHunt().selectedTaskMonsterName = button.dataset.taskMonster;
            persistState();
            renderWorkspace();
            setStatus("Creature selected", false, "Enter the task target to calculate the time remaining.");
        });
    });

    if (taskTotalInput) {
        taskTotalInput.addEventListener("input", (event) => {
            getActiveHunt().taskTotalKills = event.target.value;
            persistState();
        });

        taskTotalInput.addEventListener("change", () => {
            renderWorkspace();
        });

        taskTotalInput.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") {
                return;
            }

            event.preventDefault();
            renderWorkspace();
        });
    }
}

function processLog() {
    captureActiveHuntInputs();

    const hunt = getActiveHunt();
    const logText = hunt.sessionLog.trim();

    if (!logText) {
        setStatus("Session log required", true, "Paste a hunting session log before running the analyzer.");
        elements.sessionLog.focus();
        window.alert("Paste the session log first.");
        return;
    }

    setBusyState(true);
    dropAllTabsEntriesOfHunt(hunt.id);

    if (hunt.mode === "bestiary") {
        const { monsters, sessionDuration } = analyzeSession(logText, state.bestiaryData);
        hunt.matchedMonsters = monsters;
        hunt.selectedBestiaryMonsterNames = monsters.map((monster) => monster.name);
        hunt.sessionDuration = sessionDuration;
        hunt.taskMonsters = [];
        hunt.taskTotalKills = "";
        hunt.selectedTaskMonsterName = "";
        hunt.processedMode = "bestiary";
        renderWorkspace();
        persistState();
        setStatus(
            monsters.length ? "Analysis updated" : "No matching creatures found",
            false,
            monsters.length
                ? "Select the creatures you want to keep, then enter total kills to refine the estimate."
                : "Check creature names in the log or confirm the session includes a killed-creatures section."
        );
    } else {
        const { monsters, sessionDuration } = analyzeTaskSession(logText);
        hunt.matchedMonsters = [];
        hunt.selectedBestiaryMonsterNames = [];
        hunt.sessionDuration = sessionDuration;
        hunt.taskMonsters = monsters;
        hunt.selectedTaskMonsterName = monsters[0]?.name ?? "";
        hunt.processedMode = "tasks";
        normalizeView();
        renderWorkspace();
        persistState();
        setStatus(
            monsters.length ? "Task analysis updated" : "No task candidates found",
            false,
            monsters.length
                ? "Select the creature from this session, then enter the task target."
                : "Check that the pasted session includes the killed-creatures block."
        );
    }

    setBusyState(false);
}

function updateRemainingTime() {
    captureActiveHuntInputs();
    renderWorkspace();
    persistState();
    setStatus("Estimate updated", false, "The time remaining now reflects the total kills you entered.");
}

function clearInputs() {
    const hunt = getActiveHunt();

    hunt.matchedMonsters = hunt.matchedMonsters.map((monster) => ({
        ...monster,
        totalKills: 0
    }));

    renderWorkspace();
    persistState();
    setStatus("Totals reset", false, "The estimate now uses session kills only.");
}

function restoreWorkspaceState() {
    const workspace = restoreWorkspace(loadSessionState()) || createWorkspace();

    state.hunts = workspace.hunts;
    state.activeHuntId = workspace.activeHuntId;
    state.view = workspace.view;
    state.excludedAllTabsEntries = workspace.excludedAllTabsEntries;
    normalizeView();

    return state.hunts.some(huntHasContent);
}

async function initializeApp() {
    try {
        setBusyState(true);
        state.bestiaryData = await loadBestiaryData();

        const hasRestoredContent = restoreWorkspaceState();
        renderWorkspace();

        if (hasRestoredContent) {
            setStatus(
                "Previous session restored",
                false,
                "Switch hunt tabs to review each analysis, or compare them once two hunts have Bestiary results."
            );
            return;
        }

        setStatus("Ready", false, MODE_CONTENT[getActiveHunt().mode].readyHint);
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
elements.processLogButton.addEventListener("click", processLog);

initializeApp();
