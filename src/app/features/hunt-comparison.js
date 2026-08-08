function toComparisonRow(entry) {
    return {
        id: entry.id,
        label: entry.label,
        totalCharms: entry.summary.totalCharms,
        maxTimeRemainingMinutes: entry.summary.maxTimeRemainingMinutes,
        totalCharmsPerHour: entry.summary.totalCharmsPerHour,
        isBest: false
    };
}

function isBetterHunt(candidate, currentBest) {
    if (candidate.totalCharmsPerHour <= 0) {
        return false;
    }

    if (!currentBest) {
        return true;
    }

    if (candidate.totalCharmsPerHour !== currentBest.totalCharmsPerHour) {
        return candidate.totalCharmsPerHour > currentBest.totalCharmsPerHour;
    }

    return candidate.totalCharms > currentBest.totalCharms;
}

export function buildHuntComparison(entries) {
    const rows = entries.filter((entry) => Boolean(entry.summary)).map(toComparisonRow);
    const pendingLabels = entries.filter((entry) => !entry.summary).map((entry) => entry.label);
    const bestRow = rows.reduce((best, row) => (isBetterHunt(row, best) ? row : best), null);

    if (bestRow) {
        bestRow.isBest = true;
    }

    return {
        rows,
        pendingLabels,
        bestRow
    };
}
