import fc from "fast-check";

/**
 * Generate floating point numbers that are not too big or small, and filter NaN and Infinity.
 * It does miss some testing opportunities, but most of the time they are probably false-negative test failures.
 */
export const FCNormalFloats = ({ upper = 1e10, lower = 1e-10 } = {}) => {
    return fc
        .float({ noNaN: true, noDefaultInfinity: true, max: upper, min: -upper })
        .filter((n) => Math.abs(n) > lower);
};
