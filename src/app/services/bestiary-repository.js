function normalizeCreature(creature) {
    return {
        ID: creature.id,
        Name: creature.name,
        Class: creature.class?.name ?? "",
        Difficulty: creature.difficulty ?? "",
        Occurrence: creature.occurrence ?? "",
        Charms: Number(creature.charm_details?.charm_points ?? 0),
        "Stage 1": Number(creature.charm_details?.first_stage ?? 0),
        "Stage 2": Number(creature.charm_details?.second_stage ?? 0),
        "Kills to Unlock": Number(creature.charm_details?.third_stage ?? 0),
        Locations: creature.locations ?? ""
    };
}

export async function loadBestiaryData() {
    const response = await fetch("./data/bestiary.json");

    if (!response.ok) {
        throw new Error("Failed to load Bestiary data.");
    }

    const payload = await response.json();
    const creatures = Array.isArray(payload?.data) ? payload.data : [];

    return creatures.map(normalizeCreature);
}
