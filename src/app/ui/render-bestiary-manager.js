import { formatNumber } from "../utils/formatters.js";
import { PROGRESS_STATUS_LABELS } from "../state/bestiary-progress.js";
import { buildAnswer, buildEmptyState, buildStatLine, escapeAttribute } from "./render-blocks.js";

export const MANAGER_COLUMNS = [
    { key: "bookmark", label: "", isNumeric: false, sortable: true, srLabel: "Bookmarked" },
    { key: "name", label: "Creature", isNumeric: false, sortable: true },
    { key: "className", label: "Class", isNumeric: false, sortable: true },
    { key: "charms", label: "Charm Points", isNumeric: true, sortable: true },
    { key: "echoWardenPoints", label: "Echo Warden", isNumeric: true, sortable: true },
    { key: "kills", label: "Kills", isNumeric: false, sortable: true },
    { key: "killsLeft", label: "Kills Left", isNumeric: true, sortable: true },
    { key: "status", label: "Status", isNumeric: false, sortable: true }
];

export const PAGE_SIZES = [30, 60, 120, 0];

function buildHead(sort) {
    return `<tr>${MANAGER_COLUMNS.map((column) => {
        const isSorted = sort.key === column.key;
        const nextDirection = isSorted && sort.direction === "asc" ? "desc" : "asc";
        const indicator = isSorted ? (sort.direction === "asc" ? "▲" : "▼") : "";

        return `
            <th class="${column.isNumeric ? "is-num" : ""}${isSorted ? " is-sorted" : ""}">
                <button
                    class="column-sort"
                    type="button"
                    data-progress-sort="${column.key}"
                    data-progress-direction="${nextDirection}"
                    aria-label="Sort by ${escapeAttribute(column.label || column.srLabel)}"
                >${column.label || "★"}<span class="sort-mark">${indicator}</span></button>
            </th>
        `;
    }).join("")}</tr>`;
}

function buildEchoWardenCell(row) {
    if (!row.echoWardenEligible) {
        return '<td class="is-num echo-cell"><span class="cell-muted">&mdash;</span></td>';
    }

    return `
        <td class="is-num echo-cell">
            <button
                class="flag-toggle${row.echoWardenClaimed ? " is-on" : ""}"
                type="button"
                data-progress-echo="${escapeAttribute(row.name)}"
                aria-pressed="${row.echoWardenClaimed ? "true" : "false"}"
                aria-label="Echo Warden for ${escapeAttribute(row.name)}, ${row.echoWardenPoints} points"
            >${formatNumber(row.echoWardenPoints)}</button>
        </td>
    `;
}

function buildRow(row) {
    return `
        <tr class="is-${row.status}">
            <td class="star-cell">
                <button
                    class="star-toggle${row.bookmark ? " is-on" : ""}"
                    type="button"
                    data-progress-bookmark="${escapeAttribute(row.name)}"
                    aria-pressed="${row.bookmark ? "true" : "false"}"
                    aria-label="Bookmark ${escapeAttribute(row.name)}"
                >${row.bookmark ? "★" : "☆"}</button>
            </td>
            <td class="creature-cell">
                <a href="${row.wikiLink}" target="_blank" rel="noreferrer">${row.name}</a>
            </td>
            <td class="cell-muted">${row.className || "&mdash;"}</td>
            <td class="is-num">${formatNumber(row.charms)}</td>
            ${buildEchoWardenCell(row)}
            <td class="kills-cell">
                <input
                    class="progress-kills"
                    type="number"
                    min="0"
                    inputmode="numeric"
                    data-progress-name="${escapeAttribute(row.name)}"
                    value="${row.kills || ""}"
                    placeholder="0"
                    aria-label="Kills for ${escapeAttribute(row.name)}"
                >
                <span class="cell-muted">/ ${formatNumber(row.unlockTarget)}</span>
            </td>
            <td class="is-num">${row.isComplete ? "&mdash;" : formatNumber(row.killsLeft)}</td>
            <td><span class="status-mark">${PROGRESS_STATUS_LABELS[row.status]}</span></td>
        </tr>
    `;
}

function buildTotals(totals) {
    const percent = totals.charmPointsTotal > 0
        ? (totals.charmPointsEarned / totals.charmPointsTotal) * 100
        : 0;

    return `
        ${buildAnswer(
            "Charm Points",
            formatNumber(totals.charmPointsEarned),
            `of ${formatNumber(totals.charmPointsTotal)} in the game &mdash; ${percent.toFixed(1)}% earned.`
        )}
        ${buildStatLine([
            `${formatNumber(totals.completed)} of ${formatNumber(totals.creatureTotal)} completed`,
            `${formatNumber(totals.inProgress)} in progress`,
            `${formatNumber(totals.notStarted)} never hunted`,
            `Echo Warden ${formatNumber(totals.echoWardenEarned)} of ${formatNumber(totals.echoWardenTotal)}`
        ])}
    `;
}

function buildFilters(filters, classes) {
    const statuses = [
        { key: "all", label: "All" },
        { key: "notStarted", label: "Not Started" },
        { key: "inProgress", label: "In Progress" },
        { key: "done", label: "Done" }
    ];

    return `
        <div class="progress-filters">
            <div>
                <label class="input-label" for="progressSearch">Search</label>
                <input
                    id="progressSearch"
                    class="library-search"
                    type="text"
                    autocomplete="off"
                    value="${escapeAttribute(filters.search)}"
                    placeholder="Creature name"
                >
            </div>

            <div>
                <label class="input-label" for="progressClass">Class</label>
                <select id="progressClass" class="progress-select">
                    <option value="all"${filters.className === "all" ? " selected" : ""}>All classes</option>
                    ${classes.map((name) => `
                        <option value="${escapeAttribute(name)}"${filters.className === name ? " selected" : ""}>${name}</option>
                    `).join("")}
                </select>
            </div>

            <div>
                <span class="input-label" id="progressStatusLabel">Status</span>
                <div class="segmented" role="group" aria-labelledby="progressStatusLabel">
                    ${statuses.map((status) => `
                        <button
                            class="segmented-button${filters.status === status.key ? " is-selected" : ""}"
                            type="button"
                            data-progress-status="${status.key}"
                            aria-pressed="${filters.status === status.key ? "true" : "false"}"
                        >${status.label}</button>
                    `).join("")}
                </div>
            </div>

            <div>
                <span class="input-label">Only show</span>
                <div class="check-row">
                    <label class="check">
                        <input type="checkbox" id="progressBookmarked"${filters.bookmarkedOnly ? " checked" : ""}>
                        Bookmarked
                    </label>
                    <label class="check">
                        <input type="checkbox" id="progressEchoEligible"${filters.echoWardenOnly ? " checked" : ""}>
                        Echo Warden eligible
                    </label>
                </div>
            </div>
        </div>
    `;
}

function buildPager(page) {
    if (!page.total) {
        return "";
    }

    return `
        <div class="pager">
            <span class="pager-count">
                Showing ${formatNumber(page.from)}&ndash;${formatNumber(page.to)} of ${formatNumber(page.total)}
            </span>

            <div class="pager-sizes" role="group" aria-label="Rows per page">
                ${PAGE_SIZES.map((size) => `
                    <button
                        class="row-action${page.size === size ? " is-on" : ""}"
                        type="button"
                        data-progress-page-size="${size}"
                    >${size === 0 ? "All" : size}</button>
                `).join("")}
            </div>

            <div class="pager-steps">
                <button class="row-action" type="button" data-progress-page="prev" ${page.index === 0 ? "disabled" : ""}>Previous</button>
                <button class="row-action" type="button" data-progress-page="next" ${page.index >= page.lastIndex ? "disabled" : ""}>Next</button>
            </div>
        </div>
    `;
}

export function renderBestiaryManager(container, view) {
    container.className = "results-shell";
    container.innerHTML = `
        ${buildTotals(view.totals)}

        <section class="results-section" aria-labelledby="progressTableTitle">
            <h3 class="subsection-title" id="progressTableTitle">My Bestiary</h3>

            ${view.rows.length ? `
                <div class="table-container progress-table">
                    <table>
                        <thead>${buildHead(view.sort)}</thead>
                        <tbody>${view.rows.map(buildRow).join("")}</tbody>
                    </table>
                </div>
                ${buildPager(view.page)}
            ` : buildEmptyState(
                "No creature matches these filters.",
                "Clear the search, or switch the status filter back to All."
            )}

            ${buildFilters(view.filters, view.classes)}
        </section>

        <div class="action-row">
            <button class="btn btn-secondary" id="progressImportButton" type="button">Import Progress</button>
            <button class="btn btn-secondary" id="progressExportButton" type="button">Export CSV</button>
            <input class="sr-only" id="progressImportInput" type="file" accept=".csv,.json,text/csv,application/json" tabindex="-1" aria-hidden="true">
        </div>

        <p class="helper-text">
            Import accepts the CSV column layout above or a TibiaDraptor JSON export. Only your kills and flags are
            read &mdash; charm points and stage thresholds always come from the game data.
        </p>
    `;
}
