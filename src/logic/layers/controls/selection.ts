import {
    IncompleteHistoryAction,
    Keypress,
    Layer,
    LayerEventEssentials,
    LayerHandlerResult,
    LayerProps,
    Point,
} from "../../../types";
import { errorNotification } from "../../../utils/DOMUtils";

export interface SelectedProps extends LayerProps {
    TempStorage: {
        blacklist: Point[];
        previousPoint: Point;
        targetState: null | number;
        removeSingle: boolean;
    };
}

export interface InternalProps extends LayerProps {
    ExtraLayerStorageProps: { groupNumber: number };
    ObjectState: { state: number };
}

export type KeyDownEventHandler<LP extends SelectedProps = SelectedProps> = {
    handleKeyDown: (
        arg: LayerEventEssentials<LP> & Keypress & { points: Point[] },
    ) => LayerHandlerResult<LP>;
};

export const SELECTION_ID = "Selection";
const layerId = SELECTION_ID;

export const handleEventsSelection = <LP extends SelectedProps>(
    layer: Layer<LP> & KeyDownEventHandler<LP>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    arg: any, // TODO
) => {
    layer.gatherPoints = (event) => {
        const { grid, tempStorage } = event;
        let newPoints = grid.selectPointsWithCursor({
            cursor: event.cursor,
            previousPoint: tempStorage.previousPoint,
            pointTypes: ["cells"],
            // TODO: Change deltas to Finite State Machine
            // Also, figure out how cutting corners will happen
            deltas: [
                { dx: 0, dy: 2 },
                { dx: 0, dy: -2 },
                { dx: 2, dy: 0 },
                { dx: -2, dy: 0 },
                { dx: 2, dy: 2 },
                { dx: 2, dy: -2 },
                { dx: -2, dy: 2 },
                { dx: -2, dy: -2 },
            ],
        });

        if (!newPoints.length) return [];
        tempStorage.previousPoint = newPoints[newPoints.length - 1];

        const blacklist = tempStorage.blacklist || ([] as Point[]);
        tempStorage.blacklist = blacklist;
        newPoints = newPoints.filter((id) => blacklist.indexOf(id) === -1);
        if (!newPoints.length) return [];

        tempStorage.blacklist.push(...newPoints);

        return newPoints;
    };

    layer.handleEvent = (event) => {
        const { grid, storage, tempStorage } = event;
        const internal = storage.getStored<InternalProps>({ grid, layer: { id: layerId } });
        let history: IncompleteHistoryAction<LP, InternalProps["ObjectState"]>[];

        switch (event.type) {
            case "cancelAction": {
                history = internal.renderOrder.map((id) => ({
                    id,
                    layerId,
                    batchId: "ignore" as const,
                    object: null,
                }));
                return { discontinueInput: true, history };
            }
            case "delete":
            case "keyDown": {
                if (event.keypress === "ctrl-a") {
                    history = grid.getAllPoints("cells").map((id) => ({
                        id,
                        // layerId,
                        batchId: "ignore" as const,
                        object: { state: 1 },
                    }));
                    return {
                        history,
                    };
                } else if (event.keypress === "ctrl-i") {
                    history = grid.getAllPoints("cells").map((id) => ({
                        id,
                        layerId,
                        batchId: "ignore" as const,
                        object: id in internal.objects ? null : { state: 1 },
                    }));
                    return {
                        history,
                    };
                }

                const actions = layer.handleKeyDown({ ...event, points: internal.renderOrder });
                const batchId = storage.getNewBatchId();

                return {
                    ...actions,
                    history: (actions.history || []).map((action) => ({
                        ...action,
                        // Batch all of the external layer's actions together
                        batchId,
                    })),
                    discontinueInput: true,
                };
            }
            case "pointerDown":
            case "pointerMove": {
                internal.extra.groupNumber = internal.extra.groupNumber || 1;
                const ids = event.points;

                if (event.ctrlKey || event.shiftKey) {
                    if (tempStorage.targetState === undefined) {
                        // If targetState is undefined, there can only be one id
                        const id = ids[0];
                        if (id in internal.objects) {
                            tempStorage.targetState = null;
                            history = [
                                {
                                    id,
                                    layerId,
                                    batchId: "ignore" as const,
                                    object: null,
                                },
                            ];
                        } else {
                            internal.extra.groupNumber += 1;
                            tempStorage.targetState = internal.extra.groupNumber;
                            history = [
                                {
                                    id,
                                    layerId,
                                    batchId: "ignore" as const,
                                    object: { state: internal.extra.groupNumber },
                                },
                            ];
                        }
                    } else if (tempStorage.targetState === null) {
                        history = ids
                            .filter((id) => id in internal.objects)
                            .map((id) => ({
                                id,
                                layerId,
                                batchId: "ignore" as const,
                                object: null,
                            }));
                    } else {
                        const groupsToMerge = new Set(ids.map((id) => internal.objects[id]?.state));
                        const allIds = ids
                            .filter((id) => !(id in internal.objects))
                            .concat(
                                internal.renderOrder.filter((id) =>
                                    groupsToMerge.has(internal.objects[id].state),
                                ),
                            );
                        const state = tempStorage.targetState;
                        history = allIds.map((id) => ({
                            id,
                            layerId,
                            batchId: "ignore" as const,
                            object: { state },
                        }));
                    }
                } else {
                    const removeOld = tempStorage.targetState === undefined;
                    internal.extra.groupNumber = 2;
                    tempStorage.targetState = internal.extra.groupNumber;
                    tempStorage.removeSingle = false;
                    history = [];

                    if (removeOld) {
                        const oldIds = internal.renderOrder;
                        history = oldIds
                            .filter((toDelete) => ids.indexOf(toDelete) === -1)
                            .map((toDelete) => ({
                                id: toDelete,
                                layerId,
                                batchId: "ignore" as const,
                                object: null,
                            }));

                        if (oldIds.length === 1 && oldIds[0] === ids[0]) {
                            tempStorage.removeSingle = true;
                        }
                    }

                    const state = internal.extra.groupNumber;
                    history.push(
                        ...ids.map((id) => ({
                            id,
                            layerId,
                            batchId: "ignore" as const,
                            object: { state },
                        })),
                    );
                }

                return { history };
            }
            case "pointerUp": {
                if (tempStorage.removeSingle) {
                    return {
                        discontinueInput: true,
                        history: [
                            {
                                id: internal.renderOrder[0],
                                layerId,
                                batchId: "ignore" as const,
                                object: null,
                            },
                        ],
                    };
                }
                return { discontinueInput: true };
            }
            case "undoRedo": {
                const newIds = event.actions.map(({ id }) => id);
                // Clear old selection
                const history: IncompleteHistoryAction[] = internal.renderOrder
                    // TODO: This doesn't account for actions that do not apply to external layer. Do I need to fix?
                    .filter((oldId) => newIds.indexOf(oldId) === -1)
                    .map((oldId) => ({
                        id: oldId,
                        layerId,
                        batchId: "ignore" as const,
                        object: null,
                    }));

                internal.extra.groupNumber = 2;
                // Select the objects being modified in the undo/redo actions
                history.push(
                    ...newIds.map((id) => ({
                        id,
                        layerId,
                        batchId: "ignore" as const,
                        // TODO: This implicitly removes group information (b/c state=2). However, it seems really difficult to resolve unless selections are kept in history, but that opens up a whole can of worms.
                        object: { state: 2 },
                    })),
                );
                return { history, discontinueInput: true };
            }
            default: {
                throw errorNotification({
                    message: `Unknown event.type in selected layer ${layer.displayName}: ${
                        (event as any).type
                    }`,
                    forever: true,
                });
            }
        }
    };

    layer.getOverlayBlits = ({ grid, storage }) => {
        // TODO: Selection can be made by multiple layers, but not all layers support the same cells/corners selection. In the future, I need to filter the points by the type of points selectable by the current layer.
        const stored = storage.getStored<InternalProps>({ grid, layer: { id: layerId } });
        const points = stored.renderOrder.filter((key) => stored.objects[key].state);
        const states = points.map((id) => stored.objects[id].state);

        const blits: Record<string, any> = {};
        if (points.length) {
            for (const group of new Set(states)) {
                const { selectionCage } = grid.getPoints({
                    connections: {
                        cells: {
                            shrinkwrap: {
                                key: "selectionCage",
                                svgPolygons: { inset: 3 },
                            },
                        },
                    },
                    points: states.filter((state) => state === group).map((_, i) => points[i]),
                });

                for (const key in selectionCage.svgPolygons) {
                    blits[`${group}-${key}`] = {
                        points: selectionCage.svgPolygons[key],
                    };
                }
            }
        }
        return [
            {
                id: "selection",
                blitter: "polygon",
                blits,
                style: {
                    stroke: "#00F9",
                    strokeWidth: 6,
                    strokeLinejoin: "round",
                    fill: "none",
                },
                renderOnlyWhenFocused: true,
            },
        ];
    };
};
