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

const HTML_ENTITIES = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " "
};

/**
 * Renders third-party prose that contains markup as readable text.
 *
 * Escaping alone is safe but shows the tags, and ten achievement spoilers carry
 * anchors — the reader wants "Defeat Scarlett Etzel in the Grave Danger Quest",
 * not the raw element. So tags are dropped, the link text kept, and the result is
 * still escaped, which is what makes this safe regardless of what the tag
 * stripping missed.
 */
export function plainText(value) {
    const stripped = String(value ?? "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]*>/g, "")
        .replace(/&[a-z#0-9]+;/gi, (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? entity)
        .replace(/\s+/g, " ")
        .trim();

    return escapeText(stripped);
}

export function trackerCountCell(row, field, suffix, options = {}) {
    const { placeholder = "0", title = "", valueField = field } = options;
    // The field shows only what the player typed. Showing a derived floor here would
    // let the capture-on-view-change path write that floor back as if it were an
    // exact count, turning "at least 250" into a precise 250 nobody ever read.
    const value = row[valueField] || "";

    return `
        <td class="count-cell${row.known === false ? " is-unknown" : ""}">
            <input
                class="tracker-count"
                type="number"
                min="0"
                inputmode="numeric"
                data-tracker-item="${escapeAttribute(row.key)}"
                data-tracker-field="${escapeAttribute(field)}"
                value="${value}"
                placeholder="${escapeAttribute(placeholder)}"
                title="${escapeAttribute(title)}"
                aria-label="${escapeAttribute(field)} for ${escapeAttribute(row.name)}"
            >
            ${suffix ? `<span class="cell-muted">${escapeText(suffix)}</span>` : ""}
        </td>
    `;
}

/**
 * The control that mirrors a client tile: a small segmented set showing exactly the
 * states the game shows, so the player picks what they are looking at instead of
 * translating it into a number the client never displayed.
 *
 * `stages` is ordered as the client orders them. An unset control shows nothing
 * selected, which is how "not recorded yet" looks.
 */
export function trackerStageCell(row, field, stages, options = {}) {
    const { label = "" } = options;
    const current = row[field] ?? 0;

    return `
        <td class="stage-cell">
            <div class="stage-set" role="radiogroup" aria-label="${escapeAttribute(label || field)} for ${escapeAttribute(row.name)}">
                ${stages.map((stage) => `
                    <button
                        class="stage-option${current === stage.value ? " is-on" : ""}"
                        type="button"
                        role="radio"
                        aria-checked="${current === stage.value ? "true" : "false"}"
                        title="${escapeAttribute(stage.title ?? stage.label)}"
                        data-tracker-item="${escapeAttribute(row.key)}"
                        data-tracker-stage="${escapeAttribute(field)}"
                        data-tracker-stage-value="${stage.value}"
                    >${escapeText(stage.label)}</button>
                `).join("")}
            </div>
        </td>
    `;
}

/**
 * The tick every boolean tracker uses. Three visual states, because an unmarked box
 * that has never been reviewed is not the same claim as one confirmed empty.
 */
export function trackerTickCell(row, field, options = {}) {
    const { label = "", locked = false, title = "" } = options;
    const isOn = Boolean(row[field]);
    const isUnknown = row.known === false;

    if (locked) {
        return `
            <td class="tick-cell">
                <span class="tick is-on is-locked" title="${escapeAttribute(title)}" aria-label="${escapeAttribute(label)}">
                    <span class="material-symbols-outlined" aria-hidden="true">lock</span>
                </span>
            </td>
        `;
    }

    return `
        <td class="tick-cell">
            <button
                class="tick${isOn ? " is-on" : ""}${isUnknown ? " is-unknown" : ""}"
                type="button"
                role="checkbox"
                aria-checked="${isOn ? "true" : (isUnknown ? "mixed" : "false")}"
                data-tracker-item="${escapeAttribute(row.key)}"
                data-tracker-flag="${escapeAttribute(field)}"
                aria-label="${escapeAttribute(label || field)} for ${escapeAttribute(row.name)}"
                title="${escapeAttribute(isUnknown ? "Not recorded yet" : (isOn ? "Yes" : "No"))}"
            >${isOn
                ? '<span class="material-symbols-outlined" aria-hidden="true">check</span>'
                : (isUnknown ? "&mdash;" : "")}</button>
        </td>
    `;
}

/** The per-row select box that drives the bulk bar. */
export function trackerSelectCell(row, isSelected) {
    return `
        <td class="select-cell">
            <input
                class="row-select"
                type="checkbox"
                data-tracker-select="${escapeAttribute(row.key)}"
                ${isSelected ? "checked" : ""}
                aria-label="Select ${escapeAttribute(row.name)}"
            >
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
            ><span class="material-symbols-outlined" aria-hidden="true">${row[field] ? "star" : "star_border"}</span></button>
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
        if (column.noSort) {
            return `<th class="select-cell"><span class="sr-only">${escapeText(column.srLabel ?? "")}</span></th>`;
        }

        const isSorted = sort.key === column.key;
        const nextDirection = isSorted && sort.direction === "asc" ? "desc" : "asc";
        const indicator = isSorted
            ? `<span class="material-symbols-outlined" aria-hidden="true">${sort.direction === "asc" ? "arrow_upward" : "arrow_downward"}</span>`
            : "";
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

/**
 * Search stays out in the open because it is the control people reach for; the rest
 * fold behind one disclosure that says how many are active.
 *
 * This is the "include just what's necessary" call, not a removal: every filter is
 * still there, one click away, and an active one is announced rather than hidden. The
 * status strip stays above the table because it is how the list is read, not a
 * refinement of it.
 */
function countActiveFilters(facets, filters, statusFacet) {
    return facets.filter((facet) => {
        if (facet === statusFacet || facet.kind === "search") {
            return false;
        }

        const value = filters[facet.key];

        return facet.kind === "check" ? Boolean(value) : value !== undefined && value !== "all";
    }).length;
}

function buildFilters(facets, filters, items) {
    const statusFacet = facets.find((facet) => facet.kind === "segmented" && facet.isStatus);
    const searchFacet = facets.find((facet) => facet.kind === "search");
    const checks = facets.filter((facet) => facet.kind === "check");
    const rest = facets.filter((facet) => facet !== statusFacet && facet !== searchFacet && facet.kind !== "check");
    const active = countActiveFilters(facets, filters, statusFacet);

    return `
        ${statusFacet ? `<div class="progress-view-tabs">${buildFacet(statusFacet, filters, items)}</div>` : ""}

        <div class="filter-bar">
            ${searchFacet ? buildFacet(searchFacet, filters, items) : ""}

            ${rest.length || checks.length ? `
                <details class="filter-disclosure"${active ? " open" : ""}>
                    <summary>
                        Filters${active ? `<span class="filter-count">${active}</span>` : ""}
                    </summary>
                    <div class="progress-filters">
                        ${rest.map((facet) => buildFacet(facet, filters, items)).join("")}
                        ${buildChecks(checks, filters)}
                    </div>
                </details>
            ` : ""}
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

/**
 * The row, as one string. Exported so a single change can repaint its own row
 * instead of the whole table — which is what keeps focus, selection and scroll
 * where the player left them while marking a long list.
 */
export function buildTrackerRowHtml(row, columns, options = {}) {
    const { selectedKey = "", isSelected = false, selectable = false } = options;

    return `${selectable ? trackerSelectCell(row, isSelected) : ""}${
        columns.map((column) => column.cell(row)).join("")
    }`;
}

export function patchTrackerRow(container, row, columns, options = {}) {
    const tr = container.querySelector(`tr[data-tracker-row="${CSS.escape(row.key)}"]`);

    if (!tr) {
        return null;
    }

    tr.className = rowClassName(row, options);
    tr.innerHTML = buildTrackerRowHtml(row, columns, options);

    return tr;
}

function rowClassName(row, { selectedKey = "", isSelected = false } = {}) {
    return [
        `is-${row.status}`,
        row.known === false ? "is-unrecorded" : "",
        row.key === selectedKey ? "is-peek-selected" : "",
        isSelected ? "is-selected" : ""
    ].filter(Boolean).join(" ");
}

/**
 * The bulk bar, shown only while rows are selected: selector and count on the
 * left, verbs in the middle, dismiss on the right.
 */
function buildBulkBar(view) {
    const { selection, bulkActions = [], rows } = view;
    const count = selection.size;

    if (!count || !bulkActions.length) {
        return "";
    }

    const allShown = rows.length > 0 && rows.every((row) => selection.has(row.key));

    return `
        <div class="bulk-bar" role="region" aria-label="Bulk actions">
            <label class="bulk-select">
                <input type="checkbox" id="trackerSelectAll" ${allShown ? "checked" : ""}>
                <span>${formatNumber(count)} selected</span>
            </label>

            <div class="bulk-actions">
                ${bulkActions.map((action) => `
                    <button class="row-action" type="button" data-tracker-bulk="${escapeAttribute(action.key)}">${escapeText(action.label)}</button>
                `).join("")}
            </div>

            <button class="icon-button" type="button" id="trackerClearSelection" aria-label="Clear selection">
                <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
        </div>
    `;
}

export function renderTracker(container, view) {
    const {
        tracker,
        rows,
        columns,
        page,
        sort,
        filters,
        items,
        totals,
        selectedKey = "",
        selection = new Set(),
        bulkActions = []
    } = view;
    const selectable = bulkActions.length > 0;
    const headColumns = selectable
        ? [{ key: "select", label: "", srLabel: "Select", isNumeric: false, noSort: true }, ...columns]
        : columns;

    container.className = "results-shell";
    container.innerHTML = `
        ${buildTotals(totals)}

        <section class="results-section" aria-labelledby="trackerTableTitle">
            <h3 class="subsection-title" id="trackerTableTitle">${escapeText(tracker.tableTitle ?? tracker.label)}</h3>

            ${buildFilters(tracker.facets, filters, items)}
            ${buildBulkBar({ selection, bulkActions, rows })}

            ${rows.length ? `
                <div class="table-container progress-table">
                    <table role="grid" aria-rowcount="${page.total}">
                        <thead>${buildHead(headColumns, sort)}</thead>
                        <tbody>${rows.map((row) => `<tr class="${rowClassName(row, { selectedKey, isSelected: selection.has(row.key) })}" data-tracker-row="${escapeAttribute(row.key)}">${
                            buildTrackerRowHtml(row, columns, { selectedKey, isSelected: selection.has(row.key), selectable })
                        }</tr>`).join("")}</tbody>
                    </table>
                </div>
                ${buildPager(page)}
            ` : buildEmptyState(
                "Nothing matches these filters.",
                "Clear the search, or set the filters back to All."
            )}
        </section>

        ${tracker.transfer ? `
            <details class="filter-disclosure transfer-disclosure">
                <summary>Bring progress in, or take it out</summary>

                <div class="action-row">
                    <button class="btn btn-secondary" id="trackerPasteButton" type="button">Paste a list</button>
                    <button class="btn btn-secondary" id="trackerImportButton" type="button">Import file</button>
                    <button class="btn btn-secondary" id="trackerExportButton" type="button">Export CSV</button>
                    <input class="sr-only" id="trackerImportInput" type="file" accept=".csv,.json,text/csv,application/json" tabindex="-1" aria-hidden="true">
                </div>

                <p class="helper-text">
                    Paste accepts a column of names copied from anywhere. Import accepts the CSV layout this tracker
                    exports. Either way you see what will change before it is saved, and only your own progress is read
                    &mdash; points, thresholds and categories always come from the game data.
                </p>
            </details>
        ` : ""}
    `;
}
