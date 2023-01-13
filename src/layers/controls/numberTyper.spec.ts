import { Keypress } from "../../types";
import { DO_NOTHING, numberTyper } from "./numberTyper";

// TODO: I should eventually look at property based testing
const event = (keypress: string): Keypress => ({
    keypress,
    type: keypress === "Delete" ? "delete" : "keyDown",
});

const getTyper = (max: number, negatives: boolean) => numberTyper({ max, negatives });

describe("numberTyper, negative=false", () => {
    it("should type less than the max", () => {
        expect(getTyper(9, false)("", event("1"))).toEqual("1");
        expect(getTyper(16, false)("", event("1"))).toEqual("1");
        expect(getTyper(16, false)("1", event("4"))).toEqual("14");
        expect(getTyper(100, false)("", event("4"))).toEqual("4");
        expect(getTyper(100, false)("4", event("2"))).toEqual("42");
    });

    it("should type exactly the max", () => {
        expect(getTyper(9, false)("", event("9"))).toEqual("9");
        expect(getTyper(16, false)("1", event("6"))).toEqual("16");
        expect(getTyper(100, false)("10", event("0"))).toEqual("100");
    });

    it("should not type more than the max when less than the max", () => {
        expect(getTyper(9, false)("8", event("1"))).toEqual("1");
        expect(getTyper(16, false)("15", event("2"))).toEqual("2");
        expect(getTyper(100, false)("99", event("4"))).toEqual("4");
    });

    it("should not type more than the max when at the max", () => {
        expect(getTyper(9, false)("9", event("1"))).toEqual("1");
        expect(getTyper(16, false)("16", event("2"))).toEqual("2");
        expect(getTyper(100, false)("100", event("3"))).toEqual("3");
    });

    it("should type zero", () => {
        expect(getTyper(9, false)("", event("0"))).toEqual("0");
        expect(getTyper(9, false)("0", event("0"))).toEqual("0");
        expect(getTyper(16, false)("0", event("0"))).toEqual("0");
        expect(getTyper(100, false)("1", event("0"))).toEqual("10");
        expect(getTyper(100, false)("10", event("0"))).toEqual("100");
        expect(getTyper(100, false)("100", event("0"))).toEqual("0");
    });

    it("should shorten a number with backspace", () => {
        expect(getTyper(9, false)("", event("Backspace"))).toEqual(null);
        expect(getTyper(9, false)("5", event("Backspace"))).toEqual(null);
        expect(getTyper(16, false)("16", event("Backspace"))).toEqual("1");
        expect(getTyper(100, false)("10", event("Backspace"))).toEqual("1");
        expect(getTyper(100, false)("100", event("Backspace"))).toEqual("10");
    });

    it("should delete a number", () => {
        expect(getTyper(9, false)("", event("Delete"))).toEqual(null);
        expect(getTyper(9, false)("5", event("Delete"))).toEqual(null);
        expect(getTyper(16, false)("16", event("Delete"))).toEqual(null);
        expect(getTyper(100, false)("10", event("Delete"))).toEqual(null);
        expect(getTyper(100, false)("100", event("Delete"))).toEqual(null);
    });

    it("should do nothing when a hyphen is typed", () => {
        expect(getTyper(9, false)("", event("-"))).toEqual(DO_NOTHING);
        expect(getTyper(9, false)("5", event("-"))).toEqual(DO_NOTHING);
        expect(getTyper(16, false)("16", event("-"))).toEqual(DO_NOTHING);
    });

    it("should do nothing when a plus/equals is typed", () => {
        expect(getTyper(9, false)("", event("+"))).toEqual(DO_NOTHING);
        expect(getTyper(9, false)("5", event("+"))).toEqual(DO_NOTHING);
        expect(getTyper(16, false)("16", event("+"))).toEqual(DO_NOTHING);
        expect(getTyper(9, false)("", event("="))).toEqual(DO_NOTHING);
        expect(getTyper(9, false)("5", event("="))).toEqual(DO_NOTHING);
        expect(getTyper(16, false)("16", event("="))).toEqual(DO_NOTHING);
    });

    it("should type hexadecimal numbers with no starting number", () => {
        expect(getTyper(20, false)("", event("a"))).toEqual("10");
        expect(getTyper(20, false)("", event("B"))).toEqual("11");
        expect(getTyper(20, false)("", event("C"))).toEqual("12");
        expect(getTyper(20, false)("", event("d"))).toEqual("13");
        expect(getTyper(20, false)("", event("g"))).toEqual(DO_NOTHING);
        expect(getTyper(20, false)("", event("z"))).toEqual(DO_NOTHING);
        expect(getTyper(9, false)("", event("a"))).toEqual("0"); // TODO: Is this what I want?
    });

    it("should type hexadecimal numbers when there is already a starting number", () => {
        expect(getTyper(9, false)("", event("+"))).toEqual(DO_NOTHING);
        expect(getTyper(9, false)("5", event("+"))).toEqual(DO_NOTHING);
        expect(getTyper(16, false)("16", event("+"))).toEqual(DO_NOTHING);
        expect(getTyper(9, false)("", event("="))).toEqual(DO_NOTHING);
        expect(getTyper(9, false)("5", event("="))).toEqual(DO_NOTHING);
        expect(getTyper(16, false)("16", event("="))).toEqual(DO_NOTHING);
    });
});

describe("numberTyper, negative=true", () => {
    // it("should type inside the range", () => {
    //     expect(getTyper(16, true)("1", event("2"))).toEqual("12");
    //     expect(getTyper(16, true)("-1", event("2"))).toEqual("-12");
    //     expect(getTyper(100, true)("1", event("3"))).toEqual("13");
    //     expect(getTyper(100, true)("-1", event("3"))).toEqual("-13");
    // });

    it.todo("should type the bounds of the range");

    it.todo("should not type outside the range when inside the bounds");

    it.todo("should not type outside the range when on the bounds");

    it("should type zero", () => {
        expect(getTyper(9, true)("-1", event("0"))).toEqual("0");
        expect(getTyper(100, true)("-1", event("0"))).toEqual("-10");
        expect(getTyper(100, true)("-1", event("0"))).toEqual("-10");
        expect(getTyper(100, true)("-1", event("0"))).toEqual("-10");
    });

    it.todo("should shorten a number with backspace, negative=false");

    it.todo("should shorten a number with backspace");

    it.todo("should delete a number");

    it.todo("should do nothing when a hyphen is typed, negative=false");

    // it("should negate numbers when a hyphen is typed", () => {
    //     expect(getTyper(16, true)("", event("-"))).toEqual(DO_NOTHING);
    //     expect(getTyper(16, true)("0", event("0"))).toEqual("0");
    //     expect(getTyper(100, true)("1", event("0"))).toEqual("10");
    //     expect(getTyper(100, true)("10", event("0"))).toEqual("100");
    //     expect(getTyper(100, true)("100", event("0"))).toEqual("0");
    // });

    it.todo("should do nothing when a plus/equals is typed");

    it.todo("should turn numbers positive when a plus/equals is typed");

    it.todo("should type hexadecimal numbers with no starting number");

    it.todo("should type hexadecimal numbers when there is already a starting number");

    it.todo("should type negative hexadecimal numbers when there is a negative number");
});

describe("numberTyper, max=-1", () => {
    // it("should type inside the range", () => {
    //     expect(getTyper(16, true)("1", event("2"))).toEqual("12");
    //     expect(getTyper(16, true)("-1", event("2"))).toEqual("-12");
    //     expect(getTyper(100, true)("1", event("3"))).toEqual("13");
    //     expect(getTyper(100, true)("-1", event("3"))).toEqual("-13");
    // });

    it.todo("should type the bounds of the range");

    it.todo("should not type outside the range when inside the bounds");

    it.todo("should not type outside the range when on the bounds");

    it("should type zero", () => {
        expect(getTyper(9, true)("-1", event("0"))).toEqual("0");
        expect(getTyper(100, true)("-1", event("0"))).toEqual("-10");
        expect(getTyper(100, true)("-1", event("0"))).toEqual("-10");
        expect(getTyper(100, true)("-1", event("0"))).toEqual("-10");
    });

    it.todo("should shorten a number with backspace, negative=false");

    it.todo("should shorten a number with backspace");

    it.todo("should delete a number");

    it.todo("should do nothing when a hyphen is typed, negative=false");

    // it("should negate numbers when a hyphen is typed", () => {
    //     expect(getTyper(16, true)("", event("-"))).toEqual(DO_NOTHING);
    //     expect(getTyper(16, true)("0", event("0"))).toEqual("0");
    //     expect(getTyper(100, true)("1", event("0"))).toEqual("10");
    //     expect(getTyper(100, true)("10", event("0"))).toEqual("100");
    //     expect(getTyper(100, true)("100", event("0"))).toEqual("0");
    // });

    it.todo("should do nothing when a plus/equals is typed");

    it.todo("should turn numbers positive when a plus/equals is typed");

    it.todo("should type hexadecimal numbers with no starting number");

    it.todo("should type hexadecimal numbers when there is already a starting number");

    it.todo("should type negative hexadecimal numbers when there is a negative number");

    // Old
    it.todo("should not delete objects when the number range increases");
    it.todo("should delete objects when the number range decreases");
    it.todo("should add a second digit when typed fast enough");
    it.todo("should not add a second digit when not typed fast enough");
    it.todo("should not add a second digit when the selection is not the same");
    it.todo("should not add a second digit when the numbers are not the same");
    it.todo("should understand single-digit hexadecimal");
    it.todo("should not understand multi-digit hexadecimal");
    it.todo("should have some tests with negative numbers and such");
});
