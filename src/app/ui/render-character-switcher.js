import { escapeAttribute } from "./render-blocks.js";

function buildDisplayRow(character, label, isActive, canDelete) {
    return `
        <div class="character-row${isActive ? " is-active" : ""}" data-character-row="${escapeAttribute(character.id)}">
            <button
                class="character-row-select"
                type="button"
                data-character-select="${escapeAttribute(character.id)}"
                aria-current="${isActive ? "page" : "false"}"
            >
                <span class="material-symbols-outlined" aria-hidden="true">person</span>
                <span data-character-label="${escapeAttribute(character.id)}">${escapeAttribute(label)}</span>
            </button>
            <button
                class="icon-button character-row-action"
                type="button"
                data-character-rename="${escapeAttribute(character.id)}"
                aria-label="Rename ${escapeAttribute(label)}"
            ><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>
            <button
                class="icon-button character-row-action is-danger"
                type="button"
                data-character-delete="${escapeAttribute(character.id)}"
                aria-label="Delete ${escapeAttribute(label)}"
                ${canDelete ? "" : "disabled"}
            ><span class="material-symbols-outlined" aria-hidden="true">delete</span></button>
        </div>
    `;
}

/**
 * No explicit "done" control — Enter or clicking away both blur the field,
 * which is what commits and closes it, the same mental model as renaming a
 * file in a desktop file browser.
 */
function buildEditingRow(character, label) {
    return `
        <div class="character-row is-editing" data-character-row="${escapeAttribute(character.id)}">
            <input
                class="character-row-input"
                type="text"
                data-character-name="${escapeAttribute(character.id)}"
                value="${escapeAttribute(character.name)}"
                placeholder="${escapeAttribute(label)}"
                aria-label="Rename ${escapeAttribute(label)}"
            >
        </div>
    `;
}

/**
 * At most one row is ever in edit mode at a time (editingCharacterId), so
 * renaming reads as "click to edit this one row" rather than every character
 * carrying its own permanently-open text field.
 */
export function renderCharacterSwitcher(container, characters, activeCharacterId, editingCharacterId, getLabel) {
    const canDelete = characters.length > 1;

    container.innerHTML = characters
        .map((character, index) => {
            const label = getLabel(index, character);

            return character.id === editingCharacterId
                ? buildEditingRow(character, label)
                : buildDisplayRow(character, label, character.id === activeCharacterId, canDelete);
        })
        .join("");
}

export function focusCharacterNameInput(container, characterId) {
    const input = container.querySelector(`[data-character-name="${characterId}"]`);

    input?.focus();
    input?.select();
}
