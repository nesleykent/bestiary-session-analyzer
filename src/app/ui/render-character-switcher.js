import { escapeAttribute } from "./render-blocks.js";

function buildRow(character, index, label, isActive, canDelete) {
    return `
        <div class="character-row${isActive ? " is-active" : ""}" data-character-row="${escapeAttribute(character.id)}">
            <button
                class="sidebar-link character-select${isActive ? " is-selected" : ""}"
                type="button"
                data-character-select="${escapeAttribute(character.id)}"
                aria-current="${isActive ? "page" : "false"}"
            >
                <span class="material-symbols-outlined" aria-hidden="true">person</span>
                <span data-character-label="${escapeAttribute(character.id)}">${escapeAttribute(label)}</span>
            </button>
            <div class="character-edit-row">
                <input
                    class="library-name character-name"
                    type="text"
                    data-character-name="${escapeAttribute(character.id)}"
                    value="${escapeAttribute(character.name)}"
                    placeholder="${escapeAttribute(label)}"
                    aria-label="Rename ${escapeAttribute(label)}"
                >
                <button
                    class="row-action is-danger"
                    type="button"
                    data-character-delete="${escapeAttribute(character.id)}"
                    aria-label="Delete ${escapeAttribute(label)}"
                    ${canDelete ? "" : "disabled"}
                >Delete</button>
            </div>
        </div>
    `;
}

export function renderCharacterSwitcher(container, characters, activeCharacterId, getLabel) {
    const canDelete = characters.length > 1;

    container.innerHTML = characters
        .map((character, index) => buildRow(
            character,
            index,
            getLabel(index, character),
            character.id === activeCharacterId,
            canDelete
        ))
        .join("");
}

/**
 * A targeted patch for the label and delete-button state after a rename or a
 * roster change that does not require rebuilding every row, mirroring
 * syncHuntTabLabel in main.js — a full re-render would drop focus/caret out of
 * the rename field mid-keystroke.
 */
export function syncCharacterLabel(container, characterId, label) {
    const labelNode = container.querySelector(`[data-character-label="${characterId}"]`);

    if (labelNode) {
        labelNode.textContent = label;
    }

    const nameInput = container.querySelector(`[data-character-name="${characterId}"]`);

    if (nameInput) {
        nameInput.placeholder = label;
    }
}
