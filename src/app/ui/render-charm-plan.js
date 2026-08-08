import { formatNumber, formatTime } from "../utils/formatters.js";

function escapeAttribute(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function buildMetric(label, value, emphasized = false) {
    return `
        <article class="summary-card${emphasized ? " summary-card-primary" : ""}">
            <span class="summary-label">${label}</span>
            <strong>${value}</strong>
        </article>
    `;
}

function buildEntryRow(entry, showHuntLabel) {
    return `
        <li class="plan-entry">
            <span class="plan-entry-name">
                ${entry.name}
                ${showHuntLabel ? `<span class="entry-hunt-tag">${entry.huntLabel}</span>` : ""}
            </span>
            <span class="plan-entry-time">${formatTime(entry.timeRemainingMinutes)}</span>
            <span class="plan-entry-charm">+${formatNumber(entry.charms)}</span>
        </li>
    `;
}

function buildEntryList(plan, showHuntLabel) {
    if (!plan.entries.length) {
        return `
            <p class="helper-text">
                None of the selected Bestiary entries can be finished in this time. Charm points are only earned once an
                entry is complete, so a longer play time or a lower unlock target is needed.
            </p>
        `;
    }

    return `
        <ul class="plan-entry-list" role="list">
            <li class="plan-entry plan-entry-head">
                <span class="plan-entry-name">Creature</span>
                <span class="plan-entry-time">Time to Complete</span>
                <span class="plan-entry-charm">Charm</span>
            </li>
            ${plan.entries.map((entry) => buildEntryRow(entry, showHuntLabel)).join("")}
        </ul>
    `;
}

function buildRouteStep(step) {
    return `
        <li class="plan-route-step">
            <div class="plan-route-head">
                <span class="plan-route-order">${formatNumber(step.order)}</span>
                <span class="plan-route-hunt">${step.huntLabel}</span>
                <span class="plan-route-time">${formatTime(step.minutes)}</span>
                <span class="plan-route-charm">+${formatNumber(step.charms)}</span>
                <span class="plan-route-total">${formatNumber(step.cumulativeCharms)} total</span>
            </div>
            <ul class="plan-route-entries" role="list">
                ${step.entries.map((entry) => `
                    <li>
                        <span class="plan-route-entry-name">${entry.name}</span>
                        <span class="plan-route-entry-time">${formatTime(entry.timeRemainingMinutes)}</span>
                        <span class="plan-route-entry-charm">+${formatNumber(entry.charms)}</span>
                    </li>
                `).join("")}
            </ul>
        </li>
    `;
}

function buildRoute(plan) {
    if (!plan.route.length) {
        return "";
    }

    return `
        <div class="plan-route-block">
            <h4 class="plan-route-title">Recommended Hunt Route</h4>
            <p class="helper-text">
                Time spent in a hunt progresses all of its selected entries at once and the progress is kept, so each hunt
                needs only one visit. Steps are ordered to bank charm points as early as possible.
            </p>
            <ol class="plan-route" role="list">
                ${plan.route.map(buildRouteStep).join("")}
            </ol>
            <p class="plan-route-summary">
                Total ${formatTime(plan.timeUsedMinutes)} for ${formatNumber(plan.charms)} charm points,
                ${formatTime(plan.unusedMinutes)} unused.
            </p>
        </div>
    `;
}

export function buildCharmPlanResultMarkup(planView) {
    if (!planView.plan) {
        return `
            <div class="empty-state">
                <strong>No play time entered.</strong>
                <span>Enter the hunting time you have available to see which Bestiary entries fit in it.</span>
            </div>
        `;
    }

    const plan = planView.plan;

    return `
        <div class="summary-grid">
            ${buildMetric("Play Time Available", formatTime(plan.availableMinutes))}
            ${buildMetric("Charm Points Obtainable", formatNumber(plan.charms), true)}
            ${buildMetric("Time Used", formatTime(plan.timeUsedMinutes), true)}
            ${buildMetric("Unused Time", formatTime(plan.unusedMinutes))}
            ${buildMetric("Bestiaries Completed", formatNumber(plan.completedCount))}
        </div>

        ${buildEntryList(plan, planView.showAllocations)}
        ${planView.showAllocations || plan.route.length > 1 ? buildRoute(plan) : ""}
    `;
}

export function buildCharmPlanMarkup(planView) {
    return `
        <section class="results-section" aria-labelledby="charmPlanTitle">
            <h3 class="subsection-title" id="charmPlanTitle">Charm Plan</h3>
            <p class="section-copy">
                Enter the hunting time you have available to see which of the selected Bestiary entries you can finish and
                how many charm points that earns. Partial progress earns nothing, so an entry only counts once complete.
            </p>

            <div class="plan-input-block">
                <label class="input-label" for="playTimeInput">Play Time Available</label>
                <input
                    id="playTimeInput"
                    class="plan-time-input"
                    type="text"
                    inputmode="text"
                    autocomplete="off"
                    spellcheck="false"
                    value="${escapeAttribute(planView.playTimeValue)}"
                    placeholder="Example: 2h 30min"
                >
                <p class="helper-text">Accepts 90 min, 1.5 h, 2h 30min, or 2:30. A plain number counts as hours.</p>
            </div>

            <div id="charmPlanResult">${buildCharmPlanResultMarkup(planView)}</div>
        </section>
    `;
}
