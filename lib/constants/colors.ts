// Tremor charts require Tailwind color names (not hex codes) to work properly.
// Using hex codes can cause Tremor to default to black.
// We use bright Tailwind color names that Tremor recognizes and maps to vibrant colors.

export const CHART_COLORS = [
    'blue',    // Tremor maps this to bright blue
    'cyan',    // Tremor maps this to bright cyan
    'sky',     // Tremor maps this to bright sky blue
    'violet',  // Tremor maps this to bright violet
    'fuchsia', // Tremor maps this to bright fuchsia
];

export const CHART_COLORS_EXTENDED = [
    'blue',    // Bright Blue
    'cyan',    // Bright Cyan
    'sky',     // Bright Sky Blue
    'violet',  // Bright Violet
    'fuchsia', // Bright Fuchsia
    'emerald', // Bright Emerald Green
    'amber',   // Bright Amber/Orange
    'rose',    // Bright Rose/Pink
    'teal',    // Bright Teal
    'indigo',  // Bright Indigo
];
