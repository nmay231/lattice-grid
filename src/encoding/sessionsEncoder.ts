import type { CreateSubtypeOf, EditMode } from "../types";
import { Encoder, type DescriptionToObject, type Encoding, type TopLevel } from "./protoButt";
import { layers, type EncodedLayer } from "./puzzleEncoder";

type CleanedSharedFields = CreateSubtypeOf<
    DescriptionToObject<{ type: "message"; fields: typeof sharedFields }>,
    {
        grid: { square: { width: number; height: number } };
        layers: Array<EncodedLayer>;
        currentLayerIndex: number;
        // answerCheck: [{ layerIndex: number }];
    }
>;
const sharedFields = {
    grid: {
        index: 1,
        type: "enum",
        fields: {
            square: {
                index: 1,
                type: "tuple",
                fields: {
                    width: { type: "uint32", index: 0 },
                    height: { type: "uint32", index: 1 },
                },
            },
        },
    },
    layers: { ...layers, index: 2 },
    currentLayerIndex: { index: 3, type: "uint32" },
    // answerCheck: {
    //     index: 4,
    //     type: "enum",
    //     repeated: true,
    //     fields: { layerIndex: { index: 1, type: "uint32" } },
    // },
} as const satisfies TopLevel<Encoding>["fields"];

export type CleanedSessionMetadata = CreateSubtypeOf<
    DescriptionToObject<(typeof sessionsEncoder)["encoding"]>,
    {
        myAuthorName: string;
        joinedOn: string;
        myPuzzles: Array<{
            id: number;
            author: string;
            title: string;
            created: string;
            edited: string;
            // TODO: Make it required?
            svgPreviewString?: string;
        }>;
        solvingPuzzles: Array<{
            searchParams: string;
            author: string;
            title: string;
            firstSolved: string;
        }>;
    }
>;
export const sessionsEncoder = Encoder.create({
    index: 0,
    type: "message",
    fields: {
        myAuthorName: { index: 2, type: "string" },
        /** UTC string of when user first loaded the page. Mostly a fun fact, e.g. allows for "user since [date]" */
        joinedOn: { index: 3, type: "string" },
        /** Newest first */
        myPuzzles: {
            index: 10,
            type: "message",
            repeated: true,
            fields: {
                // TODO: Unix timestamp overflow in 2038 (mostly an issue of sorting by date, though less so since the data is sorted in as an array here), handle puzzles created at the same time (mostly an issue of a shared account or multiple devices).
                /** usually the unix timestamp at creation time, except in the rare case of collisions, though it will increment until no more collisions or something like that */
                id: { index: 1, type: "uint32" },
                author: { index: 2, type: "string" },
                title: { index: 3, type: "string" },
                /** UTC string */
                created: { index: 4, type: "string" },
                /** UTC string */
                edited: { index: 5, type: "string" },

                svgPreviewString: { index: 6, type: "string" },
                // TODO
                // rules: {index: 5, type: "string"},
            },
        },
        // TODO: Actually, sorting by newest first doesn't really matter unless I allow listing puzzles that the user is solving... I guess that's not a terrible idea...
        /** Newest first */
        solvingPuzzles: {
            index: 11,
            type: "message",
            repeated: true,
            fields: {
                // TODO: I had no idea what should go here. Probably only things that aren't recoverable from the url like undo-history?
                /** Everything after the `?`. Used as the key into localStorage */
                searchParams: { index: 1, type: "string" },
                author: { index: 2, type: "string" },
                title: { index: 3, type: "string" },
                /** UTC string, or undefined if not solved */
                firstSolved: { index: 4, type: "string" },
            },
        },
    },
});

// TODO: This will eventually cause an error when the encoded data (likely due to a large undo-history) becomes too large for the prefixed length to be encoded.
export type EditPuzzleEncoding = CreateSubtypeOf<
    DescriptionToObject<(typeof editPuzzleEncoder)["encoding"]>,
    CleanedSharedFields & {
        editMode: EditMode;
        historyV1: Array<never>;
    }
>;
export const editPuzzleEncoder = Encoder.create({
    index: 0,
    type: "message",
    fields: {
        ...sharedFields,
        editMode: { index: 20, type: "string" },
        historyV1: {
            index: 21,
            type: "tuple",
            repeated: true,
            fields: {
                // TODO
            },
        },
    },
});

export type SolvePuzzleEncoding = CreateSubtypeOf<
    DescriptionToObject<(typeof solvePuzzleEncoder)["encoding"]>,
    CleanedSharedFields & {
        editMode: EditMode;
    }
>;
export const solvePuzzleEncoder = Encoder.create({
    index: 0,
    type: "message",
    fields: {
        ...sharedFields,
        editMode: { index: 20, type: "string" },
    },
});
