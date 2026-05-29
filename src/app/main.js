import { analyzeSession, recalculateProgress } from "./features/session-analysis.js";
import { loadBestiaryData } from "./services/bestiary-repository.js";
import { clearSessionState, loadSessionState, saveSessionState } from "./state/session-store.js";
import { renderResults } from "./ui/render-results.js";

const elements = {
    clearLogButton: document.getElementById("clearLogButton"),
    output: document.getElementById("output"),
    pasteLogButton: document.getElementById("pasteLogButton"),
    processLogButton: document.getElementById("processLogButton"),
    sessionLog: document.getElementById("sessionLog"),
    statusMessage: document.getElementById("statusMessage")
};

const state = {
    bestiaryData: [],
    matchedMonsters: [],
    sessionDuration: 0
};

function setStatus(message, isError = false) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.dataset.state = isError ? "error" : "default";
}

async function pasteLog() {
    try {
        const clipboardText = await navigator.clipboard.readText();
        elements.sessionLog.value = clipboardText;
        setStatus("Log pasted");
    } catch (error) {
        setStatus("Clipboard access blocked", true);
        window.alert("Failed to paste. Ensure clipboard permissions are enabled.");
    }
}

function clearLog() {
    elements.sessionLog.value = "";
    elements.output.className = "empty-state";
    elements.output.textContent = "Process a session log to view results.";
    state.matchedMonsters = [];
    state.sessionDuration = 0;
    clearSessionState();
    setStatus("Input cleared");
}

function persistState() {
    saveSessionState({
        matchedMonsters: state.matchedMonsters,
        sessionDuration: state.sessionDuration,
        sessionLog: elements.sessionLog.value
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
}

function renderCurrentResults(summary) {
    renderResults(elements.output, state.matchedMonsters, summary);
    attachResultActions();
}

function processLog() {
    const logText = elements.sessionLog.value.trim();
    if (!logText) {
        setStatus("Paste a session log first", true);
        window.alert("Paste the session log first.");
        return;
    }

    const { monsters, sessionDuration, summary } = analyzeSession(logText, state.bestiaryData);
    state.matchedMonsters = monsters;
    state.sessionDuration = sessionDuration;
    renderCurrentResults(summary);
    persistState();
    setStatus(monsters.length ? "Analysis updated" : "No matching creatures found");
}

function readTotalKillsInputs() {
    const inputs = document.querySelectorAll(".kills-input");

    return Array.from(inputs).reduce((totals, input) => {
        totals[input.dataset.monsterName] = Number.parseInt(input.value, 10) || 0;
        return totals;
    }, {});
}

function updateRemainingTime() {
    const totalKillsByName = readTotalKillsInputs();
    const { monsters, summary } = recalculateProgress(
        state.matchedMonsters,
        state.bestiaryData,
        state.sessionDuration,
        totalKillsByName
    );

    state.matchedMonsters = monsters;
    renderCurrentResults(summary);
    persistState();
    setStatus("Remaining time recalculated");
}

function clearInputs() {
    const { monsters, summary } = recalculateProgress(
        state.matchedMonsters,
        state.bestiaryData,
        state.sessionDuration,
        {}
    );

    state.matchedMonsters = monsters;
    renderCurrentResults(summary);
    persistState();
    setStatus("Manual totals cleared");
}

function restorePreviousSession() {
    const savedState = loadSessionState();
    if (!savedState) {
        return;
    }

    elements.sessionLog.value = savedState.sessionLog || "";
    state.matchedMonsters = savedState.matchedMonsters || [];
    state.sessionDuration = savedState.sessionDuration || 0;

    if (state.matchedMonsters.length) {
        const { summary } = recalculateProgress(
            state.matchedMonsters,
            state.bestiaryData,
            state.sessionDuration,
            Object.fromEntries(
                state.matchedMonsters.map((monster) => [monster.name, monster.totalKills || 0])
            )
        );

        renderCurrentResults(summary);
        setStatus("Previous session restored");
    }
}

async function initializeApp() {
    try {
        state.bestiaryData = await loadBestiaryData();
        restorePreviousSession();
        setStatus("Ready");
    } catch (error) {
        setStatus("Failed to load data", true);
        window.alert("Failed to load Bestiary data.");
    }
}

elements.pasteLogButton.addEventListener("click", pasteLog);
elements.clearLogButton.addEventListener("click", clearLog);
elements.processLogButton.addEventListener("click", processLog);

initializeApp();
