import { formatCharmsPerHour } from "../utils/formatters.js";

function buildTabButton(selectAttribute, tab) {
    return `
        <button
            class="hunt-tab-button"
            type="button"
            ${selectAttribute}
            aria-pressed="${tab.isActive ? "true" : "false"}"
        >
            <span class="hunt-tab-label">${tab.label}</span>
            <span class="hunt-tab-meta">${tab.charmRate === null ? "No analysis" : formatCharmsPerHour(tab.charmRate)}</span>
        </button>
    `;
}

function buildHuntTab(tab, canClose) {
    return `
        <div class="hunt-tab${tab.isActive ? " is-active" : ""}">
            ${buildTabButton(`data-hunt-select="${tab.id}"`, tab)}
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

export function renderHuntTabs(container, allTabsTab, huntTabs) {
    const canClose = huntTabs.length > 1;

    container.innerHTML = `
        <div class="hunt-tab hunt-tab-all${allTabsTab.isActive ? " is-active" : ""}">
            ${buildTabButton('data-all-tabs-select="true"', allTabsTab)}
        </div>
        ${huntTabs.map((tab) => buildHuntTab(tab, canClose)).join("")}
        <button class="hunt-tab-add" id="addHuntButton" type="button" aria-label="Add hunt">+</button>
    `;
}
