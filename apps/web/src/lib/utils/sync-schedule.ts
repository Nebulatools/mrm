import { addDays, isAfter, nextDay, set as setTime } from "date-fns";
import type { Day } from "date-fns";

export type SyncFrequency = "manual" | "daily" | "weekly" | "monthly";

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function normalizeFrequency(value: unknown): SyncFrequency {
  const normalized = String(value || "manual").toLowerCase();
  if (normalized === "daily" || normalized === "weekly" || normalized === "monthly") {
    return normalized;
  }
  return "manual";
}

export function normalizeDayOfWeek(value: unknown): string {
  const normalized = String(value || "monday").toLowerCase();
  return DAY_INDEX[normalized] !== undefined ? normalized : "monday";
}

export function normalizeRunTime(value: unknown): string {
  if (typeof value !== "string") {
    return "02:00";
  }
  const parts = value.split(":");
  if (parts.length < 2) {
    return "02:00";
  }
  const hours = Math.min(Math.max(parseInt(parts[0], 10), 0), 23);
  const minutes = Math.min(Math.max(parseInt(parts[1], 10), 0), 59);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function computeNextRun(
  frequency: SyncFrequency,
  dayOfWeek: string,
  runTime: string,
  from: Date = new Date()
): Date | null {
  const [hoursStr, minutesStr] = normalizeRunTime(runTime).split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  const base = setTime(from, { hours, minutes, seconds: 0, milliseconds: 0 });

  if (frequency === "manual") {
    return null;
  }

  if (frequency === "daily") {
    if (isAfter(base, from)) {
      return base;
    }
    return addDays(base, 1);
  }

  if (frequency === "weekly") {
    const normalizedDay = normalizeDayOfWeek(dayOfWeek);
    const targetIndex = DAY_INDEX[normalizedDay] ?? 1;
    let candidate = nextDay(from, targetIndex as Day);
    candidate = setTime(candidate, { hours, minutes, seconds: 0, milliseconds: 0 });
    if (isAfter(candidate, from)) {
      return candidate;
    }
    const nextCandidate = nextDay(addDays(from, 1), targetIndex as Day);
    return setTime(nextCandidate, { hours, minutes, seconds: 0, milliseconds: 0 });
  }

  if (frequency === "monthly") {
    const nextMonth = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    return setTime(nextMonth, { hours, minutes, seconds: 0, milliseconds: 0 });
  }

  return null;
}
