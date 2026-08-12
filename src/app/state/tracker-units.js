/**
 * Which bounded pieces of a tracker the player has actually read.
 *
 *   { [trackerId]: { [unitKey]: { recordedAt, entered } } }
 *
 * This exists because a confirmed zero cannot be stored per item: setEntry drops
 * any entry that equals its defaults, and that sparse invariant is worth keeping
 * — a real account is a few hundred rows, not thousands. So the confirmation
 * lives one level up, on the unit the player transcribed.
 *
 * The three states a row can be in fall out of two facts:
 *
 *   entry present            -> answered
 *   no entry, unit recorded  -> a real zero, because the client screen showed it
 *   no entry, unit not read  -> unknown, and reported as unknown
 *
 * A unit key is whatever the tracker groups by — a Bestiary class, an achievement
 * category, a map area. Unknown tracker ids and malformed records are discarded on
 * restore, the same way tracker progress is.
 */

export function createTrackerUnits() {
    return {};
}

export function getRecordedUnits(units, trackerId) {
    return units[trackerId] ?? {};
}

export function isUnitRecorded(units, trackerId, unitKey) {
    return Boolean(unitKey) && Boolean(getRecordedUnits(units, trackerId)[unitKey]);
}

export function getRecordedUnitKeys(units, trackerId) {
    return new Set(Object.keys(getRecordedUnits(units, trackerId)));
}

export function countRecordedUnits(units, trackerId) {
    return Object.keys(getRecordedUnits(units, trackerId)).length;
}

export function recordUnit(units, trackerId, unitKey, entered, recordedAt) {
    if (!unitKey) {
        return units;
    }

    const record = units[trackerId] ?? (units[trackerId] = {});

    record[unitKey] = {
        recordedAt: recordedAt ?? new Date().toISOString(),
        entered: Number(entered) || 0
    };

    return units;
}

export function unrecordUnit(units, trackerId, unitKey) {
    const record = units[trackerId];

    if (!record) {
        return units;
    }

    delete record[unitKey];

    if (!Object.keys(record).length) {
        delete units[trackerId];
    }

    return units;
}

export function restoreTrackerUnits(saved, trackerIds) {
    const units = createTrackerUnits();

    if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
        return units;
    }

    trackerIds.forEach((trackerId) => {
        const record = saved[trackerId];

        if (!record || typeof record !== "object" || Array.isArray(record)) {
            return;
        }

        Object.entries(record).forEach(([unitKey, value]) => {
            if (typeof unitKey !== "string" || !unitKey.trim() || !value || typeof value !== "object") {
                return;
            }

            const recordedAt = typeof value.recordedAt === "string" ? value.recordedAt : "";

            if (!recordedAt) {
                return;
            }

            recordUnit(units, trackerId, unitKey, value.entered, recordedAt);
        });
    });

    return units;
}
