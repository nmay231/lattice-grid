// TODO: How to keep all of these lists and index.css in sync?
export const DEFAULT_COLORS = {
    LIGHT_GREEN: "var(--user-light-green)",
    LIGHT_BLUE: "var(--user-light-blue)",
    LIGHT_YELLOWORANGE: "var(--user-light-yelloworange)",
    LIGHT_RED: "var(--user-light-red)",
    LIGHT_PURPLE: "var(--user-light-purple)",
    LIGHT_GRAY: "var(--user-light-gray)",
    LIGHT_WHITE: "var(--user-light-white)",
    DARK_GREEN: "var(--user-dark-green)",
    DARK_BLUE: "var(--user-dark-blue)",
    DARK_YELLOWORANGE: "var(--user-dark-yelloworange)",
    DARK_RED: "var(--user-dark-red)",
    DARK_PURPLE: "var(--user-dark-purple)",
    DARK_GRAY: "var(--user-dark-gray)",
    DARK_WHITE: "var(--user-dark-white)",
} as const;

// Don't just do Object.values(DEFAULT_COLORS) because these colors have to stay in order
// TODO: Or do they? It depends on if this is used as the source of truth for how colors are encoded
const validColors: Array<(typeof DEFAULT_COLORS)[keyof typeof DEFAULT_COLORS]> = [
    "var(--user-light-green)",
    "var(--user-light-blue)",
    "var(--user-light-yelloworange)",
    "var(--user-light-red)",
    "var(--user-light-purple)",
    "var(--user-light-gray)",
    "var(--user-light-white)",
    "var(--user-dark-green)",
    "var(--user-dark-blue)",
    "var(--user-dark-yelloworange)",
    "var(--user-dark-red)",
    "var(--user-dark-purple)",
    "var(--user-dark-gray)",
    "var(--user-dark-white)",
];

// TODO: Allow custom colors that follow hex or hsl format (decide on which one, or support them all)
export const isValidColor = (color: string) => validColors.includes(color);
