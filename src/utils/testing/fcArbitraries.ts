import fc from "fast-check";
import { Tuple } from "../../types";

/**
 * Generate floating point numbers that are not too big or small, and
 * filter NaN and Infinity. It does miss some testing opportunities,
 * but most of the time they are probably false-negative test failures.
 */
export const FCNormalFloat = ({ upper = 1e10, lower = 1e-10 } = {}) => {
    return fc
        .float({ noNaN: true, noDefaultInfinity: true, max: upper, min: -upper })
        .filter((n) => Math.abs(n) > lower);
};

/**
 * Create a tuple of the specified length using the arbitrary. The values
 * of the tuple will be different (for the most part) unlike fc.clone()
 */
export const FCRepeat = <T = any, N extends number = number>(length: N, arb: fc.Arbitrary<T>) => {
    return fc.array(arb, { minLength: length, maxLength: length }) as fc.Arbitrary<Tuple<T, N>>;
};

/**
 * A simple wrapper around fc.assert() to help remove indentation and move
 * params to the top of your test.
 *
 * ```ts
 * given(arbitraries, params).assertProperty(predicate)
 * ```
 *
 * is equivalent to
 *
 * ```ts
 * fc.assert(fc.property(...arbitraries, predicate), params)
 * ```
 */
export function given<Ts extends [unknown, ...unknown[]]>(
    arbitraries: { [K in keyof Ts]: fc.Arbitrary<Ts[K]> },
    params?: fc.Parameters<Ts>,
) {
    return {
        assertProperty: (predicate: (...args: Ts) => boolean | void) =>
            fc.assert(fc.property(...arbitraries, predicate), params),
    };
}
