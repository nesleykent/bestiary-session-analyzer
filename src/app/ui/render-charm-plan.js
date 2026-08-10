import { formatNumber, formatTime } from "../utils/formatters.js";

function escapeAttribute(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function buildAvailabilityToggle(session) {
    return `
        <button
            class="plan-availability-toggle${session.isAvailable ? " is-available" : ""}"
            type="button"
            data-plan-availability="${session.id}"
            aria-pressed="${session.isAvailable ? "true" : "false"}"
        >
            <span class="plan-availability-name">${session.label}</span>
            <span class="plan-availability-state">${session.isAvailable ? "Available" : "Ignored"}</span>
        </button>
    `;
}

function buildAvailabilityControl(planView) {
    if (!planView.sessionAvailability.length) {
        return "";
    }

    return `
        <div class="plan-availability">
            <span class="input-label" id="planAvailabilityLabel">Available Sessions</span>
            <div class="plan-availability-list" role="group" aria-labelledby="planAvailabilityLabel">
                ${planView.sessionAvailability.map(buildAvailabilityToggle).join("")}
            </div>
            <p class="helper-text">
                Ignore a session while its spawn is taken and the plan will skip it. This only affects Charm Plan: the
                session, All Sessions, and Compare Sessions keep everything. Select it again at any time.
            </p>
        </div>
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

function buildEntryRow(entry) {
    return `
        <li class="plan-entry">
            <span class="plan-entry-name">
                ${entry.name}
                <button class="entry-hunt-tag entry-hunt-link" type="button" data-plan-hunt="${entry.huntId}">
                    ${entry.huntLabel}
                </button>
            </span>
            <span class="plan-entry-time">${formatTime(entry.timeRemainingMinutes)}</span>
            <span class="plan-entry-charm">+${formatNumber(entry.charms)}</span>
        </li>
    `;
}

function buildEntryList(plan) {
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
            ${plan.entries.map(buildEntryRow).join("")}
        </ul>
    `;
}

function buildRouteStep(step) {
    return `
        <li class="plan-route-step">
            <div class="plan-route-head">
                <span class="plan-route-order">${formatNumber(step.order)}</span>
                <button class="plan-route-hunt entry-hunt-link" type="button" data-plan-hunt="${step.huntId}">
                    ${step.huntLabel}
                </button>
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
        <section class="results-section" aria-labelledby="planRouteTitle">
            <h3 class="subsection-title" id="planRouteTitle">Recommended Route</h3>
            <p class="section-copy">
                Time you spend on a session progresses all of its selected entries at once, and that progress is kept, so each
                session needs only one visit. Steps are ordered to bank charm points as early as possible.
            </p>
            <ol class="plan-route" role="list">
                ${plan.route.map(buildRouteStep).join("")}
            </ol>
            <p class="plan-route-summary">
                Total ${formatTime(plan.timeUsedMinutes)} for ${formatNumber(plan.charms)} charm points,
                ${formatTime(plan.unusedMinutes)} unused.
            </p>
        </section>
    `;
}

export function buildCharmPlanResultMarkup(planView) {
    if (!planView.hasAnalyzedHunts) {
        return `
            <div class="empty-state">
                <strong>No analyzed sessions.</strong>
                <span>Process at least one Hunt Analyzer, then come back to plan your available time.</span>
            </div>
        `;
    }

    if (!planView.hasAvailableHunts) {
        return `
            <div class="empty-state">
                <strong>Every session is ignored.</strong>
                <span>Mark at least one session available above to plan with it. Ignoring only affects Charm Plan.</span>
            </div>
        `;
    }

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

        <section class="results-section" aria-labelledby="planEntriesTitle">
            <h3 class="subsection-title" id="planEntriesTitle">Bestiaries You Can Finish</h3>
            <p class="section-copy">
                Charm points are only awarded when an entry is complete, so an entry at partial progress contributes
                nothing. Select a session tag to open that session and adjust its total kills or creature selection.
            </p>
            ${buildEntryList(plan)}
        </section>

        ${buildRoute(plan)}
    `;
}

export function renderCharmPlan(container, planView) {
    container.className = "results-shell";
    container.innerHTML = `
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

        ${buildAvailabilityControl(planView)}

        <div id="charmPlanResult">${buildCharmPlanResultMarkup(planView)}</div>
    `;
}
