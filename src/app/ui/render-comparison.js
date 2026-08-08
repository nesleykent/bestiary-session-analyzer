import { formatCharmsPerHour, formatNumber, formatTime } from "../utils/formatters.js";

function buildWinnerCard(bestRow) {
    if (!bestRow) {
        return `
            <div class="empty-state">
                <strong>No charm rate to rank.</strong>
                <span>The analyzed hunts currently project no charm points per hour. Update the total kills or the creature selection in each hunt.</span>
            </div>
        `;
    }

    return `
        <article class="comparison-winner">
            <span class="summary-label">Best Session</span>
            <strong class="comparison-winner-hunt">${bestRow.label}</strong>
            <span class="comparison-winner-rate">${formatCharmsPerHour(bestRow.totalCharmsPerHour)}</span>
            <p class="comparison-winner-copy">
                Highest charm rate of your analyzed sessions, with ${formatNumber(bestRow.totalCharms)} charm points still available
                over ${formatTime(bestRow.maxTimeRemainingMinutes)} of projected hunting time.
            </p>
        </article>
    `;
}

function buildRow(row) {
    return `
        <tr class="${row.isBest ? "is-best" : ""}">
            <td>
                ${row.label}
                ${row.isBest ? '<span class="comparison-badge">Best</span>' : ""}
            </td>
            <td>${formatNumber(row.totalCharms)}</td>
            <td>${formatTime(row.maxTimeRemainingMinutes)}</td>
            <td>${formatCharmsPerHour(row.totalCharmsPerHour)}</td>
        </tr>
    `;
}

function buildPendingNote(pendingLabels) {
    if (!pendingLabels.length) {
        return "";
    }

    const isSingle = pendingLabels.length === 1;

    return `
        <p class="helper-text">
            ${pendingLabels.join(", ")} ${isSingle ? "has" : "have"} no Bestiary analysis yet and
            ${isSingle ? "is" : "are"} not part of this comparison.
        </p>
    `;
}

export function renderComparison(container, comparison) {
    if (comparison.rows.length < 2) {
        container.className = "empty-state";
        container.innerHTML = `
            <strong>Not enough analyzed sessions.</strong>
            <span>Process at least two sessions to compare their charm rate.</span>
        `;
        return;
    }

    container.className = "results-shell";
    container.innerHTML = `
        ${buildWinnerCard(comparison.bestRow)}

        <section class="results-section" aria-labelledby="comparisonTableTitle">
            <h3 class="subsection-title" id="comparisonTableTitle">Charm Rate Ranking</h3>
            <p class="results-intro">
                Every row is the Bestiary result already calculated inside that session: its matched creatures, your creature
                selection, and the total kills you entered there.
            </p>

            <div class="table-container comparison-table">
                <table>
                    <thead>
                        <tr>
                            <th>Session</th>
                            <th>Total Charms</th>
                            <th>Longest Time Remaining</th>
                            <th>Charm Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${comparison.rows.map(buildRow).join("")}
                    </tbody>
                </table>
            </div>

            ${buildPendingNote(comparison.pendingLabels)}
        </section>
    `;
}
