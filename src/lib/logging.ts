/**
 * Minimal structured logger (AGENTS.md §17, TDD §25).
 * Never log document content — only operational metadata such as job IDs,
 * error categories, durations and file sizes.
 */
type Level = "info" | "warn" | "error";

function emit(level: Level, event: string, data?: Record<string, unknown>) {
  const payload = JSON.stringify({
    level,
    event,
    ts: new Date().toISOString(),
    ...data,
  });
  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else {
    console.log(payload);
  }
}

export const logger = {
  info: (event: string, data?: Record<string, unknown>) => emit("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => emit("error", event, data),
};
