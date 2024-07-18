import { Encoder, Encoding, Scalar, TopLevel, type DescriptionToObject } from "./protoButt";

export type EncodedColor = DescriptionToObject<typeof ColorEnum>;
export const ColorEnum = {
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

const BitmapScalar = {
    type: "bytes",
} as const satisfies TopLevel<Scalar>;

export type EncodedPointType = DescriptionToObject<typeof PointTypeScalar>;
const PointTypeScalar = {
    type: "enum",
    fields: {
        unknown: { index: 0, type: "unit" },
        cells: { index: 1, type: "unit" },
        corners: { index: 2, type: "unit" },
        // TODO: edges, any combination of those three types, special subsets of those types, etc.
    },
} as const satisfies TopLevel<Encoding>;

const ContiguousPoints = {
    type: "uint32",
    repeated: true,
} as const satisfies TopLevel<Scalar>;

export type EncodedLayer = DescriptionToObject<typeof layers>[number];
export const layers = {
    index: 2,
    type: "enum",
    repeated: true,
    fields: {
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
                        point: { index: 0, ...PointScalar },
                        fill: { index: 1, ...ColorEnum },
                    },
                },
                answersAtEnd: { index: 20, type: "uint32" },
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
                // negatives: { index: 2, type: "uint32" },
                dataV1: {
                    index: 10,
                    type: "tuple",
                    repeated: true,
                    fields: {
                        point: { index: 0, ...PointScalar },
                        unsignedState: { index: 1, type: "uint32" },
                    },
                },
                answersAtEnd: { index: 20, type: "uint32" },
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
                        startingPoint: { index: 0, ...PointScalar },
                        stroke: { index: 1, ...ColorEnum },
                    },
                },
                downRightBitmap: { index: 11, ...BitmapScalar },
                answersAtEnd: { index: 20, type: "uint32" },
            },
        },
        ToggleCharactersLayer: {
            index: 6,
            type: "message",
            fields: {
                whichSubClass: { index: 1, type: "uint32" },
                // TODO: No `answersAtEnd` because they can't be answer checked just yet.
                dataV1: {
                    index: 10,
                    type: "tuple",
                    repeated: true,
                    fields: {
                        point: { index: 0, ...PointScalar },
                        /** A bitmap of which characters are toggled on */
                        state: { index: 1, type: "uint32" },
                    },
                },

                // TODO: I don't know if I want to allow toggle characters to have custom characters yet. Maybe I should stick to numbers specifically for now.
                // characters: { index: 1, type: "string" },
                // // TODO: Custom enum
                // displayStyle: { index: 2, type: "uint32" },
            },
        },
    },
} as const satisfies Encoding;

export const PuzzleEncoder = Encoder.create({
    index: 0,
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
                        width: { type: "uint32", index: 0 },
                        height: { type: "uint32", index: 1 },
                    },
                },
                layers,
            },
        },
    },
});
