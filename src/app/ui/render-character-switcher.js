import { escapeAttribute } from "./render-blocks.js";

/**
 * A stable hue per character id (not name, so renaming never reshuffles
 * colors) gives each row a distinct identity mark at a glance, in place of
 * the generic person icon every row used to share.
 */
function avatarHue(characterId) {
    let hash = 0;
    for (const char of String(characterId)) {
        hash = (hash * 31 + char.codePointAt(0)) % 360;
    }
    return hash;
}

function avatarInitial(label) {
    const trimmed = label.trim();
    return trimmed ? Array.from(trimmed)[0].toUpperCase() : "?";
}

function buildDisplayRow(character, label, isActive, canDelete) {
    const hue = avatarHue(character.id);

    return `
        <div class="app-nav-switcher-row${isActive ? " is-active" : ""}" data-character-row="${escapeAttribute(character.id)}">
            <button
                class="app-nav-switcher-select"
                type="button"
                data-character-select="${escapeAttribute(character.id)}"
                aria-current="${isActive ? "page" : "false"}"
            >
                <span class="app-nav-avatar" aria-hidden="true" style="background: hsl(${hue} 55% 45%)">${escapeAttribute(avatarInitial(label))}</span>
                <span data-character-label="${escapeAttribute(character.id)}">${escapeAttribute(label)}</span>
            </button>
            <button
                class="icon-button app-nav-switcher-action"
                type="button"
                data-character-rename="${escapeAttribute(character.id)}"
                aria-label="Rename ${escapeAttribute(label)}"
            ><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>
            <button
                class="icon-button app-nav-switcher-action is-danger"
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
        <div class="app-nav-switcher-row is-editing" data-character-row="${escapeAttribute(character.id)}">
            <input
                class="app-nav-switcher-input"
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
