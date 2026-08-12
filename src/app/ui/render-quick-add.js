import { escapeAttribute } from "./render-blocks.js";
import { escapeText } from "./render-tracker.js";

/**
 * Change one value from anywhere, without leaving the page you are on.
 *
 * This is the upkeep path: after the first sitting, most visits change one or two
 * things, and the old answer was to find that row somewhere in a fourteen-page
 * table. Here `/` opens a combobox over every item in every tracker, you set the
 * value, and you land back exactly where you were.
 *
 * Built as the ARIA combobox pattern: the input keeps focus the whole time and
 * `aria-activedescendant` moves the highlight, so the arrow keys never take focus
 * away from what you are typing. Matching is subsequence rather than substring, so
 * "rotw" and "rtwrm" both find Rotworm.
 */

const MAX_RESULTS = 8;

let overlay = null;
let onPick = null;
let onSetValue = null;
let results = [];
let highlighted = 0;
let chosen = null;

/** Subsequence match with a score, so exact prefixes still come first. */
export function matchItems(items, query) {
    const needle = query.trim().toLowerCase();

    if (!needle) {
        return [];
    }

    return items
        .map((item) => {
            const haystack = item.name.toLowerCase();

            if (haystack.startsWith(needle)) {
                return { item, score: 0 };
            }

            const direct = haystack.indexOf(needle);

            if (direct !== -1) {
                return { item, score: 1 + direct / 100 };
            }

            let index = 0;

            for (const character of needle) {
                index = haystack.indexOf(character, index);

                if (index === -1) {
                    return null;
                }

                index += 1;
            }

            return { item, score: 50 };
        })
        .filter(Boolean)
        .sort((left, right) => left.score - right.score || left.item.name.localeCompare(right.item.name))
        .slice(0, MAX_RESULTS)
        .map((entry) => entry.item);
}

function renderResults() {
    const list = overlay.querySelector("#quickAddResults");

    if (!results.length) {
        list.innerHTML = '<li class="quick-empty" role="presentation">No match in any tracker.</li>';
        return;
    }

    list.innerHTML = results.map((item, index) => `
        <li
            id="quickAddOption${index}"
            class="quick-option${index === highlighted ? " is-highlighted" : ""}"
            role="option"
            aria-selected="${index === highlighted ? "true" : "false"}"
        >
            <span class="quick-name">${escapeText(item.name)}</span>
            <span class="quick-tracker">${escapeText(item.trackerLabel)}</span>
            <span class="quick-value">${item.valueLabel}</span>
        </li>
    `).join("");

    overlay.querySelector("#quickAddInput")
        .setAttribute("aria-activedescendant", `quickAddOption${highlighted}`);
}

function renderValueStage() {
    const stage = overlay.querySelector("#quickAddValue");

    if (!chosen) {
        stage.hidden = true;
        stage.innerHTML = "";
        return;
    }

    stage.hidden = false;
    stage.innerHTML = `
        <p class="quick-chosen">
            <strong>${escapeText(chosen.name)}</strong>
            <span class="quick-tracker">${escapeText(chosen.trackerLabel)}</span>
            <span class="quick-current">now ${chosen.valueLabel}</span>
        </p>
        <div class="quick-controls">
            ${chosen.controls.map((control) => `
                <button
                    class="row-action${control.isCurrent ? " is-on" : ""}"
                    type="button"
                    data-quick-set="${escapeAttribute(String(control.value))}"
                    data-quick-field="${escapeAttribute(control.field)}"
                >${escapeText(control.label)}</button>
            `).join("")}
            ${chosen.countField ? `
                <input
                    id="quickAddCount"
                    class="library-search"
                    type="number"
                    min="0"
                    inputmode="numeric"
                    placeholder="exact count"
                    aria-label="Exact count for ${escapeAttribute(chosen.name)}"
                >
            ` : ""}
        </div>
    `;

    stage.querySelectorAll("[data-quick-set]").forEach((button) => {
        button.addEventListener("click", () => {
            onSetValue(chosen, button.dataset.quickField, Number(button.dataset.quickSet));
            close();
        });
    });

    const count = stage.querySelector("#quickAddCount");

    if (count) {
        count.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                onSetValue(chosen, chosen.countField, Number(count.value) || 0);
                close();
            }
        });
        count.focus();
    }
}

function close() {
    if (!overlay) {
        return;
    }

    const returnFocus = overlay.dataset.returnFocus;

    overlay.remove();
    overlay = null;
    chosen = null;
    results = [];

    // Landing back where you were is the point of this flow, so focus goes home.
    if (returnFocus) {
        const target = document.querySelector(returnFocus);

        if (target) {
            target.focus();
        }
    }
}

export function closeQuickAdd() {
    close();
}

export function isQuickAddOpen() {
    return Boolean(overlay);
}

export function openQuickAdd({ items, onSet, returnFocusSelector = "" }) {
    close();

    onSetValue = onSet;
    onPick = null;

    overlay = document.createElement("div");
    overlay.className = "quick-add";
    overlay.dataset.returnFocus = returnFocusSelector;
    overlay.innerHTML = `
        <div class="quick-panel" role="dialog" aria-label="Change one value">
            <input
                id="quickAddInput"
                class="quick-input"
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls="quickAddResults"
                aria-autocomplete="list"
                autocomplete="off"
                placeholder="Type a creature, boss, charm, achievement, quest, title or subarea"
            >
            <ul class="quick-results" id="quickAddResults" role="listbox" aria-label="Matches"></ul>
            <div class="quick-value-stage" id="quickAddValue" hidden></div>
            <p class="quick-hint">Enter to pick &middot; Esc to close &middot; nothing is saved until you set a value</p>
        </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector("#quickAddInput");

    input.addEventListener("input", () => {
        chosen = null;
        results = matchItems(items, input.value);
        highlighted = 0;
        renderResults();
        renderValueStage();
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            close();
            return;
        }

        if (!results.length) {
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            highlighted = Math.min(results.length - 1, highlighted + 1);
            renderResults();
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            highlighted = Math.max(0, highlighted - 1);
            renderResults();
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            chosen = results[highlighted];
            renderValueStage();
        }
    });

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            close();
        }

        const option = event.target.closest(".quick-option");

        if (option) {
            highlighted = [...overlay.querySelectorAll(".quick-option")].indexOf(option);
            chosen = results[highlighted];
            renderValueStage();
        }
    });

    input.focus();
    renderResults();
}
