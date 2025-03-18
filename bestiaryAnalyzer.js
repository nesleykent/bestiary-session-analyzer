let bestiaryData = [];

async function loadBestiaryData() {
    try {
        const response = await fetch("bestiary_data.json");
        if (!response.ok) throw new Error("Failed to load JSON");
        bestiaryData = await response.json();
    } catch (error) {
        alert("Failed to load Bestiary data.");
    }
}

function pasteLog() {
    navigator.clipboard.readText()
        .then(text => {
            document.getElementById("sessionLog").value = text;
        })
        .catch(err => {
            alert("Failed to paste. Ensure clipboard permissions are enabled.");
        });
}

function clearLog() {
    document.getElementById("sessionLog").value = "";
}

function extractLogData() {
    let logText = document.getElementById("sessionLog").value.trim();
    if (!logText) {
        alert("Paste the session log first.");
        return;
    }

    let sessionDuration = extractSessionDuration(logText);
    let killedMonsters = extractKilledMonsters(logText);
    let matchedMonsters = matchBestiaryData(killedMonsters, sessionDuration);

    sessionStorage.setItem("sessionDuration", sessionDuration);
    sessionStorage.setItem("matchedMonsters", JSON.stringify(matchedMonsters));
    displayExtractedData(matchedMonsters);
}

function extractSessionDuration(log) {
    let match = log.match(/Session:\s*(\d+):(\d+)h/);
    return match ? parseInt(match[1]) * 60 + parseInt(match[2]) : 0;
}

function extractKilledMonsters(log) {
    let killedMonsters = {};
    let capturing = false;
    log.split("\n").forEach(line => {
        if (line.includes("Killed Monsters:")) capturing = true;
        if (capturing && line.trim() === "") return;
        if (line.includes("Looted Items:")) capturing = false;

        let match = line.match(/\s*(\d+)x\s(.+)/);
        if (match && capturing) {
            let count = parseInt(match[1]);
            let name = match[2].trim().toLowerCase();
            killedMonsters[name] = (killedMonsters[name] || 0) + count;
        }
    });
    return killedMonsters;
}

function matchBestiaryData(killedMonsters, sessionDuration) {
    return Object.entries(killedMonsters).map(([name, killsThisSession]) => {
        let bestiaryEntry = bestiaryData.find(c => c.Name.toLowerCase() === name);
        if (!bestiaryEntry) return null;

        let killsToUnlock = bestiaryEntry["Kills to Unlock"] || 0;
        let charms = bestiaryEntry["Charms"] || 0;
        let killRate = sessionDuration > 0 ? (killsThisSession / sessionDuration) : 0;
        let remainingKills = Math.max(0, killsToUnlock);
        let timeRemaining = killRate > 0 ? (remainingKills / killRate) : 0;
        let formattedTimeRemaining = timeRemaining > 0 ? formatTime(timeRemaining) : "∞";
        let charmsPerHour = timeRemaining > 0 ? ((charms / timeRemaining) * 60).toFixed(2) : "∞";

        return {
            name: bestiaryEntry.Name,
            wikiLink: `https://tibia.fandom.com/wiki/${bestiaryEntry.Name.replace(/\s/g, "_")}`,
            charms: formatNumber(charms),
            killsThisSession,
            totalKills: "",
            killsToUnlock: formatNumber(killsToUnlock),
            killRate: killRate.toFixed(2),
            remainingKills: formatNumber(remainingKills),
            timeRemaining: formattedTimeRemaining,
            charmsPerHour,
            rawCharms: charms,
            rawTimeRemaining: timeRemaining
        };
    }).filter(Boolean);
}

function updateRemainingTime() {
    let matchedMonsters = JSON.parse(sessionStorage.getItem("matchedMonsters")) || [];
    let sessionDuration = parseInt(sessionStorage.getItem("sessionDuration")) || 1;

    let totalCharms = 0;
    let maxTimeRemaining = 0;

    matchedMonsters.forEach((m, index) => {
        let totalKillsInput = document.getElementById(`totalKills-${index}`);
        let totalKills = parseInt(totalKillsInput.value) || 0;
        m.totalKills = formatNumber(totalKills);
        let killsToUnlock = parseInt(m.killsToUnlock.replace(",", ""));
        let killRate = parseFloat(m.killRate);
        let remainingKills = Math.max(0, killsToUnlock - totalKills);
        let timeRemaining = killRate > 0 ? (remainingKills / killRate) : 0;
        let formattedTimeRemaining = timeRemaining > 0 ? formatTime(timeRemaining) : "∞";
        let charms = parseInt(m.charms.replace(",", ""));
        let charmsPerHour = timeRemaining > 0 ? ((charms / timeRemaining) * 60).toFixed(2) : "∞";

        m.remainingKills = formatNumber(remainingKills);
        m.timeRemaining = formattedTimeRemaining;
        m.charmsPerHour = charmsPerHour;
        m.rawTimeRemaining = timeRemaining;

        if (timeRemaining > 0) {
            totalCharms += charms;
            maxTimeRemaining = Math.max(maxTimeRemaining, timeRemaining);
        }
    });

    sessionStorage.setItem("matchedMonsters", JSON.stringify(matchedMonsters));
    displayExtractedData(matchedMonsters, totalCharms, maxTimeRemaining);
}

function clearAllInputs() {
    let matchedMonsters = JSON.parse(sessionStorage.getItem("matchedMonsters")) || [];
    matchedMonsters.forEach((m, index) => {
        document.getElementById(`totalKills-${index}`).value = "";
        m.totalKills = "";
        m.remainingKills = m.killsToUnlock;
        m.timeRemaining = "∞";
        m.charmsPerHour = "∞";
    });

    sessionStorage.setItem("matchedMonsters", JSON.stringify(matchedMonsters));
    updateRemainingTime();
}

function displayExtractedData(matchedMonsters, totalCharms = null, maxTimeRemaining = null) {
    if (totalCharms === null || maxTimeRemaining === null) {
        totalCharms = 0;
        maxTimeRemaining = 0;

        matchedMonsters.forEach(m => {
            if (m.rawTimeRemaining > 0) {
                totalCharms += m.rawCharms;
                maxTimeRemaining = Math.max(maxTimeRemaining, m.rawTimeRemaining);
            }
        });
    }

    let totalCharmsPerHour = maxTimeRemaining > 0 ? ((totalCharms / maxTimeRemaining) * 60).toFixed(2) : "∞";
    let formattedMaxTimeRemaining = maxTimeRemaining > 0 ? formatTime(maxTimeRemaining) : "∞";

    let tableHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Creature</th>
                        <th>Charm Points</th>
                        <th>Session Kills</th>
                        <th>Total Kills</th>
                        <th>Kills to Unlock</th>
                        <th>Kill Rate</th>
                        <th>Kills Left</th>
                        <th>Time Remaining</th>
                        <th>Charms per Hour</th>
                    </tr>
                </thead>
                <tbody>
    `;

    matchedMonsters.forEach((m, index) => {
        tableHTML += `
            <tr>
                <td><a href="${m.wikiLink}" target="_blank">${m.name}</a></td>
                <td>${m.charms}</td>
                <td>${m.killsThisSession}</td>
                <td><input type="number" id="totalKills-${index}" placeholder="Enter kills" value="${m.totalKills.replace(/,/g, '')}"></td>
                <td>${m.killsToUnlock}</td>
                <td>${m.killRate} kills/min</td>
                <td>${m.remainingKills}</td>
                <td>${m.timeRemaining}</td>
                <td>${m.charmsPerHour} charms/hr</td>
            </tr>
        `;
    });

    tableHTML += `
        <tr class="total-row">
            <td><strong>Total</strong></td>
            <td><strong>${formatNumber(totalCharms)}</strong></td>
            <td colspan="5"></td>
            <td><strong>${formattedMaxTimeRemaining}</strong></td>
            <td><strong>${totalCharmsPerHour} charms/hr</strong></td>
        </tr>
    </tbody></table></div>
        <div style="text-align: center; margin-top: 20px;">
            <button class="btn" onclick="updateRemainingTime()">Update Remaining Time</button>
            <button class="btn clear-btn" onclick="clearAllInputs()">Clear Inputs</button>
        </div>
    `;

    document.getElementById("output").innerHTML = tableHTML;
}

function formatTime(timeInMinutes) {
    return timeInMinutes < 1 ? `${Math.round(timeInMinutes * 60)} sec` : `${(timeInMinutes / 60).toFixed(1)} hr`;
}

function formatNumber(number) {
    return number.toLocaleString("en-US");
}

loadBestiaryData();