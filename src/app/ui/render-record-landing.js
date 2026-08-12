import { formatNumber } from "../utils/formatters.js";
import { escapeAttribute } from "./render-blocks.js";
import { escapeText } from "./render-tracker.js";

/**
 * What still needs recording, across all seven trackers at once.
 *
 * This is the screen the app never had. Without it the player faces seven sidebar
 * links with no way to tell which is worth opening or what is missing inside any of
 * them, and the only entry surface is a fourteen-page table with no start and no
 * end.
 *
 * Each tracker shows the same three facts — units read, items still unknown, and
 * the cheapest unit to read next — so the decision is always the same shape no
 * matter which tracker it lands on.
 */

const UNIT_STATUS_ICON = {
    recorded: "check_circle",
    inProgress: "pending",
    notStarted: "radio_button_unchecked"
};

function buildSuggestion(summary) {
    if (!summary.next) {
        return '<span class="cell-muted">All units recorded</span>';
    }

    return `
        <button
            class="landing-next"
            type="button"
            data-record-unit="${escapeAttribute(summary.next.key)}"
            data-record-tracker="${escapeAttribute(summary.trackerId)}"
        >
            ${escapeText(summary.next.label)}
            <span class="landing-next-size">${formatNumber(summary.next.total)}</span>
        </button>
    `;
}

function buildTrackerRow(summary) {
    const percent = summary.itemTotal > 0
        ? Math.round(((summary.itemTotal - summary.unknown) / summary.itemTotal) * 100)
        : 0;

    return `
        <li class="landing-row">
            <button class="landing-name" type="button" data-record-tracker="${escapeAttribute(summary.trackerId)}">
                ${escapeText(summary.label)}
            </button>

            <span class="landing-units">
                ${summary.unitTotal
                    ? `${formatNumber(summary.unitsRecorded)} of ${formatNumber(summary.unitTotal)} ${escapeText(summary.unitNoun)}`
                    : '<span class="cell-muted">&mdash;</span>'}
            </span>

            <span class="landing-progress" aria-hidden="true">
                <span class="landing-bar" style="width: ${percent}%"></span>
            </span>

            <span class="landing-unknown">
                ${summary.unknown
                    ? `${formatNumber(summary.unknown)} not recorded`
                    : '<span class="landing-done">all recorded</span>'}
            </span>

            ${buildSuggestion(summary)}
        </li>
    `;
}

export function renderRecordLanding(container, view) {
    const { summaries, worklists } = view;
    const totalUnknown = summaries.reduce((sum, summary) => sum + summary.unknown, 0);
    const totalItems = summaries.reduce((sum, summary) => sum + summary.itemTotal, 0);

    container.className = "results-shell";
    container.innerHTML = `
        <section class="results-section" aria-labelledby="recordLandingTitle">
            <h3 class="subsection-title" id="recordLandingTitle">What needs recording</h3>
            <p class="section-copy">
                ${totalUnknown
                    ? `${formatNumber(totalItems - totalUnknown)} of ${formatNumber(totalItems)} items recorded. Each row below is one bounded screen in Tibia &mdash; open it, copy what you see, and it is stamped with today's date.`
                    : "Everything is recorded. Use the trackers to plan, and record again whenever your character changes."}
            </p>

            <ul class="landing-list">
                ${summaries.map(buildTrackerRow).join("")}
            </ul>
        </section>

        ${worklists.length ? `
            <section class="results-section" aria-labelledby="worklistTitle">
                <h3 class="subsection-title" id="worklistTitle">Creatures worth looking up</h3>
                <p class="section-copy">
                    Named by your recent sessions, so they are the entries most likely to have moved. Session kill
                    counts stay with the session &mdash; open the creature in Tibia and record what its tile says.
                </p>

                <ul class="worklist">
                    ${worklists.map((entry) => `
                        <li>
                            <button class="worklist-item" type="button" data-record-lookup="${escapeAttribute(entry.name)}">
                                ${escapeText(entry.name)}
                                <span class="worklist-note">${escapeText(entry.note)}</span>
                            </button>
                        </li>
                    `).join("")}
                </ul>
            </section>
        ` : ""}
    `;
}
