import { formatNumber } from "../utils/formatters.js";
import { escapeAttribute } from "./render-blocks.js";
import { buildTrackerRowHtml, escapeText } from "./render-tracker.js";

/**
 * Recording one bounded unit: the entry surface, then the review, then the stamp.
 *
 * The entry surface deliberately mirrors the client's own layout. For the Bestiary
 * that means a grid of tiles rather than table rows, because the client shows
 * fifteen creature tiles to a class page and copying a grid into a grid is
 * pattern-matching, while copying a grid into a list is a lookup for every line.
 *
 * Everything else uses the same table row as the main tracker table, so the
 * controls behave identically wherever the player meets them.
 */

function buildProgressNote(unit, entered) {
    const untouched = unit.total - entered;

    return `${formatNumber(entered)} recorded &middot; ${formatNumber(untouched)} untouched`;
}

function buildChecksum(tracker, unit, checksumValue, checksumCount) {
    if (!tracker.unit?.checksum) {
        return "";
    }

    const { label, hint } = tracker.unit.checksum;
    const typed = Number(checksumValue);
    const hasValue = checksumValue !== "" && Number.isFinite(typed);
    const matches = hasValue && typed === checksumCount;

    return `
        <div class="unit-checksum">
            <label class="input-label" for="unitChecksum">${escapeText(label)} in Tibia</label>
            <input
                id="unitChecksum"
                class="library-search"
                type="number"
                min="0"
                inputmode="numeric"
                value="${escapeAttribute(checksumValue)}"
                placeholder="${formatNumber(unit.total)}"
            >
            <span class="unit-checksum-note ${hasValue ? (matches ? "is-match" : "is-mismatch") : ""}">
                ${hasValue
                    ? (matches
                        ? `matches your ${formatNumber(checksumCount)}`
                        : `you marked ${formatNumber(checksumCount)} &mdash; check before recording`)
                    : `${escapeText(hint)}`}
            </span>
        </div>
    `;
}

/** The Bestiary grid: five across, mirroring the client's class page. */
function buildTileGrid(rows, tracker) {
    const stageColumn = tracker.columns.find((column) => column.isInput);

    return `
        <div class="unit-grid">
            ${rows.map((row) => `
                <div class="unit-tile${row.answered ? " is-answered" : ""}" data-tracker-row="${escapeAttribute(row.key)}">
                    <span class="unit-tile-name">${escapeText(row.name)}</span>
                    <table class="unit-tile-control"><tbody><tr>${stageColumn.cell(row)}</tr></tbody></table>
                </div>
            `).join("")}
        </div>
    `;
}

function buildRowList(rows, tracker) {
    const columns = tracker.columns.filter((column) => column.isInput || column.key === "name" || column.key === "points");

    return `
        <div class="table-container progress-table">
            <table role="grid">
                <tbody>
                    ${rows.map((row) => `<tr data-tracker-row="${escapeAttribute(row.key)}">${
                        buildTrackerRowHtml(row, columns, {})
                    }</tr>`).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function buildEntryStage(view) {
    const { tracker, unit, rows, page, entered, checksumValue, checksumCount } = view;
    // The instruction names the client screen, so it must use the group's name and
    // never the internal page key.
    const instruction = tracker.unit.instruction
        ? tracker.unit.instruction(String(unit.key).split("#")[0])
        : "";

    return `
        <section class="results-section unit-entry" aria-labelledby="unitTitle">
            <div class="unit-head">
                <div>
                    <h3 class="subsection-title" id="unitTitle">${escapeText(tracker.label)} &middot; ${escapeText(unit.label)}</h3>
                    ${instruction ? `<p class="unit-instruction">In Tibia: <strong>${escapeText(instruction)}</strong></p>` : ""}
                </div>
                <button class="btn btn-secondary" type="button" id="unitBack">Back to list</button>
            </div>

            ${buildChecksum(tracker, unit, checksumValue, checksumCount)}

            ${tracker.id === "bestiary" ? buildTileGrid(rows, tracker) : buildRowList(rows, tracker)}

            ${page.lastIndex > 0 ? `
                <div class="pager">
                    <span class="pager-count">Page ${page.index + 1} of ${page.lastIndex + 1} &mdash; matches the client's own paging</span>
                    <div class="pager-steps">
                        <button class="row-action" type="button" data-unit-page="prev" ${page.index === 0 ? "disabled" : ""}>Previous</button>
                        <button class="row-action" type="button" data-unit-page="next" ${page.index >= page.lastIndex ? "disabled" : ""}>Next</button>
                    </div>
                </div>
            ` : ""}

            <div class="unit-foot">
                <span class="unit-progress">${buildProgressNote(unit, entered)}</span>
                ${tracker.tickField ? `
                    <button class="btn btn-secondary" type="button" id="unitConfirmRest">
                        Confirm remaining ${formatNumber(unit.total - entered)} as ${escapeText(view.notWord)}
                    </button>
                ` : ""}
                <button class="btn btn-primary" type="button" id="unitReview">Review ${escapeText(unit.label)}</button>
            </div>
        </section>
    `;
}

function buildReviewStage(view) {
    const { tracker, unit, review, checksumValue, checksumCount } = view;
    const blocked = review.checksumMismatch;

    return `
        <section class="results-section unit-review" aria-labelledby="unitReviewTitle">
            <div class="unit-head">
                <div>
                    <h3 class="subsection-title" id="unitReviewTitle">Review &middot; ${escapeText(tracker.label)} ${escapeText(unit.label)}</h3>
                    <p class="unit-instruction">Nothing is saved until you confirm.</p>
                </div>
                <button class="btn btn-secondary" type="button" id="unitEdit">Keep editing</button>
            </div>

            <dl class="review-list">
                <div class="review-line">
                    <dt>Recorded</dt>
                    <dd>${review.entered.length
                        ? review.entered.map((entry) => `<span class="review-chip">${escapeText(entry.name)} <strong>${escapeText(entry.value)}</strong></span>`).join(" ")
                        : '<span class="cell-muted">nothing yet</span>'}</dd>
                </div>

                <div class="review-line">
                    <dt>Will be saved as ${escapeText(review.zeroWord)}</dt>
                    <dd>${review.untouched
                        ? `${formatNumber(review.untouched)} untouched item${review.untouched === 1 ? "" : "s"} in this ${escapeText(tracker.unit.label.toLowerCase())}`
                        : '<span class="cell-muted">none</span>'}</dd>
                </div>

                ${review.warnings.length ? `
                    <div class="review-line is-warning">
                        <dt>Needs a look</dt>
                        <dd>${review.warnings.map((warning) => `<span class="review-chip is-warning">${escapeText(warning)}</span>`).join(" ")}</dd>
                    </div>
                ` : ""}

                ${tracker.unit?.checksum ? `
                    <div class="review-line${blocked ? " is-warning" : ""}">
                        <dt>${escapeText(tracker.unit.checksum.label)} check</dt>
                        <dd>${checksumValue === ""
                            ? '<span class="cell-muted">not entered — recording without it</span>'
                            : (blocked
                                ? `Tibia says <strong>${escapeText(checksumValue)}</strong>, you marked <strong>${formatNumber(checksumCount)}</strong>`
                                : `matches at ${formatNumber(checksumCount)}`)}</dd>
                    </div>
                ` : ""}
            </dl>

            <div class="unit-foot">
                ${blocked
                    ? `<span class="unit-blocked">Fix the ${escapeText(tracker.unit.checksum.label)} count or clear it to continue.</span>`
                    : ""}
                <button class="btn btn-primary" type="button" id="unitCommit" ${blocked ? "disabled" : ""}>
                    Record ${formatNumber(unit.total)} ${escapeText(unit.label)} ${unit.total === 1 ? "entry" : "entries"}
                </button>
            </div>
        </section>
    `;
}

export function renderTrackerUnit(container, view) {
    container.className = "results-shell";
    container.innerHTML = view.stage === "review" ? buildReviewStage(view) : buildEntryStage(view);
}
