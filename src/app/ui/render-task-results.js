import { formatNumber, formatTaskRate, formatTimeDetailed } from "../utils/formatters.js";

function buildTaskMonsterButton(monster, selectedMonsterName) {
    const isSelected = monster.name === selectedMonsterName;

    return `
        <button
            class="task-monster-button${isSelected ? " is-selected" : ""}"
            type="button"
            data-task-monster="${monster.name}"
            aria-pressed="${isSelected ? "true" : "false"}"
        >
            <span class="task-monster-name">${monster.displayName}</span>
            <span class="task-monster-count">${formatNumber(monster.killsThisSession)}x</span>
        </button>
    `;
}

function buildEstimateMarkup(estimate) {
    if (!estimate.selectedMonster) {
        return `
            <div class="empty-state">
                <strong>No creature selected.</strong>
                <span>Select a creature from the session to estimate task completion.</span>
            </div>
        `;
    }

    const hasTaskTotal = estimate.taskTotalKills > 0;

    return `
        <div class="task-selection-header">
            <div>
                <p class="task-selection-label">Selected Creature</p>
                <strong class="task-selection-value">${estimate.selectedMonster.displayName}</strong>
            </div>
            <p class="task-selection-copy">${formatNumber(estimate.selectedMonster.killsThisSession)} killed in this session</p>
        </div>

        <label class="input-label" for="taskTotalKills">Task target</label>
        <input
            id="taskTotalKills"
            class="task-total-input"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            value="${hasTaskTotal ? estimate.taskTotalKills : ""}"
            placeholder="Example: 500"
        >

        ${hasTaskTotal ? `
            <div class="task-estimate-grid">
                <article class="summary-card">
                    <span class="summary-label">Time Remaining</span>
                    <strong>${formatTimeDetailed(estimate.remainingTimeMinutes)}</strong>
                </article>
                <article class="summary-card">
                    <span class="summary-label">Kill Rate</span>
                    <strong>${formatTaskRate(estimate.killRatePerHour)}</strong>
                </article>
                <article class="summary-card">
                    <span class="summary-label">Killed This Session</span>
                    <strong>${formatNumber(estimate.alreadyKilled)}</strong>
                </article>
                <article class="summary-card">
                    <span class="summary-label">Kills Remaining</span>
                    <strong>${formatNumber(estimate.remainingKills)}</strong>
                </article>
                <article class="summary-card summary-card-wide">
                    <span class="summary-label">Total Time Estimate</span>
                    <strong>${formatTimeDetailed(estimate.totalEstimatedTimeMinutes)}</strong>
                </article>
            </div>
        ` : `
            <div class="empty-state">
                <strong>Enter the task size.</strong>
                <span>Type the total kills required for the selected task to calculate the remaining time.</span>
            </div>
        `}
    `;
}

export function renderTaskResults(container, monsters, estimate, sessionDuration) {
    if (!monsters.length) {
        container.className = "empty-state";
        container.innerHTML = `
            <strong>No task candidates found.</strong>
            <span>The log was processed, but no killed creatures were detected in the session block.</span>
        `;
        return;
    }

    container.className = "results-shell";
    container.innerHTML = `
        <div class="summary-grid">
            <article class="summary-card">
                <span class="summary-label">Session Time</span>
                <strong>${formatTimeDetailed(sessionDuration)}</strong>
            </article>
            <article class="summary-card">
                <span class="summary-label">Creature Types</span>
                <strong>${formatNumber(estimate.totalMonsterTypes)}</strong>
            </article>
        </div>

        <section class="results-section" aria-labelledby="taskSelectionTitle">
            <h3 class="subsection-title" id="taskSelectionTitle">Select Task Creature</h3>
            <p class="section-copy">Choose one of the creatures found in this session log.</p>
            <div class="task-monster-list" role="list">
                ${monsters.map((monster) => buildTaskMonsterButton(monster, estimate.selectedMonster?.name)).join("")}
            </div>
        </section>

        <section class="results-section" aria-labelledby="taskEstimateTitle">
            <h3 class="subsection-title" id="taskEstimateTitle">Task Estimate</h3>
            <p class="section-copy">Use the selected creature and task target to project the time remaining.</p>
            ${buildEstimateMarkup(estimate)}
        </section>
    `;
}
