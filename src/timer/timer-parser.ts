export function parseDuration(
  input: string
): number | null {
  const value = input.trim().toLowerCase();

  // HH:MM:SS
  const hms = value.match(
    /^(\d+):([0-5]\d):([0-5]\d)$/
  );

  if (hms) {
    const hours = Number(hms[1]);
    const minutes = Number(hms[2]);
    const seconds = Number(hms[3]);

    return (
      (hours * 60 * 60 +
        minutes * 60 +
        seconds) *
      1000
    );
  }

  // MM:SS
  const ms = value.match(
    /^(\d+):([0-5]\d)$/
  );

  if (ms) {
    const minutes = Number(ms[1]);
    const seconds = Number(ms[2]);

    return (
      (minutes * 60 + seconds) *
      1000
    );
  }

  // 1h, 30m, 90s
  const simple = value.match(
    /^(\d+(?:\.\d+)?)\s*(h|m|s)$/
  );

  if (simple) {
    const amount = Number(simple[1]);
    const unit = simple[2];

    if (unit === "h") {
      return amount * 60 * 60 * 1000;
    }

    if (unit === "m") {
      return amount * 60 * 1000;
    }

    if (unit === "s") {
      return amount * 1000;
    }
  }

  return null;
}

export function formatDuration(
  ms: number
): string {
  const totalSeconds = Math.ceil(
    ms / 1000
  );

  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  return `${minutes}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}