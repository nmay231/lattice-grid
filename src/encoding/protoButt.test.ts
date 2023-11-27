import fc, { Arbitrary } from "fast-check";
import { concat } from "../utils/data";
import { given } from "../utils/testing/fcArbitraries";
import { Encoder, Encoding, Scalar, ScalarMap, TopLevel } from "./protoButt";

describe("protoButt", () => {
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
        },
        input: { a: 900, c: bytesExample.slice(1), b: -420 },
        output: [3, 0, ...bytesExample, 2, 0b1000_0100, 0b0000_0111, 4, 0b1100_0111, 0b0000_0110],
    } as const;

    const examples = [
        // Scalars
        { encoding: { type: "uint32" }, input: 42, output: [42] },
        { encoding: { type: "uint32" }, input: 0, output: [0] },
        { encoding: { type: "uint32" }, input: 900, output: [0b1000_0100, 0b0000_0111] },
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
            output: [1, 0, 42],
        },
        {
            encoding: {
                type: "message",
                fields: { a: { type: "uint32", index: 1 }, b: { type: "sint32", index: 3 } },
            },
            input: { a: 42, b: -42 },
            output: [2, 1, 42, 3, 2 * 42 - 1],
        },
        threeFieldMessageExample,

        // Messages with a subset of fields set
        {
            ...threeFieldMessageExample,
            input: { a: 12, b: 5 },
            output: [2, 2, 12, 4, 2 * 5],
        },
        {
            ...threeFieldMessageExample,
            input: { c: stringExample.slice(1) },
            output: [1, 0, ...stringExample],
        },
        {
            ...threeFieldMessageExample,
            input: {},
            output: [0],
        },

        // Enums with unit variants or non-unit variants
    ] as const satisfies Readonly<
        Array<{
            encoding: TopLevel<Scalar> | TopLevel<Encoding>;
            input: any;
            output: readonly number[] | Uint8Array;
        }>
    >;

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
        "encodes then decodes each value, repeated, length=2",
        ({ encoding, input, output }) => {
            const repeated2Encoder = Encoder.create({ ...encoding, index: 0, repeated: true });
            const expected2 = Uint8Array.from(concat([2], output, output));
            expect(repeated2Encoder.encode([input, input] as any)).toEqual(expected2);
            expect(repeated2Encoder.decode(expected2)).toEqual([input, input]);
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

    // You might be wondering why I check a bunch of examples manually if I have a "fuzz" test here. I have the manual examples so I can check the output matches what I expect.
    it.skip("always decodes the same object that was encoded", () => {
        console.log("before...");
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
        // TODO: Unless I think of something very simple, I need to just limit the examples to very basic ones, that is only scalars, maxDepth=1, maxDepth=2 with the second layer only allowing 5 or less fields
        // Try commenting out each recursive one to see what the problem is, then see if I can limit the size of the inner most recursive ones. Understand size a bit more
        const { encoding } = fc.letrec((tie) => ({
            encoding: fc
                .tuple(
                    fc.integer({ min: 0, max: 130 }),
                    fc.constantFrom(undefined, true),
                    fc.oneof(
                        { depthSize: "small", withCrossShrink: true, maxDepth: 4 },
                        tie("scalar"),
                        // tie("tuple"),
                        // tie("message"),
                        tie("enum"),
                    ),
                )
                .map(
                    ([index, repeated, encoding]) =>
                        ({ index, repeated, ...(encoding as any) }) as Encoding | Scalar,
                ),
            scalar: fc.record({
                type: fc.constantFrom<keyof ScalarMap>("sint32", "uint32", "bytes", "unit"),
            }) satisfies Arbitrary<TopLevel<Scalar>>,
            message: fc.record({
                type: fc.constant("message"),
                fields: fc.dictionary(
                    fc.string(),
                    tie("encoding") as Arbitrary<Encoding | Scalar>,
                    { maxKeys: 5 },
                ),
            }) satisfies Arbitrary<TopLevel<Encoding>>,
            enum: fc.record({
                type: fc.constant("enum"),
                fields: fc.dictionary(
                    fc.string(),
                    tie("encoding") as Arbitrary<Encoding | Scalar>,
                    { minKeys: 1, maxKeys: 1 },
                ),
            }) satisfies Arbitrary<TopLevel<Encoding>>,
            tuple: fc.record({
                type: fc.constant("tuple"),
                fields: fc
                    .dictionary(fc.string(), tie("encoding") as Arbitrary<Encoding | Scalar>, {
                        maxKeys: 5,
                    })
                    .map((fields) =>
                        Object.fromEntries(
                            Object.entries(fields).map(([key, field], index) => [
                                key,
                                { ...field, index },
                            ]),
                        ),
                    ),
            }) satisfies Arbitrary<TopLevel<Encoding>>,
        }));
        const encodingObject = encoding.chain((encoding) =>
            fc.record({ encoding: fc.constant(encoding), object: FCExampleFromEncoding(encoding) }),
        );
        given([encodingObject], {
            numRuns: 100,
            // endOnFailure: true,
        }).assertProperty(({ encoding, object }) => {
            // console.log(encoding, object);
            const encoder = Encoder.create(encoding);
            expect(object).toEqual(encoder.decode(encoder.encode(object)));
        });
    });
});
