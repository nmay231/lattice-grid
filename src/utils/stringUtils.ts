export const keypressString = (
    event: Pick<KeyboardEvent, "key" | "ctrlKey" | "shiftKey">,
): string => {
    let key = event.key;
    const { ctrlKey, shiftKey } = event;
    if (key === " ") {
        key = "Space";
    } else if (key === "Control" || key === "Shift") {
        return key;
    }
    if (key.length > 1) {
        return (ctrlKey ? "ctrl-" : "") + (shiftKey ? "shift-" : "") + key;
    }

    return (ctrlKey ? "ctrl-" : "") + key;
};

export const smartSort = <T extends string | number = any>(a: T, b: T) => {
    return a < b ? 1 : a > b ? -1 : 0;
};
