import { analyzeSession, recalculateProgress } from "./features/session-analysis.js";
import { analyzeTaskSession, calculateTaskEstimate } from "./features/task-analysis.js";
import { loadBestiaryData } from "./services/bestiary-repository.js";
import { clearSessionState, loadSessionState, saveSessionState } from "./state/session-store.js";
import { renderResults } from "./ui/render-results.js";
import { renderTaskResults } from "./ui/render-task-results.js";

const elements = {
    clearLogButton: document.getElementById("clearLogButton"),
    inputCopy: document.getElementById("inputCopy"),
    inputHint: document.getElementById("inputHint"),
    modeBestiaryButton: document.getElementById("modeBestiaryButton"),
    modeTasksButton: document.getElementById("modeTasksButton"),
    output: document.getElementById("output"),
    pasteLogButton: document.getElementById("pasteLogButton"),
    processLogButton: document.getElementById("processLogButton"),
    resultsCopy: document.getElementById("resultsCopy"),
    sessionLog: document.getElementById("sessionLog"),
    statusHint: document.getElementById("statusHint"),
    statusMessage: document.getElementById("statusMessage")
};

const MODE_CONTENT = {
    bestiary: {
        inputCopy: "Use the exported hunting session text from Tibia. The analyzer reads session duration and killed creatures from the pasted log.",
        inputHint: "For the most accurate result, paste the full session block including duration and killed monsters.",
        resultsCopy: "Review the matched creatures first, then add your current total kills if you want a better remaining-time estimate.",
        readyHint: "Load a log to start a Bestiary estimate."
    },
    tasks: {
        inputCopy: "Tasks mode uses the same hunt analyzer log. After processing the session, choose one creature from the hunt and enter the total kills required by that task.",
        inputHint: "Process the log first, then select the task monster and enter the task size in total kills.",
        resultsCopy: "Tasks mode estimates one creature at a time from the current session. Choose the task monster from the hunt results and provide the task total.",
        readyHint: "Load a log to start a task estimate."
    }
};

const state = {
    bestiaryData: [],
    matchedMonsters: [],
    mode: "bestiary",
    selectedTaskMonsterName: "",
    sessionDuration: 0,
    taskMonsters: [],
    taskTotalKills: ""
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

function getEmptyStateMarkup() {
    if (state.mode === "tasks") {
        return `
            <strong>No task estimate yet.</strong>
            <span>Process a session log to choose a task creature and project how long that task may take.</span>
        `;
    }

    return `
        <strong>No analysis yet.</strong>
        <span>Process a session log to view matched creatures, projected time remaining, and charm efficiency.</span>
    `;
}

function setEmptyOutput() {
    elements.output.className = "empty-state";
    elements.output.innerHTML = getEmptyStateMarkup();
}

function applyModeContent() {
    const modeContent = MODE_CONTENT[state.mode];
    const isBestiary = state.mode === "bestiary";

    elements.inputCopy.textContent = modeContent.inputCopy;
    elements.inputHint.textContent = modeContent.inputHint;
    elements.resultsCopy.textContent = modeContent.resultsCopy;
    elements.modeBestiaryButton.classList.toggle("is-selected", isBestiary);
    elements.modeTasksButton.classList.toggle("is-selected", !isBestiary);
    elements.modeBestiaryButton.setAttribute("aria-selected", String(isBestiary));
    elements.modeTasksButton.setAttribute("aria-selected", String(!isBestiary));
}

function persistState() {
    saveSessionState({
        matchedMonsters: state.matchedMonsters,
        mode: state.mode,
        selectedTaskMonsterName: state.selectedTaskMonsterName,
        sessionDuration: state.sessionDuration,
        sessionLog: elements.sessionLog.value,
        taskMonsters: state.taskMonsters,
        taskTotalKills: state.taskTotalKills
    });
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
    state.matchedMonsters = [];
    state.selectedTaskMonsterName = "";
    state.sessionDuration = 0;
    state.taskMonsters = [];
    state.taskTotalKills = "";
    clearSessionState();
    setEmptyOutput();
    setStatus("Input cleared", false, MODE_CONTENT[state.mode].readyHint);
    elements.sessionLog.focus();
}

function renderBestiaryMode() {
    const { summary } = recalculateProgress(
        state.matchedMonsters,
        state.bestiaryData,
        state.sessionDuration,
        Object.fromEntries(
            state.matchedMonsters.map((monster) => [monster.name, monster.totalKills || 0])
        )
    );

    renderResults(elements.output, state.matchedMonsters, summary);
    attachResultActions();
}

function renderTaskMode() {
    const estimate = calculateTaskEstimate(
        state.taskMonsters,
        state.selectedTaskMonsterName,
        state.sessionDuration,
        state.taskTotalKills
    );

    renderTaskResults(elements.output, state.taskMonsters, estimate, state.sessionDuration);
    attachResultActions();
}

function setMode(mode) {
    state.mode = mode;
    applyModeContent();

    if (mode === "bestiary" && state.matchedMonsters.length) {
        renderBestiaryMode();
        setStatus("Bestiary mode", false, "Review the matched creatures or update total kills.");
        persistState();
        return;
    }

    if (mode === "tasks" && state.taskMonsters.length) {
        renderTaskMode();
        setStatus("Tasks mode", false, "Select the task creature and enter the total task kills.");
        persistState();
        return;
    }

    setEmptyOutput();
    setStatus("Ready", false, MODE_CONTENT[state.mode].readyHint);
    persistState();
}

function attachResultActions() {
    const updateButton = document.getElementById("updateRemainingTimeButton");
    const clearInputsButton = document.getElementById("clearInputsButton");
    const taskMonsterButtons = document.querySelectorAll("[data-task-monster]");
    const taskTotalInput = document.getElementById("taskTotalKills");

    if (updateButton) {
        updateButton.addEventListener("click", updateRemainingTime);
    }

    if (clearInputsButton) {
        clearInputsButton.addEventListener("click", clearInputs);
    }

    taskMonsterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            state.selectedTaskMonsterName = button.dataset.taskMonster;
            persistState();
            renderTaskMode();
            setStatus("Task monster selected", false, "Enter the total kills for the selected task to calculate the remaining time.");
        });
    });

    if (taskTotalInput) {
        taskTotalInput.addEventListener("input", (event) => {
            state.taskTotalKills = event.target.value;
            persistState();
        });

        taskTotalInput.addEventListener("change", () => {
            renderTaskMode();
        });

        taskTotalInput.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") {
                return;
            }

            event.preventDefault();
            renderTaskMode();
        });
    }
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

    if (state.mode === "bestiary") {
        const { monsters, sessionDuration, summary } = analyzeSession(logText, state.bestiaryData);
        state.matchedMonsters = monsters;
        state.sessionDuration = sessionDuration;
        state.taskMonsters = [];
        state.taskTotalKills = "";
        state.selectedTaskMonsterName = "";
        renderResults(elements.output, state.matchedMonsters, summary);
        attachResultActions();
        persistState();
        setStatus(
            monsters.length ? "Analysis updated" : "No matching creatures found",
            false,
            monsters.length
                ? "Review the summary first, then add total kills if you want a better projection."
                : "Check creature names in the log or confirm the session includes a killed-monsters section."
        );
    } else {
        const { monsters, sessionDuration } = analyzeTaskSession(logText);
        state.matchedMonsters = [];
        state.sessionDuration = sessionDuration;
        state.taskMonsters = monsters;
        state.selectedTaskMonsterName = monsters[0]?.name ?? "";
        renderTaskMode();
        persistState();
        setStatus(
            monsters.length ? "Task analysis updated" : "No task candidates found",
            false,
            monsters.length
                ? "Select the task creature from this session, then enter the total task kills."
                : "Check that the pasted session includes the killed-monsters block."
        );
    }

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
    renderResults(elements.output, state.matchedMonsters, summary);
    attachResultActions();
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
    renderResults(elements.output, state.matchedMonsters, summary);
    attachResultActions();
    persistState();
    setStatus("Manual totals cleared", false, "The estimate now uses session kills only.");
}

function restorePreviousSession() {
    const savedState = loadSessionState();
    if (!savedState) {
        return false;
    }

    elements.sessionLog.value = savedState.sessionLog || "";
    state.mode = savedState.mode || "bestiary";
    state.matchedMonsters = savedState.matchedMonsters || [];
    state.selectedTaskMonsterName = savedState.selectedTaskMonsterName || "";
    state.sessionDuration = savedState.sessionDuration || 0;
    state.taskMonsters = savedState.taskMonsters || [];
    state.taskTotalKills = savedState.taskTotalKills || "";
    applyModeContent();

    if (state.mode === "bestiary" && state.matchedMonsters.length) {
        renderBestiaryMode();
        setStatus("Previous session restored", false, "You can edit the pasted log or update total kills at any time.");
        return true;
    }

    if (state.mode === "tasks" && state.taskMonsters.length) {
        renderTaskMode();
        setStatus("Previous task session restored", false, "You can change the selected monster or the task size at any time.");
        return true;
    }

    return false;
}

async function initializeApp() {
    try {
        setBusyState(true);
        state.bestiaryData = await loadBestiaryData();
        applyModeContent();
        const restored = restorePreviousSession();
        if (!restored) {
            setStatus("Ready", false, MODE_CONTENT[state.mode].readyHint);
        }
    } catch (error) {
        setStatus("Failed to load data", true, "Refresh the page and try again. The dataset could not be loaded.");
        window.alert("Failed to load Bestiary data.");
    } finally {
        setBusyState(false);
    }
}

elements.pasteLogButton.addEventListener("click", pasteLog);
elements.clearLogButton.addEventListener("click", clearLog);
elements.modeBestiaryButton.addEventListener("click", () => setMode("bestiary"));
elements.modeTasksButton.addEventListener("click", () => setMode("tasks"));
elements.processLogButton.addEventListener("click", processLog);

initializeApp();
