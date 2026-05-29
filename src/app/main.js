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
    statusHint: document.getElementById("statusHint"),
    statusMessage: document.getElementById("statusMessage")
};

const state = {
    bestiaryData: [],
    matchedMonsters: [],
    sessionDuration: 0
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

async function pasteLog() {
    try {
        const clipboardText = await navigator.clipboard.readText();
        elements.sessionLog.value = clipboardText;
        setStatus("Log pasted", false, "Review the text, then process the session.");
        elements.sessionLog.focus();
    } catch (error) {
        setStatus("Clipboard access blocked", true, "Paste manually if your browser blocks clipboard access.");
        window.alert("Failed to paste. Ensure clipboard permissions are enabled.");
    }
}

function clearLog() {
    elements.sessionLog.value = "";
    elements.output.className = "empty-state";
    elements.output.innerHTML = `
        <strong>No analysis yet.</strong>
        <span>Process a session log to view matched creatures, projected time remaining, and charm efficiency.</span>
    `;
    state.matchedMonsters = [];
    state.sessionDuration = 0;
    clearSessionState();
    setStatus("Input cleared", false, "Paste a new session log whenever you’re ready.");
    elements.sessionLog.focus();
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
        setStatus("Session log required", true, "Paste a hunting session log before running the analyzer.");
        elements.sessionLog.focus();
        window.alert("Paste the session log first.");
        return;
    }

    setBusyState(true);
    const { monsters, sessionDuration, summary } = analyzeSession(logText, state.bestiaryData);
    state.matchedMonsters = monsters;
    state.sessionDuration = sessionDuration;
    renderCurrentResults(summary);
    persistState();
    setStatus(
        monsters.length ? "Analysis updated" : "No matching creatures found",
        false,
        monsters.length
            ? "Review the summary first, then add total kills if you want a better projection."
            : "Check creature names in the log or confirm the session includes a killed-monsters section."
    );
    setBusyState(false);
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
    setStatus("Estimate updated", false, "The remaining-time projection now reflects the total kills you entered.");
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
    setStatus("Manual totals cleared", false, "The estimate now uses session kills only.");
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
        setStatus("Previous session restored", false, "You can edit the pasted log or update total kills at any time.");
    }
}

async function initializeApp() {
    try {
        setBusyState(true);
        state.bestiaryData = await loadBestiaryData();
        restorePreviousSession();
        setStatus("Ready", false, "Load a log to start an estimate.");
    } catch (error) {
        setStatus("Failed to load data", true, "Refresh the page and try again. The dataset could not be loaded.");
        window.alert("Failed to load Bestiary data.");
    } finally {
        setBusyState(false);
    }
}

elements.pasteLogButton.addEventListener("click", pasteLog);
elements.clearLogButton.addEventListener("click", clearLog);
elements.processLogButton.addEventListener("click", processLog);

initializeApp();
