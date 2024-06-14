import { toUint8Array } from "js-base64";
import { LayerStorage } from "../LayerStorage";
import { PuzzleManager } from "../PuzzleManager";
import { SquareGrid } from "../grids/SquareGrid";
import { availableLayers } from "../layers";
import { Color, ObjectId, Point, PointType } from "../types";
import { zipDefined } from "../utils/data";
import { notify } from "../utils/notifications";
import { stringifyAnything } from "../utils/string";
import { PuzzleEncoder } from "./puzzleEncoder";

interface BackgroundColorV1 {
    PermStorage: Record<string, never>;
    ObjectState: { state: Color };
    Settings: { selectedState: Color };
}

interface KillerCagesV1 {
    PermStorage: Record<string, never>;
    ObjectState: { points: Point[]; state: string | null };
}

interface NumberLayerV1 {
    PermStorage: Record<string, never>;
    ObjectState: { state: string };
    Settings: {
        max: number;
        // negatives: boolean
    };
}

interface SimpleLineV1 {
    PermStorage: Record<string, never>;
    ObjectState: {
        stroke: Color;
        points: Point[];
        pointType: PointType;
    };
    Settings: {
        pointType: PointType;
        stroke: Color;
    };
}

interface ToggleCharactersV1 {
    PermStorage: Record<string, never>;
    ObjectState: { state: string };
    Settings: {
        currentCharacter: string | null;
        displayStyle: "center" | "topBottom";
    };
}

type LatestPuzzleData = {
    grid: {
        type: "square";
        width: number;
        height: number;
    };
    layers: Array<
        | {
              type: "BackgroundColorLayer";
              settings: BackgroundColorV1["Settings"];
              objects: LayerStorage<BackgroundColorV1>;
          }
        | {
              type: "KillerCagesLayer";
              settings?: never;
              objects: LayerStorage<KillerCagesV1>;
          }
        // TODO
        // | {
        //     type: "CellOutlineLayer",
        // }
        | {
              type: "NumberLayer";
              settings: NumberLayerV1["Settings"];
              objects: LayerStorage<NumberLayerV1>;
          }
        | {
              type: "SimpleLineLayer";
              settings: SimpleLineV1["Settings"];
              objects: LayerStorage<SimpleLineV1>;
          }
        | {
              type: "TopBottomMarksLayer";
              settings?: never;
              objects: LayerStorage<ToggleCharactersV1>;
          }
        | {
              type: "CenterMarksLayer";
              settings?: never;
              objects: LayerStorage<ToggleCharactersV1>;
          }
        // | {
        //       type: "ToggleCharactersLayer";
        //       settings: ToggleCharactersV1["Settings"];
        //       objects: LayerStorage<ToggleCharactersV1>;
        //   }
    >;
    nonfatalErrors: ParseError[];
};

type ParseError = {
    title: string;
    internalMessage: string;
    context: any;
};

const parseError = (title: string, internalMessage: string, context?: any): ParseError => ({
    title,
    internalMessage,
    context,
});

export const importPuzzleData = (
    puzzle: Pick<
        PuzzleManager,
        | "grid"
        | "resetLayers"
        | "addLayer"
        | "storage"
        | "renderChange"
        | "resizeCanvas"
        | "answers"
    >,
    text: string,
): void => {
    const data = extractPuzzleData(text);
    if ("internalMessage" in data) {
        throw notify.error({
            title: `Error: ${data.title}`,
            // TODO: Put data.context into a expandable section of the notification
            message: `${data.internalMessage}; ${stringifyAnything(data.context)}`,
        });
    }

    for (const error of data.nonfatalErrors) {
        notify.error({
            title: `Error: ${error.title}`,
            // TODO: Put error.context into a expandable section of the notification
            message: `${error.internalMessage}; ${stringifyAnything(error.context)}`,
        });
    }

    puzzle.resetLayers();
    puzzle.grid.setParams({ ...data.grid, minX: 0, minY: 0 });

    for (const layer of data.layers) {
        const layerId = puzzle.addLayer(availableLayers[layer.type], null, layer.settings);
        puzzle.answers.set(layerId, Object.fromEntries(layer.objects.entries("answer")));
        layer.objects.clearGroup("answer");
        puzzle.storage.objects[layerId] = layer.objects;
    }

    puzzle.resizeCanvas();
    puzzle.renderChange({ type: "draw", layerIds: "all" });
};

const concatIfUndefinedThenMessage = (...possiblyUndefined: Array<[any, string]>): string => {
    return possiblyUndefined
        .map(([missing, message]) => (missing === undefined ? message : ""))
        .join(", ");
};

export const extractPuzzleData = (inputText: string): LatestPuzzleData | ParseError => {
    const array = toUint8Array(inputText);
    let data;
    try {
        data = PuzzleEncoder.decode(array);
    } catch (error) {
        return parseError("Malformed puzzle string", "Failed when decoding", {
            inputText,
            array,
            error,
        });
    }

    const nonfatalErrors = [] as LatestPuzzleData["nonfatalErrors"];
    if (data.uncompressedV1) {
        const { layers, squareGridParams } = data.uncompressedV1;
        if (!squareGridParams || !layers) {
            const missing = concatIfUndefinedThenMessage(
                [layers, "layer data"],
                [squareGridParams, "grid size"],
            );
            const message = `Message did not include: ${missing}, which are required for a valid puzzle.`;
            return parseError("Missing data", message, { data });
        }

        // TODO: Will instantiating two grids (one here, and one for real) bite me in the butt later?
        const grid = new SquareGrid({ ...squareGridParams, minX: 0, minY: 0, type: "square" });
        const encoder = grid.getEncoder({ cellSize: 2 }); // TODO: Hardcoded cellSize
        const outputLayers = [] as LatestPuzzleData["layers"];

        for (const layerEnum of layers) {
            if (layerEnum.BackgroundColorLayer) {
                const layer = layerEnum.BackgroundColorLayer;
                if (!layer.selectedState || !layer.dataV1) {
                    const missing = concatIfUndefinedThenMessage(
                        [layer.selectedState, "selected state setting"],
                        [layer.dataV1, "layer data"],
                    );
                    nonfatalErrors.push({
                        title: "Failed to interpret data for BackgroundColorLayer",
                        internalMessage: `Some necessary data was missing: ${missing}`,
                        context: { ...layerEnum },
                    });
                    continue;
                }

                const map = encoder.decodeGridPointsInsideGrid(
                    "cells",
                    layer.dataV1.map(({ point }) => point),
                );

                const objects = new LayerStorage<BackgroundColorV1>();
                const decodedObjects = layer.dataV1.map(({ fill, point }) => [
                    map[point].string(),
                    { state: encoder.decodeColor(fill) },
                ]) satisfies ReturnType<(typeof objects)["entries"]>;

                if (layer.answersAtEnd && layer.answersAtEnd <= decodedObjects.length) {
                    const split = decodedObjects.length - layer.answersAtEnd;
                    objects.setEntries("question", decodedObjects.slice(0, split));
                    objects.setEntries("answer", decodedObjects.slice(split));
                } else {
                    objects.setEntries("question", decodedObjects);
                }

                outputLayers.push({
                    type: "BackgroundColorLayer",
                    settings: { selectedState: encoder.decodeColor(layer.selectedState) },
                    objects,
                });
            } else if (layerEnum.KillerCagesLayer) {
                const layer = layerEnum.KillerCagesLayer;
                if (!layer.dataV1) {
                    nonfatalErrors.push({
                        title: "Failed to interpret data for KillerCagesLayer",
                        internalMessage: `Missing layer data`,
                        context: { ...layerEnum },
                    });
                    continue;
                }

                const objects = new LayerStorage<KillerCagesV1>();
                objects.setEntries(
                    "question",
                    layer.dataV1
                        .map(({ points, state }) => {
                            if (!points) return null;

                            const map = encoder.decodeGridPointsInsideGrid("cells", points);
                            const stringPoints = points.map((number) => map[number].string());
                            return [
                                stringPoints.join(","),
                                {
                                    points: stringPoints,
                                    state: state === undefined ? null : `${state}`,
                                },
                            ] satisfies [ObjectId, KillerCagesV1["ObjectState"]];
                        })
                        .filter(Boolean),
                );

                outputLayers.push({
                    type: "KillerCagesLayer",
                    objects,
                });
            } else if (layerEnum.NumberLayer) {
                const layer = layerEnum.NumberLayer;
                if (
                    !layer.dataV1 ||
                    layer.max === undefined
                    //  || layer.negatives === undefined
                ) {
                    const missing = concatIfUndefinedThenMessage(
                        [layer.max, "max value setting"],
                        // [layer.negatives, "allow negatives setting"],
                        [layer.dataV1, "layer data"],
                    );
                    nonfatalErrors.push({
                        title: "Failed to interpret data for NumberLayer",
                        internalMessage: `Some necessary data was missing: ${missing}`,
                        context: { ...layerEnum },
                    });
                    continue;
                }

                const map = encoder.decodeGridPointsInsideGrid(
                    "cells",
                    layer.dataV1.map(({ point }) => point),
                );

                const objects = new LayerStorage<NumberLayerV1>();
                const decodedObjects = layer.dataV1.map(({ point, unsignedState }) => [
                    map[point].string(),
                    { state: `${unsignedState}` },
                ]) satisfies ReturnType<(typeof objects)["entries"]>;

                if (layer.answersAtEnd && layer.answersAtEnd <= decodedObjects.length) {
                    const split = decodedObjects.length - layer.answersAtEnd;
                    objects.setEntries("question", decodedObjects.slice(0, split));
                    objects.setEntries("answer", decodedObjects.slice(split));
                } else {
                    objects.setEntries("question", decodedObjects);
                }

                // if (layer.negatives > 1) {
                //     nonfatalErrors.push({
                //         title: "Unexpected number in boolean value in NumberLayer",
                //         internalMessage: `NumberLayer.negatives should be a boolean (0 or 1) but got ${layer.negatives}`,
                //         context: {},
                //     });
                // }

                outputLayers.push({
                    type: "NumberLayer",
                    settings: {
                        max: layer.max,
                        // negatives: !!layer.negatives
                    },
                    objects,
                });
            } else if (layerEnum.SimpleLineLayer) {
                const layer = layerEnum.SimpleLineLayer;
                if (!layer.stroke || !layer.pointType || !layer.dataV1 || !layer.downRightBitmap) {
                    const missing = concatIfUndefinedThenMessage(
                        [layer.stroke, "stroke color setting"],
                        [layer.pointType, "connection setting"],
                        [layer.dataV1, "layer data"],
                        [layer.downRightBitmap, "parts of layer data"],
                    );
                    nonfatalErrors.push({
                        title: "Failed to interpret data for SimpleLine",
                        internalMessage: `Some necessary data was missing: ${missing}`,
                        context: { ...layerEnum },
                    });
                    continue;
                }

                const pointType = encoder.decodePointType(layer.pointType);
                const pointMap = encoder.decodeAdjacentGridPointsInsideGrid(
                    pointType,
                    layer.dataV1.flatMap(({ startingPoint }) => startingPoint),
                    layer.downRightBitmap,
                );

                const objects = new LayerStorage<SimpleLineV1>();
                const decodedObjects: Array<ReturnType<(typeof objects)["entries"]>[number]> = [];
                for (const [{ stroke }, pair] of zipDefined(layer.dataV1, pointMap)) {
                    const points = [pair[0].string(), pair[1].string()];
                    decodedObjects.push([
                        points.join(";"),
                        {
                            stroke: encoder.decodeColor(stroke),
                            points,
                            pointType,
                        },
                    ]);
                }

                if (layer.answersAtEnd && layer.answersAtEnd <= decodedObjects.length) {
                    const split = decodedObjects.length - layer.answersAtEnd;
                    objects.setEntries("question", decodedObjects.slice(0, split));
                    objects.setEntries("answer", decodedObjects.slice(split));
                } else {
                    objects.setEntries("question", decodedObjects);
                }

                outputLayers.push({
                    type: "SimpleLineLayer",
                    settings: { pointType, stroke: encoder.decodeColor(layer.stroke) },
                    objects,
                });
            } else if (layerEnum.ToggleCharactersLayer) {
                const layer = layerEnum.ToggleCharactersLayer;
                if (
                    // !layer.dataV1 ||
                    layer.whichSubClass === undefined
                ) {
                    const missing = concatIfUndefinedThenMessage(
                        // [layer.dataV1, "layer data"],
                        [layer.whichSubClass, "center or top/bottom setting"],
                    );
                    const message = `Message did not include: ${missing}, which is required for a valid puzzle.`;
                    nonfatalErrors.push(parseError("Missing data", message, { data }));
                    continue;
                } else if (layer.whichSubClass !== 1 && layer.whichSubClass !== 2) {
                    const message =
                        "Only center or top/bottom marks are supported for toggle characters";
                    nonfatalErrors.push(parseError("Internal error", message, { data }));
                    continue;
                }

                // TODO: ToggleCharacters cannot have any question objects anyways, for now
                // const pointMap = encoder.decodeGridPointsInsideGrid(
                //     "cells",
                //     layer.dataV1.map(({ point }) => point),
                // );

                // const objects = new LayerStorage<ToggleCharactersV1>();
                // objects.setEntries(
                //     "question",
                //     layer.dataV1.map(({ state: bitArray, point }) => {
                //         // TODO: Make this a method of grid encoder? Probably. I just need to stop procrastinating on this.
                //         // zero is less common, but still must be first in this string
                //         const state = [
                //             !!(bitArray & 0b10_0000_0000) && "0",
                //             !!(bitArray & 0b00_0000_0001) && "1",
                //             !!(bitArray & 0b00_0000_0010) && "2",
                //             !!(bitArray & 0b00_0000_0100) && "3",
                //             !!(bitArray & 0b00_0000_1000) && "4",
                //             !!(bitArray & 0b00_0001_0000) && "5",
                //             !!(bitArray & 0b00_0010_0000) && "6",
                //             !!(bitArray & 0b00_0100_0000) && "7",
                //             !!(bitArray & 0b00_1000_0000) && "8",
                //             !!(bitArray & 0b01_0000_0000) && "9",
                //         ]
                //             .filter(Boolean)
                //             .join("");
                //         return [pointMap[point].string(), { state }];
                //     }),
                // );

                const objects = new LayerStorage<ToggleCharactersV1>();
                outputLayers.push({
                    type: layer.whichSubClass === 1 ? "CenterMarksLayer" : "TopBottomMarksLayer",
                    objects,
                });
            } else {
                const context = { layerEnum, arrayLength: layerEnum.UnknownLayer?.length };
                nonfatalErrors.push(parseError("Unknown layer", "Unknown layer", context));
            }
        }

        return {
            layers: outputLayers,
            grid: { type: "square", ...squareGridParams },
            nonfatalErrors,
        };
    } else {
        return parseError(
            "Data Incomplete",
            "No valid puzzle version found in data (are you from the future?)",
            { inputText, data },
        );
    }
};
