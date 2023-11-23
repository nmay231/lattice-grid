import { Encoder, Encoding, Scalar, TopLevel } from "./customProtobuf";

const ColorEnum = {
    type: "enum",
    fields: {
        UNKNOWN: { index: 0, type: "unit" },
        LIGHT_GREEN: { index: 1, type: "unit" },
        LIGHT_BLUE: { index: 2, type: "unit" },
        LIGHT_YELLOWORANGE: { index: 3, type: "unit" },
        LIGHT_RED: { index: 4, type: "unit" },
        LIGHT_PURPLE: { index: 5, type: "unit" },
        LIGHT_GRAY: { index: 6, type: "unit" },
        LIGHT_WHITE: { index: 7, type: "unit" },
        DARK_GREEN: { index: 8, type: "unit" },
        DARK_BLUE: { index: 9, type: "unit" },
        DARK_YELLOWORANGE: { index: 10, type: "unit" },
        DARK_RED: { index: 11, type: "unit" },
        DARK_PURPLE: { index: 12, type: "unit" },
        DARK_GRAY: { index: 13, type: "unit" },
        DARK_WHITE: { index: 14, type: "unit" },
    },
} as const satisfies TopLevel<Encoding>;

const PointScalar = {
    type: "uint32",
} as const satisfies TopLevel<Scalar>;

const PointTypeScalar = {
    type: "enum",
    fields: {
        unknown: { index: 0, type: "unit" },
        cells: { index: 1, type: "unit" },
        corners: { index: 2, type: "unit" },
        // TODO: edges, any combination of those three types, special subsets of those types, etc.
    },
} as const satisfies TopLevel<Encoding>;

const AdjacentPointPair = {
    type: "uint32",
} as const satisfies TopLevel<Scalar>;

const ContiguousPoints = {
    type: "uint32",
    repeated: true,
} as const satisfies TopLevel<Scalar>;

export const PuzzleEncoder = Encoder.create({
    type: "enum",
    fields: {
        uncompressedV1: {
            index: 1,
            type: "message",
            fields: {
                squareGridParams: {
                    index: 1,
                    type: "tuple",
                    fields: {
                        // // TODO: It would be better to only include the height + width but that would require readjusting all points to the origin.
                        // minX: { type: "sint32", index: 1 },
                        // minY: { type: "sint32", index: 2 },
                        width: { type: "uint32", index: 1 },
                        height: { type: "uint32", index: 2 },
                    },
                },
                layers: {
                    index: 2,
                    type: "enum",
                    repeated: true,
                    fields: {
                        // // TODO: This really isn't necessary I think because if I get an unknown layer, that means I'm gonna consume the rest of the data stream (ortreat the new layer data as ) and therefore the whole thing is botched. But I guess I'll keep it for the sake of validating enums have the zero value.
                        // TODO: This is more because I will enforce enums always have a zero value, but maybe I could use this for alpha-version layers
                        UnknownLayer: { index: 0, type: "bytes" },
                        BackgroundColorLayer: {
                            index: 1,
                            type: "message",
                            fields: {
                                selectedState: { index: 1, ...ColorEnum },
                                dataV1: {
                                    index: 10,
                                    type: "tuple",
                                    repeated: true,
                                    fields: {
                                        point: { index: 1, ...PointScalar },
                                        fill: { index: 2, ...ColorEnum },
                                    },
                                },
                            },
                        },
                        // TODO: CellOutline is not presented to the user yet.
                        // CellOutlineLayer: { index: 2, type: "message", fields: {} },
                        KillerCagesLayer: {
                            index: 3,
                            type: "message",
                            fields: {
                                dataV1: {
                                    index: 10,
                                    type: "message",
                                    repeated: true,
                                    fields: {
                                        points: { index: 1, ...ContiguousPoints },
                                        state: { index: 2, type: "uint32" },
                                    },
                                },
                            },
                        },
                        NumberLayer: {
                            index: 4,
                            type: "message",
                            fields: {
                                max: { index: 1, type: "uint32" },
                                negatives: { index: 2, type: "bool" },
                                dataV1: {
                                    index: 10,
                                    type: "tuple",
                                    repeated: true,
                                    fields: {
                                        point: { index: 1, ...PointScalar },
                                        state: { index: 2, type: "uint32" },
                                    },
                                },
                            },
                        },
                        SimpleLineLayer: {
                            index: 5,
                            type: "message",
                            fields: {
                                // TODO: enums
                                pointType: { index: 1, ...PointTypeScalar },
                                stroke: { index: 2, ...ColorEnum },
                                dataV1: {
                                    index: 10,
                                    type: "tuple",
                                    repeated: true,
                                    fields: {
                                        pair: { index: 1, ...AdjacentPointPair },
                                        stroke: { index: 3, ...ColorEnum },
                                    },
                                },
                            },
                        },
                        ToggleCharactersLayer: {
                            index: 6,
                            type: "message",
                            fields: {
                                // For now, ToggleCharacters will be interacted with using a subclass
                                whichSubClass: { index: 1, type: "uint32" },
                                dataV1: {
                                    index: 10,
                                    type: "tuple",
                                    repeated: true,
                                    fields: {
                                        point: { index: 1, ...PointScalar },
                                        // TODO: It's a bitmap of allowed characters.
                                        state: { index: 2, type: "uint32" },
                                    },
                                },
                                // // TODO: I don't know if I want to allow toggle characters to have custom characters yet. Maybe I should stick to numbers specifically for now.
                                // characters: { index: 1, type: "string" },
                                // // TODO: Custom enum
                                // displayStyle: { index: 2, type: "uint32" },
                            },
                        },
                    },
                },
            },
        },
    },
});
