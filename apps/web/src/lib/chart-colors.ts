/**
 * Modern color palette for charts and visualizations
 * Designed for accessibility and visual appeal
 */

export const CHART_COLORS = {
  // Primary brand colors
  primary: '#f97316',    // Orange
  secondary: '#0f172a',  // Charcoal
  accent: '#ef4444',     // Warm Red

  // Categorical colors (for different data series)
  categorical: [
    '#f97316', // Orange
    '#ef4444', // Red
    '#fb923c', // Soft orange
    '#0f172a', // Charcoal
    '#475569', // Slate
    '#facc15', // Amber
    '#1f2937', // Graphite
    '#fca5a5', // Soft red
  ],

  // Modern UI palette used across dashboard tabs (avoids traffic-light semantics)
  modernSeries: [
    '#f97316', // Orange
    '#fb923c', // Soft orange
    '#ef4444', // Red
    '#facc15', // Amber
    '#0f172a', // Charcoal
    '#1f2937', // Graphite
    '#475569', // Slate
    '#fca5a5', // Soft red
  ],

  // Sequential colors (for ranges/gradients)
  sequential: {
    blue: ['#f8fafc', '#e2e8f0', '#cbd5f5', '#94a3b8', '#64748b', '#1f2937'],
    green: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444'],
    purple: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316'],
    red: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444'],
  },

  // Diverging colors (for comparisons)
  diverging: {
    redGreen: ['#ef4444', '#f87171', '#fca5a5', '#f3f4f6', '#94a3b8', '#475569', '#1f2937'],
    blueOrange: ['#1f2937', '#475569', '#94a3b8', '#f3f4f6', '#fdba74', '#fb923c', '#f97316'],
  },

  // Sentiment colors
  positive: '#22c55e', // Green
  negative: '#ef4444', // Red
  neutral: '#6b7280',  // Gray

  // Special purpose
  grid: '#e2e8f0',     // Light gray for grid lines
  axis: '#94a3b8',     // Medium gray for axes
  text: '#1f2937',     // Dark gray for text

  // Seniority/Time ranges
  seniority: {
    '0-1': '#ef4444',   // Red (nuevo ingreso)
    '1-3': '#f97316',   // Orange
    '3-5': '#fb923c',   // Soft orange
    '5-10': '#facc15',  // Amber
    '10+': '#0f172a',   // Charcoal (experimentado)
  },
} as const;

/**
 * Get a color from the categorical palette by index
 */
export function getCategoricalColor(index: number): string {
  return CHART_COLORS.categorical[index % CHART_COLORS.categorical.length];
}

export function getModernColor(index: number): string {
  return CHART_COLORS.modernSeries[index % CHART_COLORS.modernSeries.length];
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
