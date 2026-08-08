let huntSequence = 0;

function nextHuntId() {
    huntSequence += 1;
    return `hunt-${huntSequence}`;
}

export function createHunt(mode = "bestiary") {
    return {
        id: nextHuntId(),
        mode,
        processedMode: "",
        sessionLog: "",
        sessionDuration: 0,
        matchedMonsters: [],
        selectedBestiaryMonsterNames: [],
        taskMonsters: [],
        selectedTaskMonsterName: "",
        taskTotalKills: ""
    };
}

export function createWorkspace() {
    const hunt = createHunt();

    return {
        hunts: [hunt],
        activeHuntId: hunt.id,
        view: "hunt",
        excludedAllTabsEntries: [],
        playTimeInput: ""
    };
}

export function getHuntLabel(index) {
    return `Hunt ${index + 1}`;
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
        ...createHunt(hunt.mode),
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
    const isTasksMode = savedHunt?.mode === "tasks";
    const hunt = createHunt(isTasksMode ? "tasks" : "bestiary");

    return {
        ...hunt,
        id: adoptSavedHuntId(savedHunt?.id, hunt.id, adoptedIds),
        processedMode: savedHunt?.processedMode === "bestiary" || savedHunt?.processedMode === "tasks"
            ? savedHunt.processedMode
            : "",
        sessionLog: typeof savedHunt?.sessionLog === "string" ? savedHunt.sessionLog : "",
        sessionDuration: Number(savedHunt?.sessionDuration) || 0,
        matchedMonsters,
        selectedBestiaryMonsterNames: Array.isArray(savedHunt?.selectedBestiaryMonsterNames)
            ? savedHunt.selectedBestiaryMonsterNames
            : matchedMonsters.map((monster) => monster.name),
        taskMonsters: Array.isArray(savedHunt?.taskMonsters) ? savedHunt.taskMonsters : [],
        selectedTaskMonsterName: savedHunt?.selectedTaskMonsterName || "",
        taskTotalKills: savedHunt?.taskTotalKills ?? ""
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

    const savedView = savedState?.view;

    return {
        hunts,
        activeHuntId: hunts[savedActiveIndex === -1 ? 0 : savedActiveIndex].id,
        view: savedView === "comparison" || savedView === "allTabs" ? savedView : "hunt",
        excludedAllTabsEntries: savedExcludedEntries,
        playTimeInput: typeof savedState?.playTimeInput === "string" ? savedState.playTimeInput : ""
    };
}

export function huntHasContent(hunt) {
    return Boolean(hunt.sessionLog.trim() || hunt.matchedMonsters.length || hunt.taskMonsters.length);
}

export function hasBestiaryAnalysis(hunt) {
    return hunt.matchedMonsters.length > 0;
}
