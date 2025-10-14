/**
 * Modern color palette for charts and visualizations
 * Designed for accessibility and visual appeal
 */

export const CHART_COLORS = {
  // Primary brand colors
  primary: '#3b82f6',    // Blue 500
  secondary: '#8b5cf6',  // Violet 500
  accent: '#ec4899',     // Pink 500

  // Categorical colors (for different data series)
  categorical: [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#a855f7', // Purple
  ],

  // Sequential colors (for ranges/gradients)
  sequential: {
    blue: ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'],
    green: ['#d1fae5', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857'],
    purple: ['#ede9fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9'],
    red: ['#fee2e2', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c'],
  },

  // Diverging colors (for comparisons)
  diverging: {
    redGreen: ['#ef4444', '#f87171', '#fca5a5', '#f3f4f6', '#86efac', '#4ade80', '#22c55e'],
    blueOrange: ['#2563eb', '#60a5fa', '#93c5fd', '#f3f4f6', '#fdba74', '#fb923c', '#f97316'],
  },

  // Sentiment colors
  positive: '#10b981', // Green
  negative: '#ef4444', // Red
  neutral: '#6b7280',  // Gray

  // Special purpose
  grid: '#e5e7eb',     // Light gray for grid lines
  axis: '#9ca3af',     // Medium gray for axes
  text: '#1f2937',     // Dark gray for text

  // Seniority/Time ranges
  seniority: {
    '0-1': '#ef4444',   // Red (new)
    '1-3': '#f97316',   // Orange
    '3-5': '#eab308',   // Yellow
    '5-10': '#22c55e',  // Green
    '10+': '#3b82f6',   // Blue (experienced)
  },
} as const;

/**
 * Get a color from the categorical palette by index
 */
export function getCategoricalColor(index: number): string {
  return CHART_COLORS.categorical[index % CHART_COLORS.categorical.length];
}

/**
 * Get opacity variant of a color
 */
export function withOpacity(color: string, opacity: number): string {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
