import {
    formatCharmsPerHour,
    formatKillRate,
    formatNumber,
    formatTime
} from "../utils/formatters.js";

function buildBestiaryMonsterButton(monster, selectedMonsterNames) {
    const isSelected = selectedMonsterNames.includes(monster.name);
    const label = monster.displayName || monster.name;

    return `
        <button
            class="task-monster-button${isSelected ? " is-selected" : ""}"
            type="button"
            data-bestiary-monster="${monster.name}"
            aria-pressed="${isSelected ? "true" : "false"}"
        >
            ${isSelected ? '<span class="selection-badge">Selected</span>' : ""}
            <span class="task-monster-name">${label}</span>
            <span class="task-monster-count">${formatNumber(monster.killsThisSession)}x</span>
        </button>
    `;
}

function buildRow(monster) {
    return `
        <tr>
            <td><a href="${monster.wikiLink}" target="_blank" rel="noreferrer">${monster.name}</a></td>
            <td>${formatNumber(monster.charms)}</td>
            <td>${formatNumber(monster.killsThisSession)}</td>
            <td class="editable-cell">
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

function buildMetric(label, value, emphasized = false) {
    return `
        <article class="summary-card${emphasized ? " summary-card-primary" : ""}">
            <span class="summary-label">${label}</span>
            <strong>${value}</strong>
        </article>
    `;
}

export function renderResults(container, monsters, selectedMonsterNames, summary) {
    if (!monsters.length) {
        container.className = "empty-state";
        container.innerHTML = `
            <strong>No matching creatures found.</strong>
            <span>The log was processed, but none of the killed creatures matched the available Bestiary dataset.</span>
        `;
        return;
    }

    const selectedMonsters = monsters.filter((monster) => selectedMonsterNames.includes(monster.name));

    container.className = "results-shell";
    container.innerHTML = `
        <div class="summary-grid">
            ${buildMetric("Creatures Selected", formatNumber(selectedMonsters.length))}
            ${buildMetric("Longest Time Remaining", formatTime(summary.maxTimeRemainingMinutes), true)}
            ${buildMetric("Total Charms", formatNumber(summary.totalCharms), true)}
            ${buildMetric("Total Charms/hr", formatCharmsPerHour(summary.totalCharmsPerHour))}
        </div>

        <section class="results-section" aria-labelledby="bestiarySelectionTitle">
            <h3 class="subsection-title" id="bestiarySelectionTitle">Select Creatures</h3>
            <p class="section-copy">Only selected creatures remain in the estimate table.</p>
            <div class="creature-chip-grid" role="list">
                ${monsters.map((monster) => buildBestiaryMonsterButton(monster, selectedMonsterNames)).join("")}
            </div>
        </section>

        ${selectedMonsters.length ? `
            <section class="results-section" aria-labelledby="bestiaryTableTitle">
                <h3 class="subsection-title" id="bestiaryTableTitle">Bestiary Estimate</h3>
                <p class="results-intro">Enter current total kills in the highlighted column to refine the estimate.</p>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Creature</th>
                                <th>Charm Points</th>
                                <th>Session Kills</th>
                                <th>Total Kills</th>
                                <th>Unlock Target</th>
                                <th>Kill Rate</th>
                                <th>Kills Remaining</th>
                                <th>Time Remaining</th>
                                <th>Charms/hr</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${selectedMonsters.map(buildRow).join("")}
                        </tbody>
                    </table>
                </div>
            </section>
        ` : `
            <div class="empty-state">
                <strong>No creatures selected.</strong>
                <span>Select at least one creature to show its Bestiary summary and table.</span>
            </div>
        `}

        <div class="action-row">
            <button class="btn" id="updateRemainingTimeButton" type="button">Update Estimate</button>
            <button class="btn btn-tertiary" id="clearInputsButton" type="button">Reset Totals</button>
        </div>
    `;
}
