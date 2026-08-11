/**
 * The player's Bestiary progress — user data, kept strictly apart from the game
 * data in bestiary.json.
 *
 * Only four facts per creature are stored, mirroring what TibiaDraptor tracks:
 * kills, and the Echo Warden / Animus Mastery / bookmark flags. Stage, status,
 * kills remaining, progress and charm points are all *derived* from those plus
 * game data, never stored — so a game-data change (new stage thresholds) is
 * picked up automatically instead of going stale in a saved file.
 *
 * Creatures at their defaults are absent from the record rather than stored as
 * zeroes. For a real account that is a few hundred entries instead of 833.
 */

export const EMPTY_PROGRESS_ENTRY = Object.freeze({
    kills: 0,
    echoWarden: false,
    animusMastery: false,
    bookmark: false
});

export const PROGRESS_FLAGS = ["echoWarden", "animusMastery", "bookmark"];

export const PROGRESS_STATUSES = ["notStarted", "inProgress", "done"];

export const PROGRESS_STATUS_LABELS = {
    notStarted: "Not Started",
    inProgress: "In Progress",
    done: "Done"
};

function toKills(value) {
    const kills = Math.floor(Number(value));

    return Number.isFinite(kills) && kills > 0 ? kills : 0;
}

export function normalizeProgressEntry(entry) {
    return {
        kills: toKills(entry?.kills),
        echoWarden: Boolean(entry?.echoWarden),
        animusMastery: Boolean(entry?.animusMastery),
        bookmark: Boolean(entry?.bookmark)
    };
}

function isDefaultEntry(entry) {
    return entry.kills === 0
        && !entry.echoWarden
        && !entry.animusMastery
        && !entry.bookmark;
}

export function createProgress() {
    return {};
}

export function restoreProgress(saved) {
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
        return createProgress();
    }

    return Object.entries(saved).reduce((progress, [name, entry]) => {
        if (typeof name !== "string" || !name.trim()) {
            return progress;
        }

        const normalized = normalizeProgressEntry(entry);

        if (!isDefaultEntry(normalized)) {
            progress[name] = normalized;
        }

        return progress;
    }, createProgress());
}

export function getProgressEntry(progress, creatureName) {
    return progress[creatureName] ?? EMPTY_PROGRESS_ENTRY;
}

export function getProgressKills(progress, creatureName) {
    return getProgressEntry(progress, creatureName).kills;
}

/**
 * Writes are in place and drop entries that fall back to their defaults, so the
 * record never accumulates rows of zeroes.
 */
export function setProgressEntry(progress, creatureName, changes) {
    const next = normalizeProgressEntry({ ...getProgressEntry(progress, creatureName), ...changes });

    if (isDefaultEntry(next)) {
        delete progress[creatureName];
        return progress;
    }

    progress[creatureName] = next;

    return progress;
}

export function setProgressKills(progress, creatureName, kills) {
    return setProgressEntry(progress, creatureName, { kills: toKills(kills) });
}

export function toggleProgressFlag(progress, creatureName, flag) {
    if (!PROGRESS_FLAGS.includes(flag)) {
        return progress;
    }

    return setProgressEntry(progress, creatureName, {
        [flag]: !getProgressEntry(progress, creatureName)[flag]
    });
}

export function buildTotalKillsByName(progress, creatureNames) {
    return creatureNames.reduce((totals, creatureName) => {
        totals[creatureName] = getProgressKills(progress, creatureName);
        return totals;
    }, {});
}

/**
 * Everything a row needs, derived. `stage` counts the unlock thresholds already
 * passed (0-3), matching the Bestiary's three stages.
 */
export function deriveCreatureProgress(creature, entry) {
    const kills = entry.kills;
    const unlockTarget = Number(creature["Kills to Unlock"]) || 0;
    const firstStage = Number(creature["Stage 1"]) || 0;
    const secondStage = Number(creature["Stage 2"]) || 0;
    const charms = Number(creature.Charms) || 0;
    const isComplete = unlockTarget > 0 && kills >= unlockTarget;

    return {
        kills,
        unlockTarget,
        isComplete,
        stage: isComplete ? 3 : (kills >= secondStage ? 2 : (kills >= firstStage && kills > 0 ? 1 : 0)),
        status: isComplete ? "done" : (kills > 0 ? "inProgress" : "notStarted"),
        killsLeft: Math.max(0, unlockTarget - kills),
        progress: unlockTarget > 0 ? Math.min(1, kills / unlockTarget) : 0,
        charms,
        charmsEarned: isComplete ? charms : 0,
        charmsUnclaimed: isComplete ? 0 : charms,
        echoWardenEligible: creature.echoWarden.eligible,
        echoWardenPoints: creature.echoWarden.eligible ? creature.echoWarden.points : 0,
        echoWardenClaimed: creature.echoWarden.eligible && entry.echoWarden,
        animusMastery: entry.animusMastery,
        bookmark: entry.bookmark
    };
}

/**
 * Three independent totals, the way TibiaDraptor reports them: charm points,
 * the separate Echo Warden pool, and completion. Echo Warden points are never
 * folded into charm points.
 */
export function summarizeProgress(creatures, progress) {
    return creatures.reduce((totals, creature) => {
        const derived = deriveCreatureProgress(creature, getProgressEntry(progress, creature.Name));

        totals.charmPointsTotal += derived.charms;
        totals.charmPointsEarned += derived.charmsEarned;
        totals.echoWardenTotal += derived.echoWardenPoints;
        totals.echoWardenEarned += derived.echoWardenClaimed ? derived.echoWardenPoints : 0;
        totals.creatureTotal += 1;
        totals.completed += derived.isComplete ? 1 : 0;
        totals.inProgress += derived.status === "inProgress" ? 1 : 0;
        totals.notStarted += derived.status === "notStarted" ? 1 : 0;
        totals.killsLeft += derived.killsLeft;

        return totals;
    }, {
        charmPointsTotal: 0,
        charmPointsEarned: 0,
        echoWardenTotal: 0,
        echoWardenEarned: 0,
        creatureTotal: 0,
        completed: 0,
        inProgress: 0,
        notStarted: 0,
        killsLeft: 0
    });
}
