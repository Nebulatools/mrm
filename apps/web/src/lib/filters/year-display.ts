/**
 * Utility functions for dynamic year display in chart/table titles
 * When no year filter is applied, titles should show NO year
 * When a year filter IS applied, titles should show the filtered year(s)
 */

/**
 * Returns a display string for the selected years
 * @param years - Array of selected years from the filter
 * @returns Empty string if no years selected, single year, or year range
 */
export function getYearDisplay(years: number[]): string {
  if (!years || years.length === 0) return '';
  if (years.length === 1) return `${years[0]}`;

  const sorted = [...years].sort((a, b) => a - b);
  // Check if years are consecutive
  const isConsecutive = sorted.every((year, index) =>
    index === 0 || year === sorted[index - 1] + 1
  );

  if (isConsecutive) {
    return `${sorted[0]}-${sorted[sorted.length - 1]}`;
  }

  // Non-consecutive years: show first and last with range notation
  return `${sorted[0]}-${sorted[sorted.length - 1]}`;
}

/**
 * Combines a base title with optional year display
 * @param baseTitle - The base title without year (e.g., "Ausentismo por Motivo")
 * @param years - Array of selected years from the filter
 * @returns Title with year suffix if years are selected, base title otherwise
 */
export function getTitleWithYear(baseTitle: string, years: number[]): string {
  const yearDisplay = getYearDisplay(years);
  return yearDisplay ? `${baseTitle} - ${yearDisplay}` : baseTitle;
}

/**
 * Formats year display for parenthetical notation (common in rotation tables)
 * @param years - Array of selected years from the filter
 * @returns Empty string or year in parentheses
 */
export function getYearParenthetical(years: number[]): string {
  const yearDisplay = getYearDisplay(years);
  return yearDisplay ? ` (${yearDisplay})` : '';
}
