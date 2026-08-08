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
        view: "hunt"
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

function normalizeHunt(savedHunt) {
    const matchedMonsters = Array.isArray(savedHunt?.matchedMonsters) ? savedHunt.matchedMonsters : [];
    const isTasksMode = savedHunt?.mode === "tasks";

    return {
        ...createHunt(isTasksMode ? "tasks" : "bestiary"),
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

export function restoreWorkspace(savedState) {
    const savedHunts = Array.isArray(savedState?.hunts) ? savedState.hunts : [];

    if (!savedHunts.length) {
        return null;
    }

    const hunts = savedHunts.map(normalizeHunt);
    const savedActiveIndex = savedHunts.findIndex((hunt) => hunt?.id === savedState?.activeHuntId);

    return {
        hunts,
        activeHuntId: hunts[savedActiveIndex === -1 ? 0 : savedActiveIndex].id,
        view: savedState?.view === "comparison" ? "comparison" : "hunt"
    };
}

export function huntHasContent(hunt) {
    return Boolean(hunt.sessionLog.trim() || hunt.matchedMonsters.length || hunt.taskMonsters.length);
}

export function hasBestiaryAnalysis(hunt) {
    return hunt.matchedMonsters.length > 0;
}
