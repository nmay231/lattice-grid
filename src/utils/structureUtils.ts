export const bySubset =
    <T extends string = string>(set: Set<T>): Parameters<Array<T>["filter"]>[0] =>
    (value) =>
        set.has(value);
