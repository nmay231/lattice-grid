/**
 * Useful for passing to arr.map() since it ignores extra arguments unlike parseInt
 * ```ts
 * array.map((x) => parseInt(x)) // Old
 * array.map(parseIntBase(10)) // New
 * ```
 */
export const parseIntBase = (base: number) => (str: string) => parseInt(str, base);

const minReducer = <T = any>(sorter: (a: T, b: T) => number) => {
    return (a: T, b: T) => (sorter(a, b) <= 0 ? a : b);
};
const maxReducer = <T = any>(sorter: (a: T, b: T) => number) => {
    return (a: T, b: T) => (sorter(a, b) > 0 ? a : b);
};
/**
 * Reuse a sorter function (that is suitable for Array.sort()) to extract the min/max value from an array.
 * ```ts
 * const sortByX = (a, b) => a.x - b.x
 * const max = array.reduce(reduceTo.max(sortByX))
 * ```
 */
export const reduceTo = {
    min: minReducer,
    max: maxReducer,
    /** Aliased to min */
    first: minReducer,
    /** Aliased to max */
    last: maxReducer,
};

type List<T> = ArrayLike<T>;
type ZipResult<T> = Generator<T, void>;
export function zip<T1, T2>(arr1: List<T1>, arr2: List<T2>): ZipResult<[T1, T2]>;
export function zip<T1, T2, T3>(
    arr1: List<T1>,
    arr2: List<T2>,
    arr3: List<T3>,
): ZipResult<[T1, T2, T3]>;
export function zip<T1, T2, T3, T4>(
    arr1: List<T1>,
    arr2: List<T2>,
    arr3: List<T3>,
    arr4: List<T4>,
): ZipResult<[T1, T2, T3, T4]>;
export function zip<T>(...arrays: Array<List<T>>): ZipResult<Array<T>>;

/** Write a custom zip function better than lodash's because it only iterates over the shortest array and you don't have stupid undefined sprinkled in. */
export function* zip<T>(...arrays: Array<List<T>>) {
    if (arrays.length < 2) {
        throw Error("Must have two arrays at least");
    }

    // TODO: I could simply require the arrays to be the same length and error if they are not. I sorta like that
    const max = arrays.reduce((length, b) => Math.min(length, b.length), Infinity);

    for (let index = 0; index < max; index++) {
        yield arrays.map((arr) => arr[index]);
    }
}
