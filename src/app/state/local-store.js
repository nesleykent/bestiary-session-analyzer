const STORAGE_KEY = "bestiary-session-analyzer-v6";
const LEGACY_SESSION_KEY = "bestiary-session-analyzer-v5";

/**
 * Workspace persistence.
 *
 * This deliberately uses localStorage rather than sessionStorage: the workspace
 * now holds a Bestiary progress record and a session archive, and losing either
 * one because a tab was closed would make the app useless as a manager.
 *
 * Every access is guarded. Storage throws rather than returning null when it is
 * disabled (Safari private browsing) or full, and a corrupt value must degrade
 * to "no saved workspace" instead of breaking the whole app on boot.
 */

function readRaw(storage, key) {
    try {
        return storage.getItem(key);
    } catch (error) {
        return null;
    }
}

function migrateLegacyState() {
    const legacyRaw = readRaw(sessionStorage, LEGACY_SESSION_KEY);

    if (!legacyRaw) {
        return null;
    }

    try {
        localStorage.setItem(STORAGE_KEY, legacyRaw);
        sessionStorage.removeItem(LEGACY_SESSION_KEY);
    } catch (error) {
        // Migration is best effort; the parsed value below is still returned.
    }

    return legacyRaw;
}

export function saveWorkspaceState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
    } catch (error) {
        return false;
    }
}

export function loadWorkspaceState() {
    const rawState = readRaw(localStorage, STORAGE_KEY) ?? migrateLegacyState();

    if (!rawState) {
        return null;
    }

    try {
        return JSON.parse(rawState);
    } catch (error) {
        return null;
    }
}
