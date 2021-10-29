export class NumberLayer {
    // -- Identification --
    static id = "Number";
    static unique = false;
    hidden = false;

    // -- Controls --
    controls = "onePoint";
    pointTypes = ["cells"];
    controllingLayer = "Selections";

    interpretKeyDown({ event, storage, points }) {
        // TODO: relies on internal methods (storage.onePoint)
        const objects = points.map((point) => ({
            point,
            state: this._nextState(storage.onePoint[this.id][point], event),
        }));
        storage.addObjects({ layer: this, objects });
    }

    // TODO: This will be a dynamic object that can be changed by the user
    settings = {
        match: (number) => 0 <= number && number < 16 && number,
    };
    _nextState(state, event) {
        if (
            event.code === "-" ||
            event.code === "+" ||
            event.code === "Backspace" ||
            event.code === "Delete"
        ) {
            // TODO
            return state;
        } else {
            return (
                this.settings.match(
                    parseInt(state + event.key.toLowerCase())
                ) ||
                this.settings.match(parseInt(event.key.toLowerCase(), 36)) ||
                state
            );
        }
    }

    defaultRenderOrder = 6;

    getBlits({ grid, storage }) {
        const objects = storage
            .getLayerObjects({ layer: this })
            .filter(({ state }) => state !== undefined);

        const { cells } = grid.getPoints({
            connections: { cells: { svgPoint: true } },
            points: objects.map(({ point }) => point),
        });

        return [
            {
                blitter: "text",
                blits: objects.map(({ point, state }) => ({
                    text: state,
                    point: cells[point].svgPoint,
                })),
                style: {
                    originX: "center",
                    originY: "center",
                    size: 60,
                },
            },
        ];
    }
}
