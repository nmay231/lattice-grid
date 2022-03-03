import { handlePointerEventUnorderedSets } from "./controls/multiPoint";

export class KillerCagesLayer {
    static id = "Killer Cages";
    static unique = false;
    hidden = false;

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
            // TODO: keep the Minus sign as part of an inProgress object and remove it when we deselect things.
            return match(-1 * state) || "-";
        } else if (event.code === "Plus" || event.code === "Equal") {
            return match(state && Math.abs(state));
        } else if ("1234567890".indexOf(event.key) === -1) {
            return match(parseInt(event.key, 36)) || state;
        } else {
            // TODO: Instead of appending the current key to the end of the number if it simply matches, I could try making it time based.
            return (
                match(parseInt(state + event.key)) ||
                match(parseInt(event.key)) ||
                state
            );
        }
    }

    newSettings({ newSettings, grid, storage }) {
        // this.rawSettings = newSettings;

        handlePointerEventUnorderedSets(this, {
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
            const { cageOutline, cells } = grid.getPoints({
                connections: {
                    cells: {
                        shrinkwrap: {
                            key: "cageOutline",
                            svgPolygons: { inset: 5 },
                        },
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
                // TODO: always select top-right corner instead of the first point added to the object
                const point = object.points[0];
                const { svgPoint, maxRadius } = cells[point];
                // const center = cells[point].svgPoint, radius = cells[point].
                const corner = [
                    svgPoint[0] - 0.8 * maxRadius,
                    svgPoint[1] - 0.8 * maxRadius,
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
                    strokeWidth: 2,
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
}
