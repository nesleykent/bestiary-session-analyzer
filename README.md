# Bestiary Session Analyzer for Tibia

## Overview

**Bestiary Session Analyzer for Tibia** extracts monster kill data from your hunting log, calculates your kill rate, and estimates the time required to complete a Bestiary entry. This allows you to evaluate and improve your hunting efficiency for faster Bestiary completion.

## Features

- Extracts and processes hunting session logs.
- Calculates session duration and kill rates.
- Matches killed monsters with Bestiary data.
- Estimates remaining kills and time needed to complete Bestiary entries.
- Displays results in a dynamic table with real-time updates.
- Supports manual input for total kills to adjust calculations.

## How It Works

1. **Load Bestiary Data:**  
   The script loads `bestiary_data.json`, which contains monster names, kill requirements, and charm points.
   
2. **Extract Log Data:**  
   - Parses the hunting log to extract session duration and killed monsters.  
   - Identifies relevant kill counts and correlates them with Bestiary entries.

3. **Match Bestiary Data:**  
   - Compares extracted monsters with Bestiary data.  
   - Computes remaining kills, estimated time for completion, and charms per hour.

4. **Update Remaining Time:**  
   - Users can input their total kills, and the system recalculates the remaining time and charms per hour.

5. **Display Results:**  
   - Outputs a structured table containing creature names, kill counts, estimated time to completion, and charm efficiency.

## Installation & Setup

1. Download or clone the repository.
2. Ensure `bestiary_data.json` is available in the same directory.
3. Open `index.html` (or relevant UI) in a web browser.
4. Copy and paste your **hunting session log** into the designated input field.
5. Click **"Process Log"** to analyze your session.

## Usage

### Extracting Data
1. Paste your **session log** into the input field.
2. Click **"Process Log"** to process the log.
3. The system will display a table with:
   - Monster names (linked to the Tibia Wiki).
   - Kills recorded in the session.
   - Kills needed for Bestiary unlock.
   - Estimated time remaining based on kill rate.

### Updating Total Kills
- Manually enter your **total kills** in the respective field.
- Click **"Update Remaining Time"** to refresh calculations.

### Resetting Inputs
- Click **"Clear Inputs"** to reset manual entries and revert to default calculations.

## JSON Structure (`bestiary_data.json`)
The Bestiary data file should contain an array of objects in the following format:

```json
[
    {
        "Name": "Rotworm",
        "Kills to Unlock": 500,
        "Charms": 25
    },
    {
        "Name": "Cyclops",
        "Kills to Unlock": 1000,
        "Charms": 50
    }
]
```

## Key Functions

### `loadBestiaryData()`
- Loads and stores Bestiary data from `bestiary_data.json`.

### `extractLogData()`
- Extracts session duration and killed monsters from the user-provided log.

### `matchBestiaryData(killedMonsters, sessionDuration)`
- Matches killed monsters with Bestiary entries.
- Computes remaining kills, estimated time, and charms per hour.

### `updateRemainingTime()`
- Updates calculations when users enter total kill counts.

### `clearAllInputs()`
- Resets all user inputs and recalculates default values.

### `displayExtractedData(matchedMonsters, totalCharms, maxTimeRemaining)`
- Displays results in a formatted table.

## Example Log Format
Your hunting session log should resemble the following:

```
Session: 1:30h
Killed Monsters:
    250x Rotworm
    500x Cyclops
Looted Items:
```

## Expected Output
| Creature | Charm Points | Session Kills | Total Kills | Kills to Unlock | Kill Rate | Kills Left | Time Remaining | Charms per Hour |
|----------|-------------|---------------|-------------|----------------|------------|------------|----------------|----------------|
| Rotworm  | 25          | 250           | (user input) | 500            | 2.78 kills/min | 250       | 1.5 hr         | 16.67 charms/hr |
| Cyclops  | 50          | 500           | (user input) | 1000           | 5.56 kills/min | 500       | 1.5 hr         | 33.33 charms/hr |

## Notes
- If a monster does not exist in `bestiary_data.json`, it will be ignored.
- Time estimates assume consistent kill rates throughout the session.
- Charms per hour depend on the total Bestiary completion time left.

## Future Enhancements
- Implement progress tracking across multiple sessions.
- Support advanced filtering and analytics for optimized hunting strategies.

## License
This project is open-source and free to use. Contributions are welcome.
