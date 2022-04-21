export class SelectionLayer {
    static id = "Selections";
    static unique = true;
    hidden = true;

    attachHandler(layer, options) {
        layer.gatherPoints = this.gatherPoints.bind(this);
        layer.handleEvent = (args) =>
            this.handleEvent.call(this, { ...args, storingLayer: layer });

        // TODO: This is a temporary solution to handle renderOnlyWhenFocused
        layer.renderIds_TEMP = layer.renderIds_TEMP || [];
        if (layer.renderIds_TEMP.indexOf(this.id) === -1) {
            layer.renderIds_TEMP.push(this.id);
        }
    }

    gatherPoints({ grid, event, tempStorage }) {
        tempStorage.blacklist = tempStorage.blacklist ?? [];
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

        if (!newPoints.length) return;
        tempStorage.previousPoint = newPoints[newPoints.length - 1];
        newPoints = newPoints.filter(
            (id) => tempStorage.blacklist.indexOf(id) === -1,
        );
        if (!newPoints.length) return;

        tempStorage.blacklist.push(...newPoints);

        return newPoints;
    }

    handleEvent({ grid, storage, settings, event, storingLayer, tempStorage }) {
        const stored = storage.getStored({ grid, layer: this });

        switch (event.type) {
            case "cancelAction": {
                return {
                    discontinueInput: true,
                    history: stored.renderOrder.map((id) => ({
                        id,
                        layerId: this.id,
                        object: null,
                    })),
                };
            }
            case "delete":
            case "keyDown": {
                const ids = stored.renderOrder;

                let history = null;
                if (event.ctrlKey && event.key === "a") {
                    history = grid.getAllPoints("cells").map((id) => ({
                        id,
                        layerId: this.id,
                        object: { state: 1, point: id },
                    }));
                } else if (event.ctrlKey && event.key === "i") {
                    const all = grid.getAllPoints("cells");
                    history = all.map((id) => {
                        if (id in stored.objects) {
                            return { id, layerId: this.id, object: null };
                        } else {
                            return {
                                id,
                                layerId: this.id,
                                object: { state: 1, point: id },
                            };
                        }
                    });
                }

                if (history !== null) {
                    return { history };
                }

                event.points = ids;

                const actions =
                    storingLayer.handleKeyDown?.({
                        grid,
                        storage,
                        settings,
                        event,
                        storingLayer,
                    }) || {};

                return {
                    ...actions,
                    discontinueInput: true,
                };
            }
            case "pointerDown":
            case "pointerMove": {
                stored.groupNumber = stored.groupNumber || 1;
                const ids = event.points;

                let history;
                if (event.ctrlKey || event.shiftKey) {
                    if (tempStorage.targetState === undefined) {
                        // If targetState is undefined, there can only be one id
                        const id = ids[0];
                        if (id in stored.objects) {
                            tempStorage.targetState = null;
                            history = [{ id, layerId: this.id, object: null }];
                        } else {
                            stored.groupNumber += 1;
                            tempStorage.targetState = stored.groupNumber;
                            history = [
                                {
                                    id,
                                    layerId: this.id,
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
                                object: null,
                            }));
                    } else {
                        const groupsToMerge = new Set(
                            ids.map((id) => stored.objects[id]?.state),
                        );
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
                                object: null,
                            },
                        ],
                    };
                }
                return { discontinueInput: true };
            }
            default: {
                throw new Error(`Unknown event.type=${event.type}`);
            }
        }
    }

    getBlits({ grid, stored }) {
        const points = stored.renderOrder.filter(
            (key) => stored.objects[key].state,
        );
        const states = points.map((id) => stored.objects[id].state);

        let blits = {};
        if (points.length) {
            for (let group of new Set(states)) {
                const { selectionCage } = grid.getPoints({
                    connections: {
                        cells: {
                            shrinkwrap: {
                                key: "selectionCage",
                                svgPolygons: { inset: 3 },
                            },
                        },
                    },
                    points: states
                        .map((state, i) => (state === group ? points[i] : null))
                        .filter((state) => state),
                });

                for (let key in selectionCage.svgPolygons) {
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
    }
}
