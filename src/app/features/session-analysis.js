function extractSessionDuration(logText) {
    const match = logText.match(/Session:\s*(\d+):(\d+)h/i);
    return match ? (Number.parseInt(match[1], 10) * 60) + Number.parseInt(match[2], 10) : 0;
}

function extractKilledMonsters(logText) {
    const killedMonsters = {};
    let capturing = false;

    logText.split("\n").forEach((line) => {
        if (line.includes("Killed Monsters:")) {
            capturing = true;
            return;
        }

        if (line.includes("Looted Items:")) {
            capturing = false;
        }

        if (!capturing) {
            return;
        }

        const match = line.match(/\s*(\d+)x\s+(.+)/);
        if (!match) {
            return;
        }

        const count = Number.parseInt(match[1], 10);
        const name = match[2].trim().toLowerCase();
        killedMonsters[name] = (killedMonsters[name] || 0) + count;
    });

    return killedMonsters;
}

function buildMonsterProgress(entry, killsThisSession, sessionDuration, totalKills = 0) {
    const killsToUnlock = Number(entry["Kills to Unlock"]) || 0;
    const charms = Number(entry.Charms) || 0;
    const killRate = sessionDuration > 0 ? (killsThisSession / sessionDuration) : 0;
    const remainingKills = Math.max(0, killsToUnlock - totalKills);
    const timeRemainingMinutes = remainingKills === 0
        ? 0
        : (killRate > 0 ? (remainingKills / killRate) : Number.POSITIVE_INFINITY);
    const charmsPerHour = Number.isFinite(timeRemainingMinutes) && timeRemainingMinutes > 0
        ? Math.min((charms / timeRemainingMinutes) * 60, charms)
        : 0;

    return {
        name: entry.Name,
        wikiLink: `https://tibia.fandom.com/wiki/${entry.Name.replace(/\s/g, "_")}`,
        charms,
        killsThisSession,
        totalKills,
        killsToUnlock,
        killRate,
        remainingKills,
        timeRemainingMinutes,
        charmsPerHour
    };
}

export function calculateSummary(monsters) {
    if (!monsters.length) {
        return {
            totalCharms: 0,
            maxTimeRemainingMinutes: 0,
            totalCharmsPerHour: 0
        };
    }

    const inProgressMonsters = monsters.filter((monster) => monster.remainingKills > 0);
    const hasInfiniteTime = inProgressMonsters.some((monster) => !Number.isFinite(monster.timeRemainingMinutes));
    const finiteMonsters = inProgressMonsters.filter((monster) => Number.isFinite(monster.timeRemainingMinutes));
    const totalCharms = inProgressMonsters.reduce((sum, monster) => sum + monster.charms, 0);
    const maxTimeRemainingMinutes = hasInfiniteTime
        ? Number.POSITIVE_INFINITY
        : finiteMonsters.reduce((max, monster) => Math.max(max, monster.timeRemainingMinutes), 0);
    const totalCharmsPerHour = Number.isFinite(maxTimeRemainingMinutes) && maxTimeRemainingMinutes > 0
        ? Math.min((totalCharms / maxTimeRemainingMinutes) * 60, totalCharms)
        : 0;

    return {
        totalCharms,
        maxTimeRemainingMinutes,
        totalCharmsPerHour
    };
}

export function analyzeSession(logText, bestiaryData) {
    const sessionDuration = extractSessionDuration(logText);
    const killedMonsters = extractKilledMonsters(logText);

    const monsters = Object.entries(killedMonsters)
        .map(([name, killsThisSession]) => {
            const bestiaryEntry = bestiaryData.find((entry) => entry.Name.toLowerCase() === name);
            return bestiaryEntry ? buildMonsterProgress(bestiaryEntry, killsThisSession, sessionDuration) : null;
        })
        .filter(Boolean);

    return {
        sessionDuration,
        monsters,
        summary: calculateSummary(monsters)
    };
}

export function recalculateProgress(monsters, bestiaryData, sessionDuration, totalKillsByName) {
    const updatedMonsters = monsters.map((monster) => {
        const bestiaryEntry = bestiaryData.find((entry) => entry.Name === monster.name);
        const totalKills = Number(totalKillsByName[monster.name] || 0);

        return buildMonsterProgress(bestiaryEntry, monster.killsThisSession, sessionDuration, totalKills);
    });

    return {
        monsters: updatedMonsters,
        summary: calculateSummary(updatedMonsters)
    };
}
