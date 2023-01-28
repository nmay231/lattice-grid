import { Keypress } from "../../types";
import { numberTyper } from "./numberTyper";

const event = (keypress: string): Keypress => ({
    keypress,
    type: keypress === "Delete" ? "delete" : "keyDown",
});

type Result = (string | null)[] | "doNothing";

describe("numberTyper", () => {
    it.each([
        { negatives: false, max: 9, key: "1", start: [""], result: ["1"] },
        { negatives: false, max: 16, key: "1", start: [""], result: ["1"] },
        { negatives: false, max: 16, key: "4", start: ["1"], result: ["14"] },
        { negatives: false, max: 100, key: "4", start: [""], result: ["4"] },
        { negatives: false, max: 100, key: "2", start: ["4"], result: ["42"] },
        { negatives: true, max: 16, key: "2", start: ["1"], result: ["12"] },
        // TODO: Fix: { negatives: true, max: 16, key: "2", start: ["-1"], result: ["-12"] },
        { negatives: true, max: 100, key: "1", start: ["3"], result: ["31"] },
        // TODO: Fix: { negatives: true, max: 100, key: "1", start: ["-3"], result: ["-31"] },
    ])("should type within the range bounds", ({ max, negatives, start, key, result }) => {
        expect(numberTyper({ max, negatives })(start, event(key))).toEqual<Result>(result);
    });

    it.each([
        { negatives: false, max: 9, key: "9", start: [""], result: ["9"] },
        { negatives: false, max: 16, key: "6", start: ["1"], result: ["16"] },
        { negatives: false, max: 100, key: "0", start: ["10"], result: ["100"] },
    ])("should type on the range bounds", ({ max, negatives, start, key, result }) => {
        expect(numberTyper({ max, negatives })(start, event(key))).toEqual<Result>(result);
    });

    it.each([
        { negatives: false, max: 9, key: "1", start: ["8"], result: ["1"] },
        { negatives: false, max: 16, key: "2", start: ["15"], result: ["2"] },
        { negatives: false, max: 100, key: "4", start: ["99"], result: ["4"] },
    ])(
        "should not type more than the max when less than the max",
        ({ max, negatives, start, key, result }) => {
            expect(numberTyper({ max, negatives })(start, event(key))).toEqual<Result>(result);
        },
    );

    it.each([
        { negatives: false, max: 9, key: "1", start: ["9"], result: ["1"] },
        { negatives: false, max: 16, key: "2", start: ["16"], result: ["2"] },
        { negatives: false, max: 100, key: "3", start: ["100"], result: ["3"] },
    ])(
        "should not type more than the max when at the max",
        ({ max, negatives, start, key, result }) => {
            expect(numberTyper({ max, negatives })(start, event(key))).toEqual<Result>(result);
        },
    );

    it.each([
        { negatives: false, max: 9, key: "0", start: [""], result: ["0"] },
        { negatives: false, max: 9, key: "0", start: ["0"], result: ["0"] },
        { negatives: false, max: 16, key: "0", start: ["0"], result: ["0"] },
        { negatives: false, max: 100, key: "0", start: ["1"], result: ["10"] },
        { negatives: false, max: 100, key: "0", start: ["10"], result: ["100"] },
        { negatives: false, max: 100, key: "0", start: ["100"], result: ["0"] },
        { negatives: true, max: 9, key: "0", start: ["-1"], result: ["0"] },
        { negatives: true, max: 100, key: "0", start: ["-1"], result: ["-10"] },
        { negatives: true, max: 100, key: "0", start: ["-1"], result: ["-10"] },
        { negatives: true, max: 100, key: "0", start: ["-1"], result: ["-10"] },
    ])("should type zero", ({ max, negatives, start, key, result }) => {
        expect(numberTyper({ max, negatives })(start, event(key))).toEqual<Result>(result);
    });

    it.each([
        { negatives: false, max: 9, key: "Backspace", start: [""], result: [null] },
        { negatives: false, max: 9, key: "Backspace", start: ["5"], result: [null] },
        { negatives: false, max: 16, key: "Backspace", start: ["16"], result: ["1"] },
        { negatives: false, max: 100, key: "Backspace", start: ["10"], result: ["1"] },
        { negatives: false, max: 100, key: "Backspace", start: ["100"], result: ["10"] },
        // TODO: Fix: { negatives: true, max: 9, key: "Backspace", start: ["-5"], result: [null] },
    ])("should shorten numbers with backspace", ({ max, negatives, start, key, result }) => {
        expect(numberTyper({ max, negatives })(start, event(key))).toEqual<Result>(result);
    });

    it.each([
        { negatives: false, max: 9, key: "Delete", start: [""], result: [null] },
        { negatives: false, max: 9, key: "Delete", start: ["5"], result: [null] },
        { negatives: false, max: 16, key: "Delete", start: ["16"], result: [null] },
        { negatives: false, max: 100, key: "Delete", start: ["10"], result: [null] },
        { negatives: false, max: 100, key: "Delete", start: ["100"], result: [null] },
    ])("should delete numbers", ({ max, negatives, start, key, result }) => {
        expect(numberTyper({ max, negatives })(start, event(key))).toEqual<Result>(result);
    });

    it.each([
        { negatives: false, max: 9, key: "-", start: [""], result: "doNothing" as const },
        { negatives: false, max: 9, key: "-", start: ["5"], result: "doNothing" as const },
        { negatives: false, max: 16, key: "-", start: ["16"], result: "doNothing" as const },
        { negatives: true, max: 16, key: "-", start: [""], result: [null] },
        { negatives: true, max: 16, key: "0", start: ["0"], result: ["0"] },
        { negatives: true, max: 100, key: "0", start: ["1"], result: ["10"] },
        { negatives: true, max: 100, key: "0", start: ["10"], result: ["100"] },
        { negatives: true, max: 100, key: "0", start: ["100"], result: ["0"] },
    ])("should negate numbers when appropriate", ({ max, negatives, start, key, result }) => {
        expect(numberTyper({ max, negatives })(start, event(key))).toEqual<Result>(result);
    });

    it.each([
        { negatives: false, max: 20, key: "a", start: [""], result: ["10"] },
        { negatives: false, max: 20, key: "B", start: [""], result: ["11"] },
        { negatives: false, max: 20, key: "C", start: [""], result: ["12"] },
        { negatives: false, max: 20, key: "d", start: [""], result: ["13"] },
        { negatives: false, max: 20, key: "g", start: [""], result: "doNothing" as const },
        { negatives: false, max: 20, key: "z", start: [""], result: "doNothing" as const },
        // TODO: Fix: { negatives: false, max: 9, key: "a", start: [""], result: [null] },
    ])(
        "should type hexadecimal numbers with no starting numbers",
        ({ max, negatives, start, key, result }) => {
            expect(numberTyper({ max, negatives })(start, event(key))).toEqual<Result>(result);
        },
    );

    it.each([
        { negatives: false, max: 20, key: "a", start: ["20"], result: ["10"] },
        { negatives: false, max: 20, key: "B", start: ["0"], result: ["11"] },
        { negatives: false, max: 20, key: "C", start: ["3"], result: ["12"] },
        { negatives: false, max: 20, key: "g", start: [""], result: "doNothing" as const },
        { negatives: false, max: 20, key: "z", start: [""], result: "doNothing" as const },
        // TODO: Basically, I need to have a test for every boundary of negative cross product with (max-1, max, max+1) where max+1 should doNothing.
        // TODO: Fix: { negatives: false, max: 9, key: "a", start: ["1"], result: [null] },
        // Negative starting numbers give the same result
        { negatives: true, max: 16, key: "a", start: ["-2"], result: ["10"] },
        { negatives: true, max: 20, key: "d", start: ["-4"], result: ["13"] },
    ])(
        "should type hexadecimal numbers when there is already starting numbers",
        ({ max, negatives, start, key, result }) => {
            expect(numberTyper({ max, negatives })(start, event(key))).toEqual<Result>(result);
        },
    );

    it.todo("should treat null, undefined, and invalid number strings the same");

    it.todo("should not add a second digit when the numbers are not the same");

    it.todo("should not add a second digit when the numbers are not the same");

    it.todo("should return an array with the same length as it was passed");
});
