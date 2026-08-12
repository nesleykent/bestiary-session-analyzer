import { escapeAttribute } from "./render-blocks.js";

/**
 * The interactive controls, as standalone markup.
 *
 * They used to be table cells, which is why they were sized for a spreadsheet: five
 * 30px buttons repeated down 60 rows put 300 tap targets on one screen. Freed from
 * the table they can be the size they should have been, and the same control now
 * serves a card, a compact tile, and the quick-add panel without being rebuilt.
 *
 * The generic controller binds on these data attributes, so this module is the only
 * place allowed to emit them.
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
 * Third-party prose that contains markup, rendered as readable text: the achievement
 * spoilers carry real anchors, and the reader wants the sentence, not the element.
 * Tags are dropped, link text kept, and the result escaped regardless.
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

/**
 * The client's own states as one control. Full width of its container, so on a card
 * each option is a comfortable target rather than a 30px sliver.
 */
export function stageControl(row, field, stages, options = {}) {
    const { label = "", size = "" } = options;
    const current = row[field] ?? 0;

    return `
        <div
            class="stages${size ? ` is-${size}` : ""}"
            role="radiogroup"
            aria-label="${escapeAttribute(label || field)} for ${escapeAttribute(row.name)}"
        >
            ${stages.map((stage) => `
                <button
                    class="stage${current === stage.value ? " is-on" : ""}"
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
    `;
}

/**
 * Yes / not yet, as two explicit choices rather than a box you have to interpret.
 * An untouched item shows neither selected, which is what "not recorded" looks like —
 * an empty checkbox would be a claim that you do not have it.
 */
export function tickControl(row, field, options = {}) {
    const { yesLabel = "Yes", noLabel = "No", locked = false, title = "" } = options;

    if (locked) {
        return `
            <div class="ticks is-locked" title="${escapeAttribute(title)}">
                <span class="tick-option is-on">
                    <span class="material-symbols-outlined" aria-hidden="true">lock</span>
                    ${escapeText(yesLabel)}
                </span>
            </div>
        `;
    }

    const isYes = Boolean(row[field]);
    const isNo = row.known && !isYes;

    return `
        <div class="ticks" role="radiogroup" aria-label="${escapeAttribute(field)} for ${escapeAttribute(row.name)}">
            <button
                class="tick-option${isYes ? " is-on" : ""}"
                type="button"
                role="radio"
                aria-checked="${isYes ? "true" : "false"}"
                data-tracker-item="${escapeAttribute(row.key)}"
                data-tracker-set="${escapeAttribute(field)}"
                data-tracker-set-value="1"
            >${escapeText(yesLabel)}</button>
            <button
                class="tick-option${isNo ? " is-on" : ""}"
                type="button"
                role="radio"
                aria-checked="${isNo ? "true" : "false"}"
                data-tracker-item="${escapeAttribute(row.key)}"
                data-tracker-set="${escapeAttribute(field)}"
                data-tracker-set-value="0"
            >${escapeText(noLabel)}</button>
        </div>
    `;
}

/** The optional exact number, for when the player has one. */
export function countControl(row, field, options = {}) {
    const { suffix = "", placeholder = "0", title = "", valueField = field } = options;

    return `
        <label class="count">
            <input
                class="tracker-count"
                type="number"
                min="0"
                inputmode="numeric"
                data-tracker-item="${escapeAttribute(row.key)}"
                data-tracker-field="${escapeAttribute(field)}"
                value="${row[valueField] || ""}"
                placeholder="${escapeAttribute(placeholder)}"
                title="${escapeAttribute(title)}"
                aria-label="Exact ${escapeAttribute(field)} for ${escapeAttribute(row.name)}"
            >
            ${suffix ? `<span class="count-suffix">${escapeText(suffix)}</span>` : ""}
        </label>
    `;
}

export function bookmarkControl(row, field = "bookmark") {
    const isBookmarked = Boolean(row[field]);

    return `
        <button
            class="bookmark-toggle${isBookmarked ? " is-on" : ""}"
            type="button"
            data-tracker-item="${escapeAttribute(row.key)}"
            data-tracker-flag="${escapeAttribute(field)}"
            aria-pressed="${isBookmarked ? "true" : "false"}"
            title="${isBookmarked ? "Remove bookmark" : "Add bookmark"}"
            aria-label="${isBookmarked ? "Remove bookmark from" : "Bookmark"} ${escapeAttribute(row.name)}"
        >
            <span class="material-symbols-outlined" aria-hidden="true">${isBookmarked ? "bookmark" : "bookmark_border"}</span>
        </button>
    `;
}

/** A secondary claim shown as a chip: Echo Warden points, Animus Mastery. */
export function chipControl(row, field, options = {}) {
    const { label = "", eligible = true, title = "" } = options;

    if (!eligible) {
        return "";
    }

    return `
        <button
            class="chip-toggle${row[field] ? " is-on" : ""}"
            type="button"
            data-tracker-item="${escapeAttribute(row.key)}"
            data-tracker-flag="${escapeAttribute(field)}"
            aria-pressed="${row[field] ? "true" : "false"}"
            title="${escapeAttribute(title || field)}"
        >${escapeText(label)}</button>
    `;
}

export function selectControl(row, isSelected) {
    return `
        <label class="card-select">
            <input
                type="checkbox"
                data-tracker-select="${escapeAttribute(row.key)}"
                ${isSelected ? "checked" : ""}
                aria-label="Select ${escapeAttribute(row.name)}"
            >
        </label>
    `;
}
