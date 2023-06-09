import {
    Keypress,
    Layer,
    LayerEventEssentials,
    LayerHandlerResult,
    LayerProps,
    PartialHistoryAction,
    Point,
    PolygonSVGGroup,
} from "../../types";
import { notify } from "../../utils/notifications";
import { stringifyAnything } from "../../utils/string";
import styles from "../layers.module.css";

export interface SelectedProps extends LayerProps {
    TempStorage: {
        blacklist: Point[];
        previousPoint: Point;
        targetState: null | number;
        removeSingle: boolean;
    };
}

export interface InternalProps extends LayerProps {
    PermStorage: { groupNumber: number };
    ObjectState: { state: number };
}

export type KeyDownEventHandler<LP extends SelectedProps = SelectedProps> = {
    handleKeyDown: (
        arg: LayerEventEssentials<LP> & Keypress & { points: Point[] },
    ) => LayerHandlerResult<LP>;
};

export const SELECTION_ID = "Selection";
const layerId = SELECTION_ID;

const obj = <LP extends SelectedProps>({
    id,
    object,
}: {
    id: string;
    object: InternalProps["ObjectState"] | null;
}): PartialHistoryAction<LP> => ({
    id,
    layerId,
    object,
    batchId: "ignore",
    storageMode: "question",
});
export const _selectionObjMaker = obj; // For testing.

export const handleEventsSelection = <LP extends SelectedProps>(
    layer: Layer<LP> & KeyDownEventHandler<LP>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    arg: any, // TODO
) => {
    layer.gatherPoints = ({ grid, settings, cursor, tempStorage }) => {
        let newPoints = grid.selectPointsWithCursor({
            settings,
            cursor,
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

        const blacklist: Point[] = tempStorage.blacklist || [];
        tempStorage.blacklist = blacklist;
        newPoints = newPoints.filter((id) => blacklist.indexOf(id) === -1);
        if (!newPoints.length) return [];

        tempStorage.blacklist.push(...newPoints);

        return newPoints;
    };

    layer.handleEvent = (event) => {
        const { grid, storage, tempStorage } = event;
        const internal = storage.getStored<InternalProps>({ grid, layer: { id: layerId } });
        let history: PartialHistoryAction<LP, InternalProps["ObjectState"]>[];

        switch (event.type) {
            case "cancelAction": {
                history = internal.objects.keys().map((id) => obj({ id, object: null }));
                return { history };
            }
            case "delete":
            case "keyDown": {
                if (event.keypress === "ctrl-a") {
                    history = grid
                        .getAllPoints("cells")
                        .map((id) => obj({ id, object: { state: 1 } }));
                    return {
                        history,
                    };
                } else if (event.keypress === "ctrl-i") {
                    history = grid
                        .getAllPoints("cells")
                        .map((id) =>
                            obj({ id, object: internal.objects.has(id) ? null : { state: 1 } }),
                        );
                    return {
                        history,
                    };
                }

                const actions = layer.handleKeyDown({ ...event, points: internal.objects.keys() });
                const batchId = storage.getNewBatchId();

                return {
                    ...actions,
                    history: (actions.history || []).map((action) => ({
                        ...action,
                        // Batch all of the external layer's actions together
                        batchId,
                    })),
                };
            }
            case "pointerDown":
            case "pointerMove": {
                internal.permStorage.groupNumber = internal.permStorage.groupNumber || 1;
                const ids = event.points;

                if (event.ctrlKey || event.shiftKey) {
                    if (tempStorage.targetState === undefined) {
                        // If targetState is undefined, there can only be one id
                        const id = ids[0];
                        if (internal.objects.has(id)) {
                            tempStorage.targetState = null;
                            history = [obj({ id, object: null })];
                        } else {
                            internal.permStorage.groupNumber += 1;
                            tempStorage.targetState = internal.permStorage.groupNumber;
                            history = [
                                obj({ id, object: { state: internal.permStorage.groupNumber } }),
                            ];
                        }
                    } else if (tempStorage.targetState === null) {
                        history = ids
                            .filter((id) => internal.objects.has(id))
                            .map((id) => obj({ id, object: null }));
                    } else {
                        const groupsToMerge = new Set(
                            ids.map((id) => internal.objects.get(id)?.state),
                        );
                        const allIds = ids
                            .filter((id) => !internal.objects.has(id))
                            .concat(
                                internal.objects
                                    .keys()
                                    .filter((id) =>
                                        groupsToMerge.has(internal.objects.get(id).state),
                                    ),
                            );
                        const state = tempStorage.targetState;
                        history = allIds.map((id) => obj({ id, object: { state } }));
                    }
                } else {
                    const removeOld = tempStorage.targetState === undefined;
                    internal.permStorage.groupNumber = 2;
                    tempStorage.targetState = internal.permStorage.groupNumber;
                    tempStorage.removeSingle = false;
                    history = [];

                    if (removeOld) {
                        const oldIds = internal.objects.keys();
                        history = oldIds
                            .filter((toDelete) => ids.indexOf(toDelete) === -1)
                            .map((toDelete) => obj({ id: toDelete, object: null }));

                        if (oldIds.length === 1 && oldIds[0] === ids[0]) {
                            tempStorage.removeSingle = true;
                        }
                    }

                    const state = internal.permStorage.groupNumber;
                    history.push(...ids.map((id) => obj({ id, object: { state } })));
                }

                return { history };
            }
            case "pointerUp": {
                if (tempStorage.removeSingle) {
                    return {
                        history: [obj({ id: internal.objects.keys()[0], object: null })],
                    };
                }
                return {};
            }
            case "undoRedo": {
                const newIds = event.actions.map(({ objectId: id }) => id);
                // Clear old selection
                const history: PartialHistoryAction[] = internal.objects
                    .keys()
                    // TODO: This doesn't account for actions that do not apply to external layer. Do I need to fix?
                    .filter((oldId) => newIds.indexOf(oldId) === -1)
                    .map((oldId) => obj({ id: oldId, object: null }));

                internal.permStorage.groupNumber = 2;
                // Select the objects being modified in the undo/redo actions
                history.push(
                    // TODO: This implicitly removes group information (b/c state=2). However, it seems really difficult to resolve unless selections are kept in history, but that opens up a whole can of worms.
                    ...newIds.map((id) => obj({ id, object: { state: 2 } })),
                );
                return { history };
            }
            default: {
                throw notify.error({
                    message: `Unknown event in selected layer ${
                        layer.displayName
                    }: ${stringifyAnything(event)}`,
                    forever: true,
                });
            }
        }
    };

    layer.getOverlaySVG = ({ grid, storage, settings }) => {
        // TODO: Selection can be made by multiple layers, but not all layers support the same cells/corners selection. In the future, I need to filter the points by the type of points selectable by the current layer.
        const stored = storage.getStored<InternalProps>({ grid, layer: { id: layerId } });
        const points = stored.objects.keys().filter((key) => stored.objects.get(key).state);
        const states = points.map((id) => stored.objects.get(id).state);
        const pt = grid.getPointTransformer(settings);

        const elements: PolygonSVGGroup["elements"] = new Map();

        if (points.length) {
            const className = styles.selection;
            for (const group of new Set(states)) {
                const [, cells] = pt.fromPoints(
                    "cells",
                    states.map((state, i) => (state === group ? points[i] : null)).filter(Boolean),
                );
                const shrinkwrap = pt.shrinkwrap(cells, { inset: 3 });

                for (const [key, points] of Object.entries(shrinkwrap)) {
                    elements.set(`${group}-${key}`, { className, points: points.join(" ") });
                }
            }
        }
        return [{ id: "selection", type: "polygon", elements }];
    };
};