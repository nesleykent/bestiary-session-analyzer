import { formatNumber, formatTime } from "../utils/formatters.js";

function escapeAttribute(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function buildPlanModeSwitch(planView) {
    const modes = [
        { key: "regular", label: "Regular" },
        { key: "rapid", label: "Rapid Respawn" }
    ];

    return `
        <div class="plan-mode-block">
            <span class="input-label" id="planRespawnModeLabel">Plan For Respawn Mode</span>
            <div class="segmented" role="group" aria-labelledby="planRespawnModeLabel">
                ${modes.map((mode) => `
                    <button
                        class="segmented-button${planView.planRespawnMode === mode.key ? " is-selected" : ""}"
                        type="button"
                        data-plan-respawn-mode="${mode.key}"
                        aria-pressed="${planView.planRespawnMode === mode.key ? "true" : "false"}"
                    >${mode.label}</button>
                `).join("")}
            </div>
            <p class="helper-text">
                The environment you are planning for. Only sessions recorded in this respawn mode are used, and their
                recorded numbers are never converted between modes.
            </p>
        </div>
    `;
}

function buildConsideredSession(session) {
    const isEligible = session.isAvailable && session.matchesPlanMode;
    const status = !session.matchesPlanMode
        ? "Wrong respawn mode"
        : (session.isAvailable ? "Available" : "Spawn unavailable");

    return `
        <li class="plan-session${isEligible ? " is-eligible" : ""}">
            <span class="plan-session-name">${session.label}</span>
            <span class="plan-session-mode">${session.respawnModeLabel}</span>
            <span class="plan-session-status">${status}</span>
            <button
                class="plan-session-toggle"
                type="button"
                data-plan-availability="${session.id}"
                aria-pressed="${session.isAvailable ? "true" : "false"}"
            >${session.isAvailable ? "Ignore" : "Enable"}</button>
        </li>
    `;
}

function buildConsideredSessions(planView) {
    if (!planView.consideredSessions.length) {
        return "";
    }

    return `
        <div class="plan-sessions-block">
            <span class="input-label" id="planSessionsLabel">Sessions Considered</span>
            <ul class="plan-sessions" role="list" aria-labelledby="planSessionsLabel">
                ${planView.consideredSessions.map(buildConsideredSession).join("")}
            </ul>
            <p class="helper-text">
                A session is used only when it is available and recorded in the respawn mode above. Ignore one while its
                spawn is taken; that affects Charm Plan alone, and the session keeps its own analysis, its rows in All
                Sessions, and its ranking in Compare Sessions.
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

    if (!planView.hasModeMatchedHunts) {
        return `
            <div class="empty-state">
                <strong>No ${planView.planRespawnModeLabel} sessions.</strong>
                <span>Switch the plan above to the mode you are hunting in, or set a session's recorded respawn mode in its own tab.</span>
            </div>
        `;
    }

    if (!planView.hasEligibleHunts) {
        return `
            <div class="empty-state">
                <strong>Every ${planView.planRespawnModeLabel} session is ignored.</strong>
                <span>Enable at least one session above to plan with it. Ignoring only affects Charm Plan.</span>
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

        ${buildPlanModeSwitch(planView)}

        ${buildConsideredSessions(planView)}

        <div id="charmPlanResult">${buildCharmPlanResultMarkup(planView)}</div>
    `;
}
