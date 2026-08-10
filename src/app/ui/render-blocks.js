import {
    formatCharmsPerHour,
    formatKillRate,
    formatNumber,
    formatTime
} from "../utils/formatters.js";

export function escapeAttribute(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function buildEmptyState(headline, detail = "") {
    return `
        <div class="empty-state">
            <strong>${headline}</strong>
            ${detail ? `<span>${detail}</span>` : ""}
        </div>
    `;
}

export function buildAnswer(label, value, note = "") {
    return `
        <article class="answer">
            <span class="summary-label">${label}</span>
            <strong class="answer-value">${value}</strong>
            ${note ? `<p class="answer-note">${note}</p>` : ""}
        </article>
    `;
}

export function buildStatLine(parts) {
    const filled = parts.filter(Boolean);

    return filled.length ? `<p class="stat-line">${filled.join("<span>·</span>")}</p>` : "";
}

export function buildPill(text, isBrand = false) {
    return `<span class="pill${isBrand ? " is-brand" : ""}">${text}</span>`;
}

export function buildLinkButton(text, attribute, value, extraClass = "") {
    return `
        <button class="link-button${extraClass ? ` ${extraClass}` : ""}" type="button" ${attribute}="${escapeAttribute(value)}">
            ${text}
        </button>
    `;
}

export function buildRow(cells, modifier = "") {
    return `
        <li class="row${modifier ? ` ${modifier}` : ""}">
            ${cells.join("")}
        </li>
    `;
}

export function buildRowList(rows, columnCount) {
    return `
        <ul class="row-list cols-${columnCount}" role="list">
            ${rows.join("")}
        </ul>
    `;
}

function buildEstimateRow(entry) {
    const monster = entry.monster;

    return `
        <tr>
            <td>
                <a href="${monster.wikiLink}" target="_blank" rel="noreferrer">${monster.name}</a>
                ${entry.huntLabel ? buildPill(entry.huntLabel) : ""}
            </td>
            <td>${formatNumber(monster.charms)}</td>
            <td>${formatNumber(monster.killsThisSession)}</td>
            <td class="editable-cell">
                <input
                    type="number"
                    class="kills-input"
                    data-monster-name="${escapeAttribute(monster.name)}"
                    ${entry.huntId ? `data-hunt-id="${escapeAttribute(entry.huntId)}"` : ""}
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

export function buildEstimateTable(entries) {
    return `
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
                    ${entries.map(buildEstimateRow).join("")}
                </tbody>
            </table>
        </div>
    `;
}

export function buildCreatureChip(options) {
    return `
        <button
            class="chip${options.isSelected ? " is-selected" : ""}"
            type="button"
            ${options.attribute}="${escapeAttribute(options.value)}"
            aria-pressed="${options.isSelected ? "true" : "false"}"
        >
            <span class="chip-name">${options.name}</span>
            <span class="chip-meta">${options.meta}</span>
        </button>
    `;
}
