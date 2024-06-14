import fc, { Arbitrary } from "fast-check";
import { given } from "../utils/testing/fcArbitraries";
import { Encoder, Encoding, Scalar, ScalarMap, TopLevel } from "./protoButt";

import { concat } from "../utils/data";
describe("protoButt", () => {
    // The input is not *exactly* equal to itself after encoding then decoding, so it needs its own test
    it("treats keys set to undefined the same as a key not present", () => {
        const encoder = Encoder.create({
            type: "message",
            fields: {
                optional: { index: 0, type: "uint32" },
                required: { index: 10, type: "uint32" },
            },
            index: 0,
        });

        const input = { optional: undefined, required: 42 };
        const output = Uint8Array.from([2, 10, 42]);
        expect(encoder.encode(input)).toEqual(output);
        expect(encoder.decode(output)).toEqual({ required: 42 });
    });

    const bytesExample = Uint8Array.from([7, 1, 1, 2, 3, 5, 8, 13]);
    const stringExample = Uint8Array.from([11, ...new TextEncoder().encode("hello world")]);

    const threeFieldMessageExample = {
        encoding: {
            type: "message",
            fields: {
                a: { type: "uint32", index: 2 },
                c: { type: "bytes", index: 0 },
                b: { type: "sint32", index: 4 },
            },
        } satisfies TopLevel<Encoding>,
        input: { a: 900, c: bytesExample.slice(1), b: -420 },
        output: [15, 0, ...bytesExample, 2, 0b1000_0100, 0b0000_0111, 4, 0b1100_0111, 0b0000_0110],
    } as const;

    const examples: Array<{
        encoding: TopLevel<Scalar> | TopLevel<Encoding>;
        input: any;
        output: readonly number[] | Uint8Array;
    }> = [
        // Scalars
        { encoding: { type: "uint32" }, input: 42, output: [42] },
        { encoding: { type: "uint32" }, input: 900, output: [0b1000_0100, 0b0000_0111] },
        { encoding: { type: "uint32" }, input: 0, output: [0] },
        {
            encoding: { type: "uint32" },
            input: 0xff_ff_ff_ff,
            output: [255, 255, 255, 255, 0b1111],
        },
        {
            encoding: { type: "sint32" },
            input: 0x7f_ff_ff_ff,
            output: [254, 255, 255, 255, 0b1111],
        },
        {
            encoding: { type: "sint32" },
            input: -0x80_00_00_00,
            output: [255, 255, 255, 255, 0b1111],
        },
        { encoding: { type: "sint32" }, input: 0, output: [0] },
        { encoding: { type: "sint32" }, input: -420, output: [0b1100_0111, 0b0000_0110] },
        { encoding: { type: "sint32" }, input: 420, output: [0b1100_1000, 0b0000_0110] },
        { encoding: { type: "bytes" }, input: bytesExample.slice(1), output: bytesExample },
        { encoding: { type: "bytes" }, input: stringExample.slice(1), output: stringExample },

        // Empty values
        { encoding: { type: "unit" }, input: true as const, output: [] },
        { encoding: { type: "tuple", fields: {} }, input: {}, output: [] },
        { encoding: { type: "message", fields: {} }, input: {}, output: [0] },
        { encoding: { type: "bytes" }, input: Uint8Array.from([]), output: [0] },

        // Tuples with length
        {
            encoding: { type: "tuple", fields: { a: { type: "uint32", index: 0 } } },
            input: { a: 42 },
            output: [42],
        },
        {
            encoding: {
                type: "tuple",
                fields: { a: { type: "uint32", index: 0 }, b: { type: "sint32", index: 1 } },
            },
            input: { a: 42, b: -42 },
            output: [42, 2 * 42 - 1],
        },
        {
            encoding: {
                type: "tuple",
                fields: {
                    a: { type: "uint32", index: 1 },
                    c: { type: "bytes", index: 0 },
                    b: { type: "sint32", index: 2 },
                },
            },
            input: { a: 900, c: bytesExample.slice(1), b: -420 },
            output: [...bytesExample, 0b1000_0100, 0b0000_0111, 0b1100_0111, 0b0000_0110],
        },

        // Messages with all fields set
        {
            encoding: { type: "message", fields: { a: { type: "uint32", index: 0 } } },
            input: { a: 42 },
            output: [2, 0, 42],
        },
        {
            encoding: {
                type: "message",
                fields: { a: { type: "uint32", index: 1 }, b: { type: "sint32", index: 3 } },
            },
            input: { a: 42, b: -42 },
            output: [4, 1, 42, 3, 2 * 42 - 1],
        },
        threeFieldMessageExample,

        // Messages with a subset of fields set
        {
            ...threeFieldMessageExample,
            input: { a: 12, b: 5 },
            output: [4, 2, 12, 4, 2 * 5],
        },
        {
            ...threeFieldMessageExample,
            input: { c: stringExample.slice(1) },
            output: [13, 0, ...stringExample],
        },
        {
            ...threeFieldMessageExample,
            input: {},
            output: [0],
        },

        // Enums with unit variants or non-unit variants
        {
            encoding: {
                type: "enum",
                fields: { a: { type: "unit", index: 0 }, b: { type: "unit", index: 1 } },
            },
            input: { a: true },
            output: [0],
        },
        {
            encoding: {
                type: "enum",
                fields: { a: { type: "sint32", index: 0 }, b: { type: "unit", index: 1 } },
            },
            input: { b: true },
            output: [1],
        },
        {
            encoding: {
                type: "enum",
                fields: { a: { type: "uint32", index: 3 }, b: { type: "unit", index: 1 } },
            },
            input: { a: 81 },
            output: [3, 81],
        },
        {
            encoding: {
                type: "enum",
                fields: { "": { type: "uint32", index: 0 } },
            },
            input: { "": 1 },
            output: [0, 1],
        },

        // Repeated subfields
        {
            encoding: {
                type: "enum",
                fields: {
                    a: {
                        index: 3,
                        type: "enum",
                        fields: { b: { index: 4, repeated: true, type: "sint32" } },
                    },
                },
            },
            input: { a: { b: [5, 5] } },
            output: [3, 4, 2, 2 * 5, 2 * 5],
        },
        {
            encoding: {
                type: "message",
                fields: {
                    a: { index: 0, repeated: true, type: "uint32" },
                },
            },
            input: { a: [1, 2, 4] },
            output: [5, 0, 3, 1, 2, 4],
        },
    ];

    it.each(examples)(
        "encodes then decodes each value unrepeated",
        ({ encoding, input, output }) => {
            const encoder = Encoder.create({ ...encoding, index: 0 });
            const expected = Uint8Array.from(output);
            expect(encoder.encode(input)).toEqual(expected);
            expect(encoder.decode(expected)).toEqual(input);
        },
    );

    it.each(examples)(
        "encodes then decodes each value, repeated, length=1",
        ({ encoding, input, output }) => {
            const repeated1Encoder = Encoder.create({ ...encoding, index: 0, repeated: true });
            const expected1 = Uint8Array.from(concat([1], output));
            expect(repeated1Encoder.encode([input] as any)).toEqual(expected1);
            expect(repeated1Encoder.decode(expected1)).toEqual([input]);
        },
    );

    it.each(examples)(
        "encodes then decodes each value, repeated, length=3",
        ({ encoding, input, output }) => {
            const repeated3Encoder = Encoder.create({ ...encoding, index: 0, repeated: true });
            const expected3 = Uint8Array.from(concat([3], output, output, output));
            expect(repeated3Encoder.encode([input, input, input] as any)).toEqual(expected3);
            expect(repeated3Encoder.decode(expected3)).toEqual([input, input, input]);
        },
    );

    // The manual examples above allow me to check against the expected output,
    // while the following fuzz test checks a much larger space. Note: We
    // basically generate random encoding schemas and some examples based on
    // those schemas then check that encoding the example then decoding gives
    // back the same object
    it("always decodes to the same object that was encoded", () => {
        const FCMaybeRepeated = (arb: Arbitrary<any>, repeated: boolean | undefined) => {
            if (repeated) return fc.array(arb);
            return arb;
        };

        const FCBytes = fc.uint8Array({ maxLength: 40 });
        const FCBytesArray = fc.array(FCBytes, { maxLength: 20 });
        const FCUInt32 = fc.integer({ min: 0 });
        const FCUInt32Array = fc.array(FCUInt32, { maxLength: 20 });
        const FCSInt32 = fc.integer();
        const FCSInt32Array = fc.array(FCSInt32, { maxLength: 20 });
        const FCUnit = fc.constant(true);
        const FCUnitArray = fc.array(FCUnit, { maxLength: 20 });

        const FCExampleFromEncoding = (encoding: Encoding | Scalar): Arbitrary<any> => {
            switch (encoding.type) {
                case "bytes": {
                    return encoding.repeated ? FCBytesArray : FCBytes;
                }
                case "sint32": {
                    return encoding.repeated ? FCSInt32Array : FCSInt32;
                }
                case "uint32": {
                    return encoding.repeated ? FCUInt32Array : FCUInt32;
                }
                case "unit": {
                    return encoding.repeated ? FCUnitArray : FCUnit;
                }
                case "enum": {
                    const fields = Object.entries(encoding.fields);
                    return FCMaybeRepeated(
                        fc
                            .constantFrom(...fields)
                            .chain(([key, field]) =>
                                fc.record({ [key]: FCExampleFromEncoding(field) }),
                            ),
                        encoding.repeated,
                    );
                }
                case "tuple": {
                    return FCMaybeRepeated(
                        fc.record(
                            Object.fromEntries(
                                Object.entries(encoding.fields).map(([key, field]) => [
                                    key,
                                    FCExampleFromEncoding(field),
                                ]),
                            ),
                        ),
                        encoding.repeated,
                    );
                }
                case "message": {
                    return FCMaybeRepeated(
                        fc.record(
                            Object.fromEntries(
                                Object.entries(encoding.fields).map(([key, field]) => [
                                    key,
                                    FCExampleFromEncoding(field),
                                ]),
                            ),
                            { requiredKeys: [] },
                        ),
                        encoding.repeated,
                    );
                }
            }
        };

        const changeBadKeys = <T>([key, field]: [string, T]) =>
            [key in Object.prototype ? `${key} no. stop it. get some help.` : key, field] as [
                string,
                T,
            ];

        // https://fast-check.dev/docs/core-blocks/arbitraries/combiners/recursive-structure/
        const { encoding } = fc.letrec((tie) => ({
            encoding: fc
                .tuple(
                    fc.constantFrom(undefined, true),
                    fc.oneof(
                        { depthSize: "small", withCrossShrink: true, maxDepth: 4 },
                        tie("scalar"),
                        tie("tuple"),
                        tie("message"),
                        tie("enum"),
                    ),
                )
                .map(
                    ([repeated, encoding]) =>
                        ({ repeated, ...(encoding as any) }) as Encoding | Scalar,
                ),

            scalar: fc.record({
                type: fc.constantFrom<keyof ScalarMap>("uint32", "sint32", "bytes", "unit"),
            }) satisfies Arbitrary<TopLevel<Scalar>>,

            message: fc.record({
                type: fc.constant("message"),
                fields: fc
                    .dictionary(fc.string(), tie("encoding") as Arbitrary<Encoding | Scalar>, {
                        maxKeys: 5,
                    })
                    .chain((fields) => {
                        const entries = Object.entries(fields).map((entry) => changeBadKeys(entry));
                        return fc
                            .uniqueArray(fc.integer({ min: 0, max: 130 }), {
                                minLength: entries.length,
                                maxLength: entries.length,
                            })
                            .map((indexes) =>
                                Object.fromEntries(
                                    entries.map(([key, field], i) => [
                                        key,
                                        { ...field, index: indexes[i] },
                                    ]),
                                ),
                            );
                    }),
            }) satisfies Arbitrary<TopLevel<Encoding>>,

            enum: fc.record({
                type: fc.constant("enum"),
                fields: fc
                    .dictionary(fc.string(), tie("encoding") as Arbitrary<Encoding | Scalar>, {
                        minKeys: 1,
                        maxKeys: 10,
                    })
                    .chain((fields) => {
                        const entries = Object.entries(fields);
                        return fc
                            .uniqueArray(fc.integer({ min: 0, max: 130 }), {
                                minLength: entries.length,
                                maxLength: entries.length,
                            })
                            .map((indexes) =>
                                Object.fromEntries(
                                    entries
                                        .map((entry) => changeBadKeys(entry))
                                        .map(([key, field], i) => [
                                            key,
                                            { ...field, index: indexes[i] },
                                        ]),
                                ),
                            );
                    }),
            }) satisfies Arbitrary<TopLevel<Encoding>>,

            tuple: fc.record({
                type: fc.constant("tuple"),
                fields: fc
                    .dictionary(fc.string(), tie("encoding") as Arbitrary<Encoding | Scalar>, {
                        maxKeys: 3,
                    })
                    .map((fields) =>
                        Object.fromEntries(
                            Object.entries(fields)
                                .map((entry) => changeBadKeys(entry))
                                .map(([key, field], index) => [key, { ...field, index }]),
                        ),
                    ),
            }) satisfies Arbitrary<TopLevel<Encoding>>,
        }));
        const encodingAndInput = encoding.chain((encoding) =>
            fc.record({ encoding: fc.constant(encoding), input: FCExampleFromEncoding(encoding) }),
        );

        given([encodingAndInput], {
            numRuns: 1000,
            skipAllAfterTimeLimit: 10_000,
            maxSkipsPerRun: 5,
        }).assertProperty(({ encoding, input }) => {
            const encoder = Encoder.create(encoding);

            const encoded = encoder.encode(input);
            const decoded = encoder.decode(encoded);

            expect(input).toEqual(decoded);
        });
    });
});
