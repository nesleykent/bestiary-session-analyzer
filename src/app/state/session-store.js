const STORAGE_KEY = "bestiary-session-analyzer-v4";

export function saveSessionState(state) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadSessionState() {
    const rawState = sessionStorage.getItem(STORAGE_KEY);
    return rawState ? JSON.parse(rawState) : null;
}
