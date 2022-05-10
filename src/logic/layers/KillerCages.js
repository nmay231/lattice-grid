import { handleEventsUnorderedSets } from "./controls/multiPoint";

export class KillerCagesLayer {
    static id = "Killer Cages";
    static unique = false;
    ethereal = false;

    _handleKeyDown({ event, grid, storage }) {
        const stored = storage.getStored({ layer: this, grid });
        const id = stored.currentObjectId;
        const object = { ...stored.objects[id] };
        object.state = this._nextState(object.state ?? "", event);
        return { history: [{ id, object }] };
    }

    _nextState(state, event) {
        // TODO: Add match() to settings? Or better yet, extract the logic of typing in numbers (from the Number layer) and have both use that
        const match = (num) => num;
        if (event.code === "Backspace") {
            return match(state.toString().slice(0, -1));
        } else if (event.code === "Delete") {
            return null;
        } else if (event.code === "Minus") {
            return match(-1 * state) || "-";
        } else if (event.code === "Plus" || event.code === "Equal") {
            return match(state && Math.abs(state));
        } else if ("1234567890".indexOf(event.key) === -1) {
            return match(parseInt(event.key, 36)) || state;
        } else {
            return (
                match(parseInt(state + event.key)) ||
                match(parseInt(event.key)) ||
                state
            );
        }
    }

    newSettings({ newSettings, grid, storage }) {
        // this.rawSettings = newSettings;

        handleEventsUnorderedSets(this, {
            handleKeyDown: this._handleKeyDown.bind(this),
            pointTypes: ["cells"],
            ensureConnected: false, // TODO: Change to true when properly implemented
            allowOverlap: true, // TODO: Change to false when properly implemented
            overwriteOthers: false,
        });
    }

    getBlits({ grid, stored }) {
        const cageBlits = {};
        const numberBlits = {};
        for (let id of stored.renderOrder) {
            const object = stored.objects[id];
            const { cageOutline, cells, sorted } = grid.getPoints({
                connections: {
                    cells: {
                        shrinkwrap: {
                            key: "cageOutline",
                            svgPolygons: { inset: 5 },
                        },
                        sorted: { key: "sorted", direction: "NW" },
                        svgPoint: true,
                        maxRadius: { shape: "square", size: "large" },
                    },
                },
                points: object.points,
            });

            const style =
                id === stored.currentObjectId ? { stroke: "#33F" } : undefined;
            for (let key in cageOutline.svgPolygons) {
                cageBlits[`${object.id}-${key}`] = {
                    style,
                    points: cageOutline.svgPolygons[key],
                };
            }

            if (object.state !== null) {
                const point = sorted[0];
                const { svgPoint, maxRadius } = cells[point];
                const corner = [
                    svgPoint[0] - 0.85 * maxRadius,
                    svgPoint[1] - 0.85 * maxRadius,
                ];
                numberBlits[point] = {
                    text: object.state,
                    point: corner,
                    size: 12,
                };
            }
        }

        return [
            {
                id: "killerCage",
                blitter: "polygon",
                blits: cageBlits,
                style: {
                    strokeDasharray: "7 3",
                    strokeDashoffset: 3.5,
                    stroke: "#333",
                    strokeWidth: 1.8,
                    strokeLinecap: "round",
                    fill: "none",
                },
            },
            {
                id: "numbers",
                blitter: "text",
                blits: numberBlits,
                style: {
                    originX: "left",
                    originY: "top",
                },
            },
        ];
    }

    getOverlayBlits() {
        // TODO
    }
}
