import { keypressString } from "./stringUtils";

describe("keypressStringShorthand", () => {
    const call = (arg: Partial<Parameters<typeof keypressString>[0]>) => {
        return keypressString({
            key: "lkjhaslkdjfhlkasjdf",
            ctrlKey: false,
            shiftKey: false,
            ...arg,
        });
    };
    it("should shorten letters and numbers", () => {
        expect(call({ key: "g" })).toBe("g");
        expect(call({ key: "R" })).toBe("R");
        expect(call({ key: "I" })).toBe("I");
        expect(call({ key: "d" })).toBe("d");
        expect(call({ key: "4" })).toBe("4");
        expect(call({ key: "2" })).toBe("2");
    });

    it("should shorten spacebar, control, shift (etc.) key presses", () => {
        expect(call({ key: " " })).toBe("Space");
        expect(call({ key: "Shift", shiftKey: true })).toBe("Shift");
        expect(call({ key: "Control", ctrlKey: true })).toBe("Control");
        expect(call({ key: "Alt" })).toBe("Alt");
        expect(call({ key: "Backspace" })).toBe("Backspace");
        expect(call({ key: "Escape" })).toBe("Escape");
        expect(call({ key: "Tab" })).toBe("Tab");
    });

    it("should shorten special characters", () => {
        expect(call({ key: "+" })).toBe("+");
        expect(call({ key: "=" })).toBe("=");
        expect(call({ key: "-" })).toBe("-");
        expect(call({ key: "?" })).toBe("?");
    });

    it("should shorten letters and numbers with ctrl pressed", () => {
        expect(call({ key: "g", ctrlKey: true })).toBe("ctrl-g");
        expect(call({ key: "R", ctrlKey: true })).toBe("ctrl-R");
        expect(call({ key: "I", ctrlKey: true })).toBe("ctrl-I");
        expect(call({ key: "d", ctrlKey: true })).toBe("ctrl-d");
        expect(call({ key: "4", ctrlKey: true })).toBe("ctrl-4");
        expect(call({ key: "2", ctrlKey: true })).toBe("ctrl-2");
    });

    it.todo(
        "should still understand capslock when numlock is pressed (Windows bug)",
    );
});
