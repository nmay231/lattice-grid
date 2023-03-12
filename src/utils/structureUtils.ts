export const bySubset =
    <T extends string = string>(set: Set<T>) =>
    (value: T) =>
        set.has(value);
