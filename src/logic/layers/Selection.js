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
        if (event.code === "Escape") {
            const toDelete = storage
                .getLayerObjects({ layer: this })
                .filter(({ state }) => state)
                .map(({ point }) => point);
            if (toDelete.length) {
                storage.addObject({
                    layer: this,
                    points: toDelete,
                    state: this.states[0],
                });
            }
            return;
        } else if (event.ctrlKey && event.key === "a") {
            storage.addObject({
                layer: this,
                points: grid.getAllPoints("cells"),
                state: this.states[1],
            });
            return;
        } else if (event.ctrlKey && event.key === "i") {
            const excluded = storage
                .getLayerObjects({ layer: this })
                .filter(({ state }) => state)
                .map(({ point }) => point);
            storage.addObject({
                layer: this,
                points: excluded,
                state: this.states[0],
            });
            storage.addObject({
                layer: this,
                points: grid
                    .getAllPoints("cells")
                    .filter((cell) => !excluded.includes(cell)),
                state: this.states[1],
            });
            return;
        }

        if (!layer.interpretKeyDown) {
            return;
        }
        const { state, interpreted } = layer.interpretKeyDown({ event }) || {};
        if (interpreted) {
            const points = storage
                .getLayerObjects({ layer: this })
                .filter(({ state }) => state)
                .map(({ point }) => point);

            storage.addObject({ layer, points, state });
        }
    }

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
            storage.addObject({
                layer: this,
                points: [newPoint],
                state: this.targetState,
            });
        } else {
            const toDelete = storage
                .getLayerObjects({ layer: this })
                .filter(({ state }) => state)
                .map(({ point }) => point);
            if (toDelete.length) {
                storage.addObject({
                    layer: this,
                    points: toDelete,
                    state: this.states[0],
                });
            }
            if (toDelete.length !== 1 && toDelete[0] !== newPoint) {
                storage.addObject({
                    layer: this,
                    points,
                    state: this.states[1],
                });
            }
        }
    }

    defaultRenderOrder = 9;

    getBlits(grid, storage) {
        const points = storage
            .getLayerObjects({ layer: this })
            .filter(({ state }) => state)
            .map(({ point }) => point);

        let blits = [];
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

            blits = selectionCage.svgPolygon.map((loop) =>
                loop.map(({ x, y }) => [x, y])
            );
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
