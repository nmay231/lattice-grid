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
        const id = grid.nearestPoint({
            to: event.cursor,
            intersection: "polygon",
            pointTypes: ["cells"],
            blacklist: stored.temporary.blacklist,
        });
        if (!id) {
            return {};
        }
        stored.temporary.blacklist = stored.temporary.blacklist ?? [];
        stored.temporary.blacklist.push(id);

        let history;
        if (event.ctrlKey || event.shiftKey) {
            if (stored.temporary.targetState === undefined) {
                stored.temporary.targetState =
                    id in stored.objects ? null : true;
            }

            if (stored.temporary.targetState === null && id in stored.objects) {
                history = [{ action: "delete", id }];
            } else if (stored.temporary.targetState !== null) {
                // TODO: When I change the SelectionLayer to use numbers instead of true, I'll have to set ALL the states of the old group to the state of the new group
                history = [
                    { action: "add", object: { id, state: true, point: id } },
                ];
            }
        } else {
            const removeOld = stored.temporary.targetState === undefined;
            stored.temporary.targetState = true;
            stored.temporary.removeSingle = false;
            history = [];

            if (removeOld) {
                const ids = stored.renderOrder;
                history = ids
                    .filter((toDelete) => toDelete !== id)
                    .map((toDelete) => ({ action: "delete", id: toDelete }));

                if (ids.length === 1 && ids[0] === id) {
                    stored.temporary.removeSingle = true;
                }
            }

            history.push({
                action: "add",
                object: { id, state: true, point: id },
            });
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
