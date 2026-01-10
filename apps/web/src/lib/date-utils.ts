import { startOfMonth } from "date-fns";

/**
 * Check if a given month is in the future (hasn't started yet)
 * @param year - The year
 * @param monthNum - The month number (1-12)
 * @returns true if the month is in the future
 */
export function isFutureMonth(year: number, monthNum: number): boolean {
  const monthStart = startOfMonth(new Date(year, monthNum - 1, 1));
  return monthStart > new Date();
}

/**
 * Get valid months (non-future) for a given year
 * @param year - The year to check
 * @returns Array of month numbers (1-12) that are not in the future
 */
export function getValidMonths(year: number): number[] {
  return Array.from({ length: 12 }, (_, i) => i + 1).filter(
    monthNum => !isFutureMonth(year, monthNum)
  );
}
