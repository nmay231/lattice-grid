export class SelectionLayer {
    static id = "Selections";
    static unique = true;
    hidden = true;

    attachHandler(layer, options) {
        // TODO: options
        layer.controllingLayer = this;
        // TODO: Get rid of the controlling/storing heirarchy and do this instead:
        // layer.handleEvent = (args) => this.handleEvent({...args}, layer);
    }

    gatherPoints({ grid, storage, event }) {
        const stored = storage.getStored({ grid, layer: this });

        stored.temporary.blacklist = stored.temporary.blacklist ?? [];
        let newPoints = grid.selectPointsWithCursor({
            cursor: event.cursor,
            previousPoint: stored.temporary.previousPoint,
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
        stored.temporary.previousPoint = newPoints[newPoints.length - 1];
        newPoints = newPoints.filter(
            (id) => stored.temporary.blacklist.indexOf(id) === -1,
        );
        if (!newPoints.length) return;

        stored.temporary.blacklist.push(...newPoints);

        return newPoints;
    }

    handleEvent({ grid, storage, settings, event, storingLayer }) {
        const stored = storage.getStored({ grid, layer: this });

        switch (event.type) {
            case "cancelAction": {
                return {
                    discontinueInput: true,
                    history: stored.renderOrder.map((id) => ({
                        id,
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
                        object: { state: 1, point: id },
                    }));
                } else if (event.ctrlKey && event.key === "i") {
                    const all = grid.getAllPoints("cells");
                    history = all.map((id) => {
                        if (id in stored.objects) {
                            return { id, object: null };
                        } else {
                            return {
                                id,
                                object: { state: 1, point: id },
                            };
                        }
                    });
                }

                if (history !== null) {
                    return { history };
                }

                event.points = ids;

                const { history: subLayerHistory, ...actions } =
                    storingLayer.handleKeyDown?.({
                        grid,
                        storage,
                        settings,
                        event,
                        storingLayer,
                    }) || {};

                return {
                    ...actions,
                    history: (subLayerHistory || []).map((object) => ({
                        layerId: storingLayer.id,
                        ...object,
                    })),
                    discontinueInput: true,
                };
            }
            case "pointerDown":
            case "pointerMove": {
                stored.groupNumber = stored.groupNumber || 1;
                const ids = event.points;

                let history;
                if (event.ctrlKey || event.shiftKey) {
                    if (stored.temporary.targetState === undefined) {
                        // If targetState is undefined, there can only be one id
                        const id = ids[0];
                        if (id in stored.objects) {
                            stored.temporary.targetState = null;
                            history = [{ id, object: null }];
                        } else {
                            stored.groupNumber += 1;
                            stored.temporary.targetState = stored.groupNumber;
                            history = [
                                {
                                    id,
                                    object: {
                                        state: stored.groupNumber,
                                        point: id,
                                    },
                                },
                            ];
                        }
                    } else if (stored.temporary.targetState === null) {
                        history = ids
                            .filter((id) => id in stored.objects)
                            .map((id) => ({ id, object: null }));
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
                            object: {
                                state: stored.temporary.targetState,
                                point: id,
                            },
                        }));
                    }
                } else {
                    const removeOld =
                        stored.temporary.targetState === undefined;
                    stored.groupNumber = 2;
                    stored.temporary.targetState = stored.groupNumber;
                    stored.temporary.removeSingle = false;
                    history = [];

                    if (removeOld) {
                        const oldIds = stored.renderOrder;
                        history = oldIds
                            .filter((toDelete) => ids.indexOf(toDelete) === -1)
                            .map((toDelete) => ({
                                id: toDelete,
                                object: null,
                            }));

                        if (oldIds.length === 1 && oldIds[0] === ids[0]) {
                            stored.temporary.removeSingle = true;
                        }
                    }

                    history.push(
                        ...ids.map((id) => ({
                            id,
                            object: { state: stored.groupNumber, point: id },
                        })),
                    );
                }

                return { history };
            }
            case "pointerUp": {
                if (stored.temporary.removeSingle) {
                    return {
                        discontinueInput: true,
                        history: [{ id: stored.renderOrder[0], object: null }],
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
