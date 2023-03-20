/**
 * Useful for passing to arr.map() since it ignores extra arguments unlike parseInt
 * ```ts
 * array.map((x) => parseInt(x)) // Old
 * array.map(parseIntBase(10)) // New
 * ```
 */
export const parseIntBase = (base: number) => (str: string) => parseInt(str, base);

/**
 * Reuse a sorter function (that is suitable for Array.sort()) to extract the max value from an array.
 * ```ts
 * const sortByX = (a, b) => a.x - b.x
 * const max = array.reduce(maxReducer(sortByX))
 * ```
 */
export const maxReducer = <T = any>(sorter: (a: T, b: T) => number) => {
    return (a: T, b: T) => (sorter(a, b) > 0 ? a : b);
};
