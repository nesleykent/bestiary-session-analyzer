import { formatNumber } from "../utils/formatters.js";
import { buildAnswer, buildEmptyState, buildStatLine, escapeAttribute } from "./render-blocks.js";

/**
 * One table for every tracker. A tracker definition supplies its columns, its
 * facets and its totals; everything structural — sorting, filtering, paging,
 * the headline treatment — lives here exactly once.
 *
 * The cell helpers below are the only way a definition should emit an
 * interactive control, because the generic controller binds on these data
 * attributes.
 */

export const PAGE_SIZES = [30, 60, 120, 0];

/**
 * Dataset text is third-party and, in the achievements data, contains real HTML
 * anchors. Everything user-visible goes through here before reaching innerHTML.
 */
export function escapeText(value) {
    return escapeAttribute(value);
}

export function trackerCountCell(row, field, suffix) {
    return `
        <td class="count-cell">
            <input
                class="tracker-count"
                type="number"
                min="0"
                inputmode="numeric"
                data-tracker-item="${escapeAttribute(row.key)}"
                data-tracker-field="${escapeAttribute(field)}"
                value="${row[field] || ""}"
                placeholder="0"
                aria-label="${escapeAttribute(field)} for ${escapeAttribute(row.name)}"
            >
            ${suffix ? `<span class="cell-muted">${escapeText(suffix)}</span>` : ""}
        </td>
    `;
}

export function trackerStarCell(row, field = "bookmark") {
    return `
        <td class="star-cell">
            <button
                class="star-toggle${row[field] ? " is-on" : ""}"
                type="button"
                data-tracker-item="${escapeAttribute(row.key)}"
                data-tracker-flag="${escapeAttribute(field)}"
                aria-pressed="${row[field] ? "true" : "false"}"
                aria-label="Bookmark ${escapeAttribute(row.name)}"
            >${row[field] ? "★" : "☆"}</button>
        </td>
    `;
}

/**
 * A claimable value — Echo Warden points, an achievement's own points. `locked`
 * renders it inert, which is how a value derived from another tracker is shown
 * without pretending it is editable here.
 */
export function trackerFlagCell(row, field, options = {}) {
    const { label = "", eligible = true, locked = false, title = "" } = options;

    if (!eligible) {
        return '<td class="is-num"><span class="cell-muted">&mdash;</span></td>';
    }

    if (locked) {
        return `
            <td class="is-num">
                <span class="flag-toggle is-on is-locked" title="${escapeAttribute(title)}">${escapeText(label)}</span>
            </td>
        `;
    }

    return `
        <td class="is-num">
            <button
                class="flag-toggle${row[field] ? " is-on" : ""}"
                type="button"
                data-tracker-item="${escapeAttribute(row.key)}"
                data-tracker-flag="${escapeAttribute(field)}"
                aria-pressed="${row[field] ? "true" : "false"}"
                aria-label="${escapeAttribute(field)} for ${escapeAttribute(row.name)}"
            >${escapeText(label)}</button>
        </td>
    `;
}

function buildHead(columns, sort) {
    return `<tr>${columns.map((column) => {
        const isSorted = sort.key === column.key;
        const nextDirection = isSorted && sort.direction === "asc" ? "desc" : "asc";
        const indicator = isSorted ? (sort.direction === "asc" ? "▲" : "▼") : "";
        const label = column.label || column.srLabel || "";

        return `
            <th class="${column.isNumeric ? "is-num" : ""}${isSorted ? " is-sorted" : ""}">
                <button
                    class="column-sort"
                    type="button"
                    data-tracker-sort="${escapeAttribute(column.key)}"
                    data-tracker-direction="${nextDirection}"
                    aria-label="Sort by ${escapeAttribute(label || column.key)}"
                >${escapeText(column.label ?? "")}${column.mark ?? ""}<span class="sort-mark">${indicator}</span></button>
            </th>
        `;
    }).join("")}</tr>`;
}

function buildFacet(facet, filters, items) {
    const value = filters[facet.key];
    const id = `trackerFacet-${facet.key}`;

    if (facet.kind === "search") {
        return `
            <div>
                <label class="input-label" for="${id}">${escapeText(facet.label)}</label>
                <input
                    id="${id}"
                    class="library-search"
                    type="text"
                    autocomplete="off"
                    data-tracker-facet="${escapeAttribute(facet.key)}"
                    value="${escapeAttribute(value ?? "")}"
                    placeholder="${escapeAttribute(facet.placeholder ?? "")}"
                >
            </div>
        `;
    }

    if (facet.kind === "select") {
        const options = facet.options(items);

        return `
            <div>
                <label class="input-label" for="${id}">${escapeText(facet.label)}</label>
                <select id="${id}" class="progress-select" data-tracker-facet="${escapeAttribute(facet.key)}">
                    <option value="all"${value === "all" ? " selected" : ""}>${escapeText(facet.allLabel ?? "All")}</option>
                    ${options.map((option) => `
                        <option value="${escapeAttribute(option.value)}"${String(value) === String(option.value) ? " selected" : ""}>${escapeText(option.label)}</option>
                    `).join("")}
                </select>
            </div>
        `;
    }

    if (facet.kind === "segmented") {
        return `
            <div>
                <span class="input-label" id="${id}Label">${escapeText(facet.label)}</span>
                <div class="segmented" role="group" aria-labelledby="${id}Label">
                    ${facet.options().map((option) => `
                        <button
                            class="segmented-button${String(value) === String(option.value) ? " is-selected" : ""}"
                            type="button"
                            data-tracker-facet="${escapeAttribute(facet.key)}"
                            data-tracker-facet-value="${escapeAttribute(option.value)}"
                            aria-pressed="${String(value) === String(option.value) ? "true" : "false"}"
                        >${escapeText(option.label)}</button>
                    `).join("")}
                </div>
            </div>
        `;
    }

    return "";
}

function buildChecks(checks, filters) {
    if (!checks.length) {
        return "";
    }

    return `
        <div>
            <span class="input-label">Only show</span>
            <div class="check-row">
                ${checks.map((facet) => `
                    <label class="check">
                        <input
                            type="checkbox"
                            id="trackerFacet-${escapeAttribute(facet.key)}"
                            data-tracker-facet="${escapeAttribute(facet.key)}"
                            ${filters[facet.key] ? "checked" : ""}
                        >
                        ${escapeText(facet.label)}
                    </label>
                `).join("")}
            </div>
        </div>
    `;
}

function buildFilters(facets, filters, items) {
    const checks = facets.filter((facet) => facet.kind === "check");
    const rest = facets.filter((facet) => facet.kind !== "check");

    return `
        <div class="progress-filters">
            ${rest.map((facet) => buildFacet(facet, filters, items)).join("")}
            ${buildChecks(checks, filters)}
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
                        data-tracker-page-size="${size}"
                    >${size === 0 ? "All" : size}</button>
                `).join("")}
            </div>

            <div class="pager-steps">
                <button class="row-action" type="button" data-tracker-page="prev" ${page.index === 0 ? "disabled" : ""}>Previous</button>
                <button class="row-action" type="button" data-tracker-page="next" ${page.index >= page.lastIndex ? "disabled" : ""}>Next</button>
            </div>
        </div>
    `;
}

function buildTotals(totals) {
    return `
        ${buildAnswer(totals.answer.label, totals.answer.value, totals.answer.note ?? "")}
        ${buildStatLine(totals.stats ?? [])}
    `;
}

export function renderTracker(container, view) {
    const { tracker, rows, columns, page, sort, filters, items, totals } = view;

    container.className = "results-shell";
    container.innerHTML = `
        ${buildTotals(totals)}

        <section class="results-section" aria-labelledby="trackerTableTitle">
            <h3 class="subsection-title" id="trackerTableTitle">${escapeText(tracker.tableTitle ?? tracker.label)}</h3>

            ${rows.length ? `
                <div class="table-container progress-table">
                    <table>
                        <thead>${buildHead(columns, sort)}</thead>
                        <tbody>${rows.map((row) => `<tr class="is-${escapeAttribute(row.status)}">${
                            columns.map((column) => column.cell(row)).join("")
                        }</tr>`).join("")}</tbody>
                    </table>
                </div>
                ${buildPager(page)}
            ` : buildEmptyState(
                "Nothing matches these filters.",
                "Clear the search, or set the filters back to All."
            )}

            ${buildFilters(tracker.facets, filters, items)}
        </section>

        ${tracker.transfer ? `
            <div class="action-row">
                <button class="btn btn-secondary" id="trackerImportButton" type="button">Import Progress</button>
                <button class="btn btn-secondary" id="trackerExportButton" type="button">Export CSV</button>
                <input class="sr-only" id="trackerImportInput" type="file" accept=".csv,.json,text/csv,application/json" tabindex="-1" aria-hidden="true">
            </div>

            <p class="helper-text">
                Import accepts the CSV layout this tracker exports. Only your own progress is read &mdash; points,
                thresholds and categories always come from the game data.
            </p>
        ` : ""}
    `;
}
