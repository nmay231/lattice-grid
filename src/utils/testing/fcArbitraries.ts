import fc, { Arbitrary } from "fast-check";
import { FancyVector } from "../math";

/**
 * Generate floating point numbers that are not too big or small, and filter NaN and Infinity.
 * It does miss some testing opportunities, but most of the time they are probably false-negative test failures.
 */
export const FCNormalFloats = ({ upper = 1e10, lower = 1e-10 } = {}) => {
    return fc
        .float({ noNaN: true, noDefaultInfinity: true, max: upper, min: -upper })
        .filter((n) => Math.abs(n) > lower);
};

// TODO: I don't know if this is causes issues with the internal state of Arbitraries and whether it ruins shrinking and all that.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TupleLength = <T = any>(n: number, arb: Arbitrary<T>) => {
    return [...new Array(n)].map(() => arb);
};

export const FCTupleVectorFloat = (arg?: Parameters<typeof FCNormalFloats>[0]) => {
    return fc.tuple(FCNormalFloats(arg), FCNormalFloats(arg));
};

export const FCTupleVectorInt = (arg?: Parameters<typeof fc.integer>[0]) => {
    return fc.tuple(fc.integer(arg), fc.integer(arg));
};

export const FCVector = (arg?: Parameters<typeof fc.integer>[0]) => {
    return fc.tuple(fc.integer(arg), fc.integer(arg)).map((vec) => new FancyVector(vec));
};
