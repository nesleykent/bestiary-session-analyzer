import {
    createProgress,
    deriveCreatureProgress,
    getProgressEntry,
    normalizeProgressEntry,
    PROGRESS_STATUS_LABELS
} from "./bestiary-progress.js";

/**
 * Import and export of Bestiary progress.
 *
 * Only user-owned columns are ever read: name, kills, and the flags. Charm
 * points and stage thresholds always come from game data, never from the file —
 * an exported spreadsheet goes stale as soon as CipSoft rebalances a creature,
 * and one row in the reference file already disagrees with the current dataset.
 */

const CSV_COLUMNS = [
    "Bookmark",
    "Name",
    "Charms",
    "Earned",
    "Killed",
    "Stage 1",
    "Stage 2",
    "Kills to Unlock",
    "Status",
    "Kills Left",
    "Progress (%)"
];

/** Minimal RFC 4180 reader: quoted fields, escaped quotes, CR/LF endings. */
export function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    let index = 0;

    const endField = () => { row.push(field); field = ""; };
    const endRow = () => { endField(); rows.push(row); row = []; };

    while (index < text.length) {
        const char = text[index];

        if (inQuotes) {
            if (char === '"') {
                if (text[index + 1] === '"') {
                    field += '"';
                    index += 2;
                    continue;
                }
                inQuotes = false;
                index += 1;
                continue;
            }

            field += char;
            index += 1;
            continue;
        }

        if (char === '"') {
            inQuotes = true;
            index += 1;
            continue;
        }

        if (char === ",") {
            endField();
            index += 1;
            continue;
        }

        if (char === "\r") {
            index += 1;
            continue;
        }

        if (char === "\n") {
            endRow();
            index += 1;
            continue;
        }

        field += char;
        index += 1;
    }

    if (field.length || row.length) {
        endRow();
    }

    return rows.filter((candidate) => candidate.some((cell) => cell.trim().length));
}

/** "1,846" and " 1846 " both mean 1846. */
function parseCount(value) {
    const digits = String(value ?? "").replace(/[,\s]/g, "");
    const count = Number.parseInt(digits, 10);

    return Number.isFinite(count) && count > 0 ? count : 0;
}

function parseFlag(value) {
    return /^(yes|true|1|y)$/i.test(String(value ?? "").trim());
}

function buildCreatureIndex(creatures) {
    return new Map(creatures.map((creature) => [creature.Name.toLowerCase(), creature.Name]));
}

export function importProgressCsv(text, creatures) {
    const rows = parseCsvRows(text);

    if (!rows.length) {
        throw new Error("That file has no rows.");
    }

    const header = rows[0].map((cell) => cell.trim());
    const nameIndex = header.findIndex((cell) => /^name$/i.test(cell));
    const killedIndex = header.findIndex((cell) => /^killed$/i.test(cell));

    if (nameIndex === -1 || killedIndex === -1) {
        throw new Error("That CSV needs a Name column and a Killed column.");
    }

    const bookmarkIndex = header.findIndex((cell) => /^bookmark$/i.test(cell));
    const byName = buildCreatureIndex(creatures);
    const progress = createProgress();
    const unmatched = [];
    let matched = 0;

    rows.slice(1).forEach((row) => {
        const rawName = (row[nameIndex] ?? "").trim();

        // The reference export ends with a totals row; it is a summary, not a
        // creature, so it must not be reported as an unmatched name.
        if (!rawName || (bookmarkIndex !== -1 && /^total$/i.test((row[bookmarkIndex] ?? "").trim()))) {
            return;
        }

        const canonicalName = byName.get(rawName.toLowerCase());

        if (!canonicalName) {
            unmatched.push(rawName);
            return;
        }

        matched += 1;

        const entry = normalizeProgressEntry({
            kills: parseCount(row[killedIndex]),
            bookmark: bookmarkIndex === -1 ? false : parseFlag(row[bookmarkIndex])
        });

        if (entry.kills > 0 || entry.bookmark) {
            progress[canonicalName] = entry;
        }
    });

    return { progress, matched, unmatched };
}

/**
 * A TibiaDraptor bestiary export. Its user_data block is read into our own
 * store; bestiary.json itself is never written to.
 */
export function importProgressJson(text, creatures) {
    let payload;

    try {
        payload = JSON.parse(text);
    } catch (error) {
        throw new Error("That file is not valid JSON.");
    }

    const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : null);

    if (!rows) {
        throw new Error("That JSON does not look like a Bestiary export.");
    }

    const byName = buildCreatureIndex(creatures);
    const progress = createProgress();
    const unmatched = [];
    let matched = 0;

    rows.forEach((row) => {
        const rawName = String(row?.name ?? "").trim();

        if (!rawName) {
            return;
        }

        const canonicalName = byName.get(rawName.toLowerCase());

        if (!canonicalName) {
            unmatched.push(rawName);
            return;
        }

        matched += 1;

        const userData = row.user_data ?? {};
        const entry = normalizeProgressEntry({
            kills: parseCount(userData.kills),
            echoWarden: Boolean(userData.echo_warden),
            animusMastery: Boolean(userData.animus_mastery),
            bookmark: Boolean(userData.bookmark)
        });

        if (entry.kills > 0 || entry.echoWarden || entry.animusMastery || entry.bookmark) {
            progress[canonicalName] = entry;
        }
    });

    return { progress, matched, unmatched };
}

function csvCell(value) {
    const text = String(value ?? "");

    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Exported in the same column order as the reference spreadsheet so it can be
 * opened, edited and imported straight back. The derived columns are written for
 * the reader's benefit and ignored on the way back in.
 */
export function exportProgressCsv(creatures, progress) {
    const lines = [CSV_COLUMNS.join(",")];
    const totals = { creatures: 0, charms: 0, earned: 0 };

    creatures.forEach((creature) => {
        const derived = deriveCreatureProgress(creature, getProgressEntry(progress, creature.Name));

        totals.creatures += 1;
        totals.charms += derived.charms;
        totals.earned += derived.charmsEarned;

        lines.push([
            derived.bookmark ? "Yes" : "No",
            creature.Name,
            derived.charms,
            derived.isComplete ? derived.charms : "",
            derived.kills,
            creature["Stage 1"],
            creature["Stage 2"],
            derived.unlockTarget,
            PROGRESS_STATUS_LABELS[derived.status],
            derived.killsLeft,
            `${Math.round(derived.progress * 100)}%`
        ].map(csvCell).join(","));
    });

    const percent = totals.charms > 0 ? (totals.earned / totals.charms) * 100 : 0;

    lines.push([
        "Total",
        totals.creatures,
        totals.charms,
        totals.earned,
        "", "", "", "",
        `${percent.toFixed(2)}%`,
        "", ""
    ].map(csvCell).join(","));

    return `${lines.join("\n")}\n`;
}

export function buildProgressExportFileName(exportedAt) {
    return `bestiary-progress-${String(exportedAt).slice(0, 10)}.csv`;
}
