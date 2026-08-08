import {
    formatCharmsPerHour,
    formatKillRate,
    formatNumber,
    formatTime
} from "../utils/formatters.js";

function buildMetric(label, value, emphasized = false) {
    return `
        <article class="summary-card${emphasized ? " summary-card-primary" : ""}">
            <span class="summary-label">${label}</span>
            <strong>${value}</strong>
        </article>
    `;
}

function buildEntryButton(entry) {
    return `
        <button
            class="task-monster-button${entry.isSelected ? " is-selected" : ""}"
            type="button"
            data-all-tabs-entry="${entry.key}"
            aria-pressed="${entry.isSelected ? "true" : "false"}"
        >
            ${entry.isSelected ? '<span class="selection-badge">Selected</span>' : ""}
            <span class="task-monster-name">${entry.monster.name}</span>
            <span class="task-monster-count">${entry.huntLabel} &middot; ${formatNumber(entry.monster.killsThisSession)}x</span>
        </button>
    `;
}

function buildRow(entry) {
    const monster = entry.monster;

    return `
        <tr>
            <td>
                <a href="${monster.wikiLink}" target="_blank" rel="noreferrer">${monster.name}</a>
                <span class="entry-hunt-tag">${entry.huntLabel}</span>
            </td>
            <td>${formatNumber(monster.charms)}</td>
            <td>${formatNumber(monster.killsThisSession)}</td>
            <td class="editable-cell">
                <input
                    type="number"
                    class="kills-input"
                    data-monster-name="${monster.name}"
                    data-hunt-id="${entry.huntId}"
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

export function renderAllTabs(container, analysis, summary) {
    if (!analysis.rows.length) {
        container.className = "empty-state";
        container.innerHTML = `
            <strong>No analyzed creatures.</strong>
            <span>Process a hunt in Bestiary mode to list its creatures here.</span>
        `;
        return;
    }

    const selectedEntries = analysis.rows.filter((entry) => entry.isSelected);

    container.className = "results-shell";
    container.innerHTML = `
        <div class="summary-grid">
            ${buildMetric("Selected Creatures", formatNumber(selectedEntries.length))}
            ${buildMetric("All Tabs Time", formatTime(summary.totalTimeMinutes), true)}
            ${buildMetric("Total Charms", formatNumber(summary.totalCharms), true)}
            ${buildMetric("Charm Rate", formatCharmsPerHour(summary.charmRate))}
        </div>

        <section class="results-section" aria-labelledby="allTabsSelectionTitle">
            <h3 class="subsection-title" id="allTabsSelectionTitle">Select Creatures</h3>
            <p class="section-copy">
                A creature analyzed in several hunts appears once per hunt. Keep the hunt you plan to use for it, so its charm
                points are counted once. All Tabs Time adds the longest time remaining of each hunt that still has a selected
                entry, and Charm Rate divides Total Charms by that time.
            </p>
            <div class="creature-chip-grid" role="list">
                ${analysis.rows.map(buildEntryButton).join("")}
            </div>
        </section>

        ${selectedEntries.length ? `
            <section class="results-section" aria-labelledby="allTabsTableTitle">
                <h3 class="subsection-title" id="allTabsTableTitle">Bestiary Estimate</h3>
                <p class="results-intro">
                    Every row is the row of its source hunt tab. The tag next to a creature is the hunt that produced the
                    entry, and the total kills you enter there belong to that hunt.
                </p>

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
                                <th>Charm Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${selectedEntries.map(buildRow).join("")}
                        </tbody>
                    </table>
                </div>
            </section>
        ` : `
            <div class="empty-state">
                <strong>No entries selected.</strong>
                <span>Select at least one creature to show the combined Bestiary estimate.</span>
            </div>
        `}

        <div class="action-row">
            <button class="btn" id="allTabsUpdateButton" type="button">Update Estimate</button>
            <button class="btn btn-tertiary" id="allTabsResetButton" type="button">Reset Totals</button>
        </div>
    `;
}
