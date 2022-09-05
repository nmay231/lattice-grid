import {
    IncompleteHistoryAction,
    Keypress,
    Layer,
    LayerClass,
    LayerEventEssentials,
    LayerHandlerResult,
    LayerProps,
    NeedsUpdating,
} from "../../types";
import { errorNotification } from "../../utils/DOMUtils";
import { BaseLayer } from "./baseLayer";

export type KeyDownEventHandler<LP extends LayerProps = LayerProps> = {
    handleKeyDown: (
        arg: LayerEventEssentials<LP> & Keypress & { points: string[] },
    ) => LayerHandlerResult;
};

export interface SelectionProps extends LayerProps {
    Type: "SelectionLayer";
    ObjectState: { state: number };
    ExtraLayerStorageProps: { groupNumber: number };
    TempStorage: {
        blacklist: string[];
        previousPoint: string;
        targetState: null | number;
        removeSingle: boolean;
    };
}

export interface ISelectionLayer extends Layer<SelectionProps> {
    attachHandler: <LP extends LayerProps = LayerProps>(
        layer: Layer<LP> & KeyDownEventHandler<LP>,
        options: unknown,
    ) => void;
    _getBlits: NonNullable<Layer<SelectionProps>["getBlits"]>;
}

export class SelectionLayer extends BaseLayer<SelectionProps> implements ISelectionLayer {
    static ethereal = true;
    static unique = true;
    static type = "SelectionLayer" as const;
    static displayName = "Selection";

    id = "Selection";

    static uniqueInstance: SelectionLayer;
    static create: LayerClass<SelectionProps>["create"] = (puzzle) => {
        SelectionLayer.uniqueInstance =
            SelectionLayer.uniqueInstance || new SelectionLayer(SelectionLayer, puzzle);
        return SelectionLayer.uniqueInstance;
    };

    // TODO: Figuring the types for this will be complicated. I don't know how to approach types for multiple layers at the same time.
    attachHandler: ISelectionLayer["attachHandler"] = (layer) => {
        layer.gatherPoints = this.gatherPoints.bind(this);

        layer.handleEvent = (args) =>
            this.handleEvent.call(this, {
                ...args,
                storingLayer: layer,
            } as NeedsUpdating);

        layer.getOverlayBlits = ({ grid, storage, ...rest }) =>
            this._getBlits({
                ...rest,
                grid,
                storage,
            });
    };

    gatherPoints: ISelectionLayer["gatherPoints"] = (event) => {
        const { grid, tempStorage } = event;
        let newPoints = grid.selectPointsWithCursor({
            cursor: event.cursor,
            previousPoint: tempStorage.previousPoint,
            pointTypes: ["cells"],
            // TODO: Change deltas to Finite State Machine
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

        const blacklist = tempStorage.blacklist || [];
        tempStorage.blacklist = blacklist;
        newPoints = newPoints.filter((id) => blacklist.indexOf(id) === -1);
        if (!newPoints.length) return [];

        tempStorage.blacklist.push(...newPoints);

        return newPoints;
    };

    handleEvent: ISelectionLayer["handleEvent"] = (event) => {
        const { grid, storage, tempStorage } = event;
        const stored = storage.getStored<SelectionProps>({ grid, layer: this });

        switch (event.type) {
            case "cancelAction": {
                return {
                    discontinueInput: true,
                    history: stored.renderOrder.map((id) => ({
                        id,
                        layerId: this.id,
                        batchId: "ignore" as const,
                        object: null,
                    })),
                };
            }
            case "delete":
            case "keyDown": {
                const ids = stored.renderOrder;

                let history = null;
                if (event.keypress === "ctrl-a") {
                    history = grid.getAllPoints("cells").map((id: string) => ({
                        id,
                        layerId: this.id,
                        batchId: "ignore" as const,
                        object: { state: 1, point: id },
                    }));
                } else if (event.keypress === "ctrl-i") {
                    const all = grid.getAllPoints("cells");
                    history = all.map((id: string) => {
                        if (id in stored.objects) {
                            return {
                                id,
                                layerId: this.id,
                                batchId: "ignore" as const,
                                object: null,
                            };
                        } else {
                            return {
                                id,
                                layerId: this.id,
                                batchId: "ignore" as const,
                                object: { state: 1, point: id },
                            };
                        }
                    });
                }

                if (history !== null) {
                    return { history };
                }

                const storingLayer: Layer & KeyDownEventHandler = (event as any).storingLayer;

                const actions =
                    storingLayer.handleKeyDown?.({
                        ...event,
                        points: ids,
                    }) || {};

                const batchId = storage.getNewBatchId();

                return {
                    ...actions,
                    history: (actions.history || []).map((action) => ({
                        ...action,
                        // Batch all of the storingLayer's actions together
                        batchId,
                    })),
                    discontinueInput: true,
                };
            }
            case "pointerDown":
            case "pointerMove": {
                stored.groupNumber = stored.groupNumber || 1;
                const ids = event.points;

                let history: IncompleteHistoryAction[];
                if (event.ctrlKey || event.shiftKey) {
                    if (tempStorage.targetState === undefined) {
                        // If targetState is undefined, there can only be one id
                        const id = ids[0];
                        if (id in stored.objects) {
                            tempStorage.targetState = null;
                            history = [
                                {
                                    id,
                                    layerId: this.id,
                                    batchId: "ignore" as const,
                                    object: null,
                                },
                            ];
                        } else {
                            stored.groupNumber += 1;
                            tempStorage.targetState = stored.groupNumber;
                            history = [
                                {
                                    id,
                                    layerId: this.id,
                                    batchId: "ignore" as const,
                                    object: {
                                        state: stored.groupNumber,
                                        point: id,
                                    },
                                },
                            ];
                        }
                    } else if (tempStorage.targetState === null) {
                        history = ids
                            .filter((id) => id in stored.objects)
                            .map((id) => ({
                                id,
                                layerId: this.id,
                                batchId: "ignore" as const,
                                object: null,
                            }));
                    } else {
                        const groupsToMerge = new Set(ids.map((id) => stored.objects[id]?.state));
                        const allIds = ids
                            .filter((id) => !(id in stored.objects))
                            .concat(
                                stored.renderOrder.filter((id) =>
                                    groupsToMerge.has(stored.objects[id].state),
                                ),
                            );
                        history = allIds.map((id) => ({
                            id,
                            layerId: this.id,
                            batchId: "ignore" as const,
                            object: {
                                state: tempStorage.targetState,
                                point: id,
                            },
                        }));
                    }
                } else {
                    const removeOld = tempStorage.targetState === undefined;
                    stored.groupNumber = 2;
                    tempStorage.targetState = stored.groupNumber;
                    tempStorage.removeSingle = false;
                    history = [];

                    if (removeOld) {
                        const oldIds = stored.renderOrder;
                        history = oldIds
                            .filter((toDelete) => ids.indexOf(toDelete) === -1)
                            .map((toDelete) => ({
                                id: toDelete,
                                layerId: this.id,
                                batchId: "ignore" as const,
                                object: null,
                            }));

                        if (oldIds.length === 1 && oldIds[0] === ids[0]) {
                            tempStorage.removeSingle = true;
                        }
                    }

                    history.push(
                        ...ids.map((id) => ({
                            id,
                            layerId: this.id,
                            batchId: "ignore" as const,
                            object: { state: stored.groupNumber, point: id },
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
                                id: stored.renderOrder[0],
                                layerId: this.id,
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
                const history: IncompleteHistoryAction[] = stored.renderOrder
                    // TODO: This doesn't account for actions that do not apply to storingLayer. Do I need to fix?
                    .filter((oldId) => newIds.indexOf(oldId) === -1)
                    .map((oldId) => ({
                        id: oldId,
                        layerId: this.id,
                        batchId: "ignore" as const,
                        object: null,
                    }));

                stored.groupNumber = 2;
                // Select the objects being modified in the undo/redo actions
                history.push(
                    ...newIds.map((id) => ({
                        id,
                        layerId: this.id,
                        batchId: "ignore" as const,
                        // TODO: This implicitly removes group information (b/c state=2). However, it seems really difficult to resolve unless selections are kept in history, but that opens up a whole can of worms.
                        object: { state: 2, point: id },
                    })),
                );
                return { history, discontinueInput: true };
            }
            default: {
                errorNotification({
                    message: `Unknown event.type in SelectionLayer: ${(event as any).type}`,
                    forever: true,
                });
                return {};
            }
        }
    };

    _getBlits: ISelectionLayer["_getBlits"] = ({ grid, storage }) => {
        const stored = storage.getStored<SelectionProps>({ grid, layer: this });
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

    getBlits: ISelectionLayer["getBlits"] = () => {
        return [];
    };

    static controls = undefined;
    static constraints = undefined;

    newSettings: ISelectionLayer["newSettings"] = (settingsChange) => {
        return {};
    };
}
