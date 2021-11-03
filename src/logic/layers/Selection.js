export class SelectionLayer {
    // -- Identification --
    static id = "Selections";
    static unique = true;
    hidden = true;

    // -- Controls --
    controls = "onePoint";
    pointTypes = ["cells"];
    states = [false, true];
    drawMultiple = true;

    interpretKeyDown({ event, layer, grid, storage }) {
        const selections = storage
            .getLayerObjects({ layer: this })
            .filter(({ state }) => state)
            .map(({ point }) => point);
        if (event.code === "Escape") {
            if (selections.length) {
                storage.addObjects({
                    layer: this,
                    objects: selections.map((point) => ({
                        point,
                        state: this.states[0],
                    })),
                });
            }
            return;
        } else if (event.ctrlKey && event.key === "a") {
            storage.addObjects({
                layer: this,
                objects: grid.getAllPoints("cells").map((point) => ({
                    point,
                    state: this.states[1],
                })),
            });
            return;
        } else if (event.ctrlKey && event.key === "i") {
            storage.addObjects({
                layer: this,
                objects: selections.map((point) => ({
                    point,
                    state: this.states[0],
                })),
            });
            storage.addObjects({
                layer: this,
                objects: grid
                    .getAllPoints("cells")
                    .filter((cell) => !selections.includes(cell))
                    .map((point) => ({
                        point,
                        state: this.states[1],
                    })),
            });
            return;
        }

        if (layer.interpretKeyDown) {
            layer.interpretKeyDown({ event, storage, points: selections });
        }
    }

    // TODO: This is impure. There should be an object on storage that layers can use to store state per grid.
    targetState = null;

    interpretPointerEvent({ storage, points, newPoint, event }) {
        if (!newPoint) {
            this.targetState = null;
            return;
        }
        if (event.ctrlKey || event.shiftKey) {
            if (this.targetState === null) {
                const currentState = storage.getObject({
                    layer: this,
                    point: newPoint,
                }).state;
                this.targetState = !currentState;
            }
            storage.addObjects({
                layer: this,
                objects: [{ point: newPoint, state: this.targetState }],
            });
        } else {
            const toDelete = storage
                .getLayerObjects({ layer: this })
                .filter(({ state }) => state)
                .map(({ point }) => point);
            if (toDelete.length) {
                storage.addObjects({
                    layer: this,
                    objects: toDelete.map((point) => ({
                        point,
                        state: this.states[0],
                    })),
                });
            }
            if (toDelete.length !== 1 || toDelete[0] !== newPoint) {
                storage.addObjects({
                    layer: this,
                    objects: points.map((point) => ({
                        point,
                        state: this.states[1],
                    })),
                });
            }
        }
    }

    defaultRenderOrder = 9;

    getBlits({ grid, storage }) {
        const points = storage
            .getLayerObjects({ layer: this })
            .filter(({ state }) => state)
            .map(({ point }) => point);

        let blits = {};
        if (points.length) {
            const { selectionCage } = grid.getPoints({
                connections: {
                    cells: {
                        shrinkwrap: {
                            key: "selectionCage",
                            svgPolygon: { inset: 5 },
                        },
                    },
                },
                points,
            });

            for (let loop of selectionCage.svgPolygon) {
                // TODO: This is stupid. Replace with uuid or something...
                blits[Math.floor(Math.random() * 100000)] = loop.map(
                    ({ x, y }) => [x, y]
                );
            }
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
