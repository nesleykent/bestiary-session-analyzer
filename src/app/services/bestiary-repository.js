export async function loadBestiaryData() {
    const response = await fetch("./data/bestiary-data.json");

    if (!response.ok) {
        throw new Error("Failed to load Bestiary data.");
    }

    return response.json();
}
