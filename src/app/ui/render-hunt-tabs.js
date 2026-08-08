import { formatCharmsPerHour } from "../utils/formatters.js";

function buildHuntTab(tab, canClose) {
    return `
        <div class="hunt-tab${tab.isActive ? " is-active" : ""}">
            <button
                class="hunt-tab-button"
                type="button"
                data-hunt-select="${tab.id}"
                aria-pressed="${tab.isActive ? "true" : "false"}"
            >
                <span class="hunt-tab-label">${tab.label}</span>
                <span class="hunt-tab-meta">${tab.charmRate === null ? "No analysis" : formatCharmsPerHour(tab.charmRate)}</span>
            </button>
            ${canClose ? `
                <button
                    class="hunt-tab-close"
                    type="button"
                    data-hunt-close="${tab.id}"
                    aria-label="Close ${tab.label}"
                >&times;</button>
            ` : ""}
        </div>
    `;
}

export function renderHuntTabs(container, tabs) {
    const canClose = tabs.length > 1;

    container.innerHTML = `
        ${tabs.map((tab) => buildHuntTab(tab, canClose)).join("")}
        <button class="hunt-tab-add" id="addHuntButton" type="button" aria-label="Add hunt">+</button>
    `;
}
