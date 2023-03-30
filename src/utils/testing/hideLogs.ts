const defaultHidden = ["log", "error", "info", "warn"] as const;

export const hideLogs = (fns: readonly (typeof defaultHidden)[number][] = defaultHidden) => {
    const backup = fns.map((key) => [key, console[key]] as const);

    for (const fn of fns) console[fn] = vi.fn();

    return {
        restore: () => {
            Object.assign(console, Object.fromEntries(backup));
        },
    };
};
