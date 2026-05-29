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

function buildMetric(label, value) {
    return `
        <article class="metric-item">
            <span class="metric-label">${label}</span>
            <strong class="metric-value">${value}</strong>
        </article>
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
            <div class="metric-grid">
                ${buildMetric("Time Remaining", formatTimeDetailed(estimate.remainingTimeMinutes))}
                ${buildMetric("Kill Rate", formatTaskRate(estimate.killRatePerHour))}
                ${buildMetric("Killed This Session", formatNumber(estimate.alreadyKilled))}
                ${buildMetric("Kills Remaining", formatNumber(estimate.remainingKills))}
                ${buildMetric("Total Time Estimate", formatTimeDetailed(estimate.totalEstimatedTimeMinutes))}
            </div>
        ` : `
            <div class="empty-state">
                <strong>Enter the task target.</strong>
                <span>Type the target kills required for the selected task to calculate the time remaining.</span>
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
        <div class="metric-grid">
            ${buildMetric("Session Time", formatTimeDetailed(sessionDuration))}
            ${buildMetric("Creature Types", formatNumber(estimate.totalMonsterTypes))}
        </div>

        <section class="results-section" aria-labelledby="taskSelectionTitle">
            <h3 class="subsection-title" id="taskSelectionTitle">Select Task Creature</h3>
            <p class="section-copy">Choose one of the creatures found in this session log.</p>
            <div class="creature-chip-grid" role="list">
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
