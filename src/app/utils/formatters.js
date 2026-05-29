export function formatNumber(value) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatTime(minutes) {
    if (!Number.isFinite(minutes)) {
        return "\u221e";
    }

    if (minutes <= 0) {
        return "0 min";
    }

    if (minutes < 1) {
        return `${Math.max(1, Math.round(minutes * 60))} sec`;
    }

    if (minutes < 60) {
        return `${minutes.toFixed(1)} min`;
    }

    return `${(minutes / 60).toFixed(1)} hr`;
}

export function formatKillRate(killsPerMinute) {
    return `${killsPerMinute.toFixed(2)} kills/min`;
}

export function formatCharmsPerHour(charmsPerHour) {
    if (!Number.isFinite(charmsPerHour)) {
        return "\u221e";
    }

    return `${charmsPerHour.toFixed(2)} charms/hr`;
}
