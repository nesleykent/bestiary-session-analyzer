import {
    formatCharmsPerHour,
    formatKillRate,
    formatNumber,
    formatTime
} from "../utils/formatters.js";

function buildRow(monster) {
    return `
        <tr>
            <td><a href="${monster.wikiLink}" target="_blank" rel="noreferrer">${monster.name}</a></td>
            <td>${formatNumber(monster.charms)}</td>
            <td>${formatNumber(monster.killsThisSession)}</td>
            <td>
                <input
                    type="number"
                    class="kills-input"
                    data-monster-name="${monster.name}"
                    min="0"
                    value="${monster.totalKills || ""}"
                    placeholder="Enter kills"
                >
            </td>
            <td>${formatNumber(monster.killsToUnlock)}</td>
            <td>${formatKillRate(monster.killRate)}</td>
            <td>${formatNumber(monster.remainingKills)}</td>
            <td>${formatTime(monster.timeRemainingMinutes)}</td>
            <td>${formatCharmsPerHour(monster.charmsPerHour)}</td>
        </tr>
    `;
}

export function renderResults(container, monsters, summary) {
    if (!monsters.length) {
        container.className = "empty-state";
        container.innerHTML = `
            <strong>No matching creatures found.</strong>
            <span>The log was processed, but none of the killed creatures matched the available Bestiary dataset.</span>
        `;
        return;
    }

    container.className = "results-shell";
    container.innerHTML = `
        <div class="summary-grid">
            <article class="summary-card">
                <span class="summary-label">Matched Creatures</span>
                <strong>${formatNumber(monsters.length)}</strong>
            </article>
            <article class="summary-card">
                <span class="summary-label">Total Charms</span>
                <strong>${formatNumber(summary.totalCharms)}</strong>
            </article>
            <article class="summary-card">
                <span class="summary-label">Slowest Unlock</span>
                <strong>${formatTime(summary.maxTimeRemainingMinutes)}</strong>
            </article>
            <article class="summary-card">
                <span class="summary-label">Total Charms / Hour</span>
                <strong>${formatCharmsPerHour(summary.totalCharmsPerHour)}</strong>
            </article>
        </div>

        <p class="results-intro">
            Add your current total kills below if you want the remaining time estimate to reflect your existing Bestiary progress.
        </p>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Creature</th>
                        <th>Charm Points</th>
                        <th>Session Kills</th>
                        <th>Total Kills</th>
                        <th>Kills to Unlock</th>
                        <th>Kill Rate</th>
                        <th>Kills Left</th>
                        <th>Time Remaining</th>
                        <th>Charms per Hour</th>
                    </tr>
                </thead>
                <tbody>
                    ${monsters.map(buildRow).join("")}
                </tbody>
            </table>
        </div>

        <div class="action-row action-row-spaced">
            <button class="btn" id="updateRemainingTimeButton" type="button">Update Remaining Time</button>
            <button class="btn btn-secondary" id="clearInputsButton" type="button">Clear Inputs</button>
        </div>
    `;
}
