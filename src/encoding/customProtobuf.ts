export type ScalarMap = {
    float: number;
    double: number;
    // I'm purposely not including int32 and int64, since it's better to use uint* or sint* specifically
    uint32: number;
    sint32: number;
    fixed32: number;
    sfixed32: number;
    uint64: bigint;
    sint64: bigint;
    fixed64: bigint;
    sfixed64: bigint;
    bool: boolean;
    string: string;
    bytes: Uint8Array; // Honestly might not be needed if I get some simple state machines implemented as a first-class type
    // maps are also interesting but not needed, at the moment at least... Additionally, I could create a custom map that encodes entries as tuples instead of messages
    // Same for reserved field numbers and names (don't really need yet)
};

export type Scalar = {
    type: keyof ScalarMap;
    index: number;
    /** @default false */
    repeated?: boolean;
};

export type Encoding = {
    type: "message" | "tuple" | "oneof";
    fields: Record<string, Encoding | Scalar>;
    index: number;
    /** @default false */
    repeated?: boolean;
};
export type TopLevel<E extends Encoding | Scalar> = Omit<E, "index">;

export type DescriptionToObject<E extends TopLevel<Encoding>> = E["type"] extends "tuple"
    ? PossibleRepeated<_DescriptionToObject<E>, E["repeated"]>
    : E["type"] extends "message" | "oneof"
    ? PossibleRepeated<Partial<_DescriptionToObject<E>>, E["repeated"]>
    : never;

type PossibleRepeated<T, Repeated> = Repeated extends true ? T[] : T;

type _DescriptionToObject<E extends TopLevel<Encoding>> = {
    [K in keyof E["fields"]]: E["fields"][K]["type"] extends infer Type
        ? Type extends keyof ScalarMap
            ? PossibleRepeated<ScalarMap[Type], E["fields"][K]["repeated"]>
            : E["fields"][K] extends Encoding
            ? DescriptionToObject<E["fields"][K]>
            : never
        : never;
};

export class Encoder<E extends TopLevel<Encoding>> {
    constructor(public fields: E) {}

    // Thank you typescript for adding const generics!
    static create<const E extends TopLevel<Encoding>>(arg: E): Encoder<E> {
        // TODO: Verify indices don't overlap, and that tuple indices are contiguous.
        // TODO: Unless there's a good reason to deviate from standard protobuf, oneof should not be repeatable.
        return new Encoder(arg);
    }

    stringify(obj: DescriptionToObject<E>): Uint8Array {
        // TODO: Don't forget to clamp any types that need clamping (number | 0 => int32).
        throw Error(`TODO, ${JSON.stringify(obj)}`);
    }

    parse(serialized: Uint8Array): { ok: DescriptionToObject<E> } | { error: string } {
        throw Error(`TODO, ${serialized.join(",")}`);
    }
}

const ColorMessage: Scalar["type"] = "uint32";

export const PuzzleEncoder = Encoder.create({
    type: "oneof",
    fields: {
        uncompressedV1: {
            index: 1,
            type: "tuple",
            fields: {
                squareGridParams: {
                    index: 1,
                    type: "tuple",
                    fields: {
                        // TODO: It would be better to only include the height + width but that would require readjusting all points to the origin.
                        minX: { type: "sint32", index: 1 },
                        minY: { type: "sint32", index: 2 },
                        width: { type: "sint32", index: 3 },
                        height: { type: "sint32", index: 4 },
                    },
                },
                layerSettings: {
                    index: 2,
                    // TODO: Technically more like a repeated oneof, but I'm sticking to the restriction (for now) that oneof fields cannot repeat. Also, that restriction is less relevant since I'm representing oneof as a single field instead of a range of fields in a message (but that representation might not change the implementation).
                    type: "message",
                    repeated: true,
                    fields: {
                        BackgroundColorLayer: {
                            index: 1,
                            type: "message",
                            fields: {
                                // TODO: enums (and don't forget about unknown/default enum values, aka enum == 0)
                                selectedState: { index: 1, type: ColorMessage },
                            },
                        },
                        // TODO: CellOutline is not presented to the user yet.
                        // CellOutlineLayer: { index: 2, type: "message", fields: {} },
                        KillerCagesLayer: { index: 3, type: "message", fields: {} },
                        NumberLayer: {
                            index: 4,
                            type: "message",
                            fields: {
                                max: { index: 1, type: "uint32" },
                                negatives: { index: 2, type: "bool" },
                            },
                        },
                        SimpleLineLayer: {
                            index: 5,
                            type: "message",
                            fields: {
                                // TODO: enums
                                pointType: { index: 1, type: "uint32" },
                                stroke: { index: 2, type: ColorMessage },
                            },
                        },
                        ToggleCharactersLayer: {
                            index: 6,
                            type: "message",
                            fields: {
                                // TODO: I don't know if I want to allow toggle characters to have custom characters yet. Maybe I should stick to numbers specifically for now.
                                characters: { index: 1, type: "string" },
                                // TODO: Custom enum
                                displayStyle: { index: 2, type: "uint32" },
                            },
                        },
                    },
                },
                // Separating the layer metadata from their data is better when parsing bad data; most likely only data will be corrupted and not metadata. Also compression will have better opportunities to do well.
                layerData: {
                    index: 3,
                    // TODO: Ditto "repeated oneof" idea from above
                    type: "message",
                    repeated: true,
                    fields: {
                        // Because I decided on a repeated tuple instead of a message with repeated fields, any changes will require an entirely new field.
                        // TODO: I should eventually allow a `type: "tupleColumnEncoded"` that encodes all instances of the first field before all of the second, etc. Only needed to help with compression.
                        // TODO: Would there be some way to use "tupleColumnEncoded" to keep layerData next to layerSettings, but still encode them separately?
                        BackgroundColorLayer: {
                            index: 1,
                            type: "tuple",
                            repeated: true,
                            fields: {
                                point: { index: 1, type: "uint32" },
                                // TODO: enums
                                fill: { index: 2, type: ColorMessage },
                            },
                        },
                        // TODO: CellOutline is not presented to the user yet.
                        // CellOutlineLayer: { index: 2, type: "tuple", repeated: true, fields: {} },
                        KillerCagesLayer: {
                            index: 3,
                            type: "message",
                            repeated: true,
                            fields: {
                                // Technically nullable, but I still just ignore it then
                                points: { index: 1, type: "uint32", repeated: true },
                                state: { index: 2, type: "uint32" },
                            },
                        },
                        NumberLayer: {
                            index: 4,
                            type: "tuple",
                            repeated: true,
                            fields: {
                                point: { index: 1, type: "uint32" },
                                state: { index: 2, type: "uint32" },
                            },
                        },
                        SimpleLineLayer: {
                            index: 5,
                            type: "tuple",
                            repeated: true,
                            fields: {
                                point1: { index: 1, type: "uint32" },
                                point2: { index: 2, type: "uint32" }, // TODO: encode second point as a vector offset from the first
                                stroke: { index: 3, type: ColorMessage },
                            },
                        },
                        ToggleCharactersLayer: {
                            index: 6,
                            type: "tuple",
                            repeated: true,
                            fields: {
                                point: { index: 1, type: "uint32" },
                                // TODO: It's a bitmap of allowed characters.
                                state: { index: 2, type: "uint32" },
                            },
                        },
                    },
                },
            },
        },
    },
});
