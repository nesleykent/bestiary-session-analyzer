let huntSequence = 0;

const VIEWS = ["hunt", "allTabs", "charmPlan", "comparison"];

function nextHuntId() {
    huntSequence += 1;
    return `hunt-${huntSequence}`;
}

export function createHunt() {
    return {
        id: nextHuntId(),
        sessionLog: "",
        sessionDuration: 0,
        hasProcessedLog: false,
        matchedMonsters: [],
        selectedBestiaryMonsterNames: []
    };
}

export function createTaskSession() {
    return {
        sessionLog: "",
        sessionDuration: 0,
        hasProcessedLog: false,
        monsters: [],
        selectedMonsterName: "",
        totalKills: ""
    };
}

export function createWorkspace() {
    const hunt = createHunt();

    return {
        mode: "bestiary",
        hunts: [hunt],
        activeHuntId: hunt.id,
        view: "hunt",
        excludedAllTabsEntries: [],
        playTimeInput: "",
        taskSession: createTaskSession()
    };
}

export function getHuntLabel(index) {
    return `Session ${index + 1}`;
}

export function addHunt(hunts) {
    const hunt = createHunt();

    return {
        hunt,
        hunts: [...hunts, hunt]
    };
}

export function resetHunt(hunt) {
    return {
        ...createHunt(),
        id: hunt.id
    };
}

export function removeHunt(hunts, huntId, activeHuntId) {
    const removedIndex = hunts.findIndex((hunt) => hunt.id === huntId);

    if (hunts.length < 2 || removedIndex === -1) {
        return { hunts, activeHuntId };
    }

    const remainingHunts = hunts.filter((hunt) => hunt.id !== huntId);

    if (huntId !== activeHuntId) {
        return { hunts: remainingHunts, activeHuntId };
    }

    const nextIndex = Math.min(removedIndex, remainingHunts.length - 1);

    return {
        hunts: remainingHunts,
        activeHuntId: remainingHunts[nextIndex].id
    };
}

function adoptSavedHuntId(savedId, generatedId, adoptedIds) {
    const trimmedSavedId = typeof savedId === "string" ? savedId.trim() : "";
    const id = trimmedSavedId && !adoptedIds.has(trimmedSavedId) ? trimmedSavedId : generatedId;

    adoptedIds.add(id);

    return id;
}

function normalizeHunt(savedHunt, adoptedIds) {
    const matchedMonsters = Array.isArray(savedHunt?.matchedMonsters) ? savedHunt.matchedMonsters : [];
    const hunt = createHunt();

    return {
        ...hunt,
        id: adoptSavedHuntId(savedHunt?.id, hunt.id, adoptedIds),
        sessionLog: typeof savedHunt?.sessionLog === "string" ? savedHunt.sessionLog : "",
        sessionDuration: Number(savedHunt?.sessionDuration) || 0,
        hasProcessedLog: Boolean(savedHunt?.hasProcessedLog),
        matchedMonsters,
        selectedBestiaryMonsterNames: Array.isArray(savedHunt?.selectedBestiaryMonsterNames)
            ? savedHunt.selectedBestiaryMonsterNames
            : matchedMonsters.map((monster) => monster.name)
    };
}

function normalizeTaskSession(savedTaskSession) {
    const monsters = Array.isArray(savedTaskSession?.monsters) ? savedTaskSession.monsters : [];

    return {
        ...createTaskSession(),
        sessionLog: typeof savedTaskSession?.sessionLog === "string" ? savedTaskSession.sessionLog : "",
        sessionDuration: Number(savedTaskSession?.sessionDuration) || 0,
        hasProcessedLog: Boolean(savedTaskSession?.hasProcessedLog),
        monsters,
        selectedMonsterName: savedTaskSession?.selectedMonsterName || "",
        totalKills: savedTaskSession?.totalKills ?? ""
    };
}

function reserveSavedHuntIds(savedHunts) {
    savedHunts.forEach((savedHunt) => {
        const savedSequence = Number.parseInt(String(savedHunt?.id).replace("hunt-", ""), 10);

        if (Number.isFinite(savedSequence) && savedSequence > huntSequence) {
            huntSequence = savedSequence;
        }
    });
}

export function restoreWorkspace(savedState) {
    const savedHunts = Array.isArray(savedState?.hunts) ? savedState.hunts : [];

    if (!savedHunts.length) {
        return null;
    }

    reserveSavedHuntIds(savedHunts);

    const adoptedIds = new Set();
    const hunts = savedHunts.map((savedHunt) => normalizeHunt(savedHunt, adoptedIds));
    const savedActiveIndex = savedHunts.findIndex((hunt) => hunt?.id === savedState?.activeHuntId);
    const savedExcludedEntries = Array.isArray(savedState?.excludedAllTabsEntries)
        ? savedState.excludedAllTabsEntries.filter((entryKey) => typeof entryKey === "string")
        : [];

    return {
        mode: savedState?.mode === "tasks" ? "tasks" : "bestiary",
        hunts,
        activeHuntId: hunts[savedActiveIndex === -1 ? 0 : savedActiveIndex].id,
        view: VIEWS.includes(savedState?.view) ? savedState.view : "hunt",
        excludedAllTabsEntries: savedExcludedEntries,
        playTimeInput: typeof savedState?.playTimeInput === "string" ? savedState.playTimeInput : "",
        taskSession: normalizeTaskSession(savedState?.taskSession)
    };
}

export function huntHasContent(hunt) {
    return Boolean(hunt.sessionLog.trim() || hunt.matchedMonsters.length);
}

export function hasBestiaryAnalysis(hunt) {
    return hunt.matchedMonsters.length > 0;
}
