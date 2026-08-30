import { escapeText } from "./render-tracker.js";

const TRACKER_ICONS = {
    bestiary: "pets",
    bosstiary: "skull",
    charms: "auto_awesome",
    achievements: "trophy",
    quests: "account_tree",
    titles: "workspace_premium",
    measuringTibia: "straighten"
};

/**
 * Every card reads straight off the tracker's own totals() — the same
 * function that drives that tracker's own page header — so the dashboard
 * cannot disagree with the page it summarizes.
 */
function buildCard({ tracker, totals }) {
    const { answer, stats } = totals;
    const hasProgress = typeof answer.progress === "number";

    return `
        <button class="dashboard-card" type="button" data-dashboard-tracker="${escapeText(tracker.id)}">
            <div class="dashboard-card-head">
                <span class="material-symbols-outlined" aria-hidden="true">${TRACKER_ICONS[tracker.id] ?? "checklist"}</span>
                <span class="dashboard-card-title">${escapeText(tracker.label)}</span>
            </div>
            ${answer.label ? `<div class="dashboard-card-eyebrow">${escapeText(answer.label)}</div>` : ""}
            <div class="dashboard-card-figure">${escapeText(answer.value)}</div>
            ${hasProgress ? `
                <div class="dashboard-card-progress">
                    <span style="width: ${Math.max(0, Math.min(1, answer.progress)) * 100}%"></span>
                </div>
            ` : ""}
            ${answer.note ? `<div class="dashboard-card-note">${answer.note}</div>` : ""}
            <ul class="dashboard-card-stats">
                ${stats.map((stat) => `<li>${stat}</li>`).join("")}
            </ul>
        </button>
    `;
}

export function renderDashboard(container, cards) {
    container.className = "dashboard-grid";
    container.innerHTML = cards.map(buildCard).join("");
}
