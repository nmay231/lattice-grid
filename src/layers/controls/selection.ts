import {
    Layer,
    LayerEventEssentials,
    LayerHandlerResult,
    LayerProps,
    PartialHistoryAction,
    Point,
    SVGGroup,
} from "../../types";
import { notify } from "../../utils/notifications";
import { stringifyAnything } from "../../utils/string";
import styles from "../layers.module.css";
import { LayerGOOFy, layerIsGOOFy } from "../traits/gridOrObjectFirst";

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
        arg: Omit<LayerEventEssentials<LP>, "tempStorage"> & { points: Point[] },
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
    // {gridOrObjectFirst}: {gridOrObjectFirst: GridOrObject}
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    arg: any, // TODO
) => {
    type SelectedLayer = Layer<LP> & KeyDownEventHandler<LP>;
    const gatherPoints: SelectedLayer["gatherPoints"] = function ({
        grid,
        settings,
        cursor,
        tempStorage,
    }) {
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

    const handleEvent: SelectedLayer["handleEvent"] = function (this: SelectedLayer, event) {
        const { grid, storage, tempStorage, settings } = event;
        const internal = storage.getStored<InternalProps>({ grid, layer: { id: layerId } });
        let history: PartialHistoryAction<LP, InternalProps["ObjectState"]>[];
        const allPoints = internal.keys("question");

        switch (event.type) {
            case "cancelAction": {
                history = [...allPoints].map((id) => obj({ id, object: null }));
                return { history };
            }
            // TODO: Deprecate in favor of layerGOOFy.eventPlaceSinglePointObjects, and keybinds
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
                            obj({ id, object: allPoints.includes(id) ? null : { state: 1 } }),
                        );
                    return {
                        history,
                    };
                }

                throw notify.error({
                    title: "selection controls",
                    message: `Keypress events should not be handled in handleEvent layer.id=${this.id}`,
                });
            }
            case "pointerDown":
            case "pointerMove": {
                if (layerIsGOOFy(this)) {
                    if (this.settings.gridOrObjectFirst === "object") {
                        // TODO: Get the layer to switch to onePoint.handleEventsCurrentSetting but after it can handle a generic settings key ("currentCharacter" instead of "selectedState"). I do that instead of adapting selection to do it because other layers will decide between one of the two onePoint handlers.
                        return this.handleKeyDown(event);
                    }
                }
                internal.permStorage.groupNumber = internal.permStorage.groupNumber || 1;
                const currentPoints = internal.keys("question");
                const ids = event.points;

                if (event.ctrlKey || event.shiftKey) {
                    if (tempStorage.targetState === undefined) {
                        // If targetState is undefined, there can only be one id
                        const id = ids[0];
                        if (currentPoints.includes(id)) {
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
                            .filter((id) => currentPoints.includes(id))
                            .map((id) => obj({ id, object: null }));
                    } else {
                        const groupsToMerge = new Set(
                            ids.map((id) => internal.getObject(settings.editMode, id)?.state),
                        );
                        const allIds = ids
                            .filter((id) => !currentPoints.includes(id))
                            .concat(
                                [...currentPoints].filter((id) =>
                                    groupsToMerge.has(
                                        internal.getObject(settings.editMode, id).state,
                                    ),
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
                        const oldIds = [...currentPoints];
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
                        history: [obj({ id: [...internal.keys("question")][0], object: null })],
                    };
                }
                return {};
            }
            case "undoRedo": {
                const newIds = event.actions.map(({ objectId: id }) => id);
                // Clear old selection
                const history = [...internal.keys("question")]
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
                        this.displayName
                    }: ${stringifyAnything(event)}`,
                });
            }
        }
    };

    const getOverlaySVG: SelectedLayer["getOverlaySVG"] = function ({ grid, storage, settings }) {
        // TODO: Selection can be made by multiple layers, but not all layers support the same cells/corners selection. In the future, I need to filter the points by the type of points selectable by the current layer.
        const stored = storage.getStored<InternalProps>({ grid, layer: { id: layerId } });
        const points = stored.keys("question");
        const states = points.map((id) => stored.getObject(settings.editMode, id).state);
        const pt = grid.getPointTransformer(settings);

        const elements: SVGGroup["elements"] = new Map();

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

    type GOOFySelectedLayer = SelectedLayer & LayerGOOFy<LP>;
    const eventPlaceSinglePointObjects: GOOFySelectedLayer["eventPlaceSinglePointObjects"] =
        function (this: GOOFySelectedLayer, event) {
            const { storage, grid } = event;
            const internal = storage.getStored<InternalProps>({ grid, layer: { id: layerId } });
            const allPoints = internal.keys("question");
            const actions = this.handleKeyDown({ ...event, points: [...allPoints] });
            const batchId = storage.getNewBatchId();

            return {
                ...actions,
                history: (actions.history || []).map((action) => ({
                    ...action,
                    // Batch all of the external layer's actions together
                    batchId,
                })),
            };
        };

    return { gatherPoints, handleEvent, getOverlaySVG, eventPlaceSinglePointObjects };
};
