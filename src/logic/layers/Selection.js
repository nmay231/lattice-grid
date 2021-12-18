export class SelectionLayer {
    // -- Identification --
    static id = "Selections";
    static unique = true;
    hidden = true;

    // -- Controls --
    controls = "onePoint";
    pointTypes = ["cells"];
    states = [true];
    drawMultiple = true;

    handleKeyDown({ event, storingLayer, grid, storage }) {
        const stored = storage.getStored({ grid, layer: this });

        const ids = stored.renderOrder;
        let history = null;
        if (event.code === "Escape") {
            history = ids.map((id) => ({
                action: "delete",
                id,
            }));
        } else if (event.ctrlKey && event.key === "a") {
            history = grid.getAllPoints("cells").map((id) => ({
                action: "add",
                object: { id, state: true, point: id },
            }));
        } else if (event.ctrlKey && event.key === "i") {
            const all = grid.getAllPoints("cells");
            history = all.map((id) => {
                if (id in stored.objects) {
                    return { action: "delete", id };
                } else {
                    return {
                        action: "add",
                        object: { id, state: true, point: id },
                    };
                }
            });
        }

        if (history !== null) {
            return { history };
        }

        const actions = storingLayer?.handleKeyDown({
            event,
            storingLayer,
            grid,
            storage,
            ids,
        });

        // TODO: Do I ever need to modify two layers at once?
        return { ...actions, storingLayer };
    }

    handlePointerEvent({ grid, storage, event }) {
        const stored = storage.getStored({ grid, layer: this });

        if (event.type === "unfocusPointer") {
            return {
                discontinueInput: true,
                history: stored.renderOrder.map((id) => ({
                    action: "delete",
                    id,
                })),
            };
        } else if (
            event.type === "stopPointer" ||
            event.type === "cancelPointer"
        ) {
            if (stored.temporary.removeSingle) {
                return {
                    discontinueInput: true,
                    history: [{ action: "delete", id: stored.renderOrder[0] }],
                };
            }
            return { discontinueInput: true };
        }
        stored.temporary.blacklist = stored.temporary.blacklist ?? [];
        const ids = grid
            .selectPointsWithCursor({
                cursor: event.cursor,
                lastPoint: stored.temporary.lastPoint,
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
            })
            .filter((id) => stored.temporary.blacklist.indexOf(id) === -1);

        if (!ids.length) {
            return {};
        }
        stored.temporary.lastPoint = ids[ids.length - 1];
        stored.temporary.blacklist.push(...ids);

        let history;
        if (event.ctrlKey || event.shiftKey) {
            if (stored.temporary.targetState === undefined) {
                // If targetState is undefined, there can only be one id
                const [id] = ids;
                if (id in stored.objects) {
                    stored.temporary.targetState = null;
                    history = [{ action: "delete", id }];
                } else {
                    stored.temporary.targetState = true;
                    history = [
                        {
                            action: "add",
                            object: { id, state: true, point: id },
                        },
                    ];
                }
            } else if (stored.temporary.targetState === null) {
                history = ids
                    .filter((id) => id in stored.objects)
                    .map((id) => ({ action: "delete", id }));
            } else {
                // TODO: When I change the SelectionLayer to use numbers instead of true, I'll have to set ALL the states of the old group to the state of the new group
                history = ids
                    .filter((id) => !(id in stored.objects))
                    .map((id) => ({
                        action: "add",
                        object: { id, state: true, point: id },
                    }));
            }
        } else {
            const removeOld = stored.temporary.targetState === undefined;
            stored.temporary.targetState = true;
            stored.temporary.removeSingle = false;
            history = [];

            if (removeOld) {
                const oldIds = stored.renderOrder;
                history = oldIds
                    .filter((toDelete) => ids.indexOf(toDelete) === -1)
                    .map((toDelete) => ({ action: "delete", id: toDelete }));

                if (oldIds.length === 1 && oldIds[0] === ids[0]) {
                    stored.temporary.removeSingle = true;
                }
            }

            history.push(
                ...ids.map((id) => ({
                    action: "add",
                    object: { id, state: true, point: id },
                }))
            );
        }

        return { history };
    }

    defaultRenderOrder = 9;

    getBlits({ grid, stored }) {
        const points = stored.renderOrder.filter(
            (key) => stored.objects[key].state
        );

        let blits = {};
        if (points.length) {
            const { selectionCage } = grid.getPoints({
                connections: {
                    cells: {
                        shrinkwrap: {
                            key: "selectionCage",
                            svgPolygons: { inset: 5 },
                        },
                    },
                },
                points,
            });

            blits = selectionCage.svgPolygons;
        }
        return [
            {
                id: "selection",
                blitter: "polygon",
                blits,
                style: {
                    stroke: "#00F9",
                    strokeWidth: 8,
                    strokeLinecap: "round",
                    fill: "none",
                },
            },
        ];
    }
}
