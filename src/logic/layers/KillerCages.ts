import { BaseLayer, ILayer } from "./baseLayer";
import { handleEventsUnorderedSets, MinimalState } from "./controls/multiPoint";
import { KeyDownEventHandler } from "./Selection";

export type ObjectState = MinimalState & { state: string | null };

export type KillerCagesProps = {
    _handleKeyDown: KeyDownEventHandler["handleKeyDown"];
    _nextState: (state: string, keypress: string) => string | number | null;
};

export const KillerCagesLayer: ILayer<ObjectState> & KillerCagesProps = {
    ...BaseLayer,
    id: "Killer Cages",
    unique: false,
    ethereal: false,

    _handleKeyDown({ type, keypress, grid, storage }) {
        const stored = storage.getStored<ObjectState>({ layer: this, grid });
        const id = stored.currentObjectId;
        const object = { ...stored.objects[id] };

        if (type === "delete") {
            if (object.state === null) return {};
            return { history: [{ id, object: { ...object, state: null } }] };
        }

        const state = this._nextState(object.state ?? "", keypress);

        if (state === object.state) {
            return {}; // No change necessary
        }

        object.state = state === null ? null : state.toString();
        return { history: [{ id, object }] };
    },

    _nextState(state, keypress) {
        if (keypress === "Backspace") {
            return state.toString().slice(0, -1) || null;
        } else if (keypress === "Delete") {
            return null;
        } else if (keypress === "-") {
            // TODO: Keep the minus sign as part of an inProgress object and remove it when we deselect things.
            return -1 * parseInt(state) || "-";
        } else if (keypress === "+" || keypress === "=") {
            return Math.abs(parseInt(state)) || null;
        } else if (/^[0-9]$/.test(keypress)) {
            return parseInt(state + keypress);
        } else if (/^[a-fA-F]$/.test(keypress)) {
            return parseInt(keypress.toLowerCase(), 16);
        } else {
            return state || null;
        }
    },

    newSettings() {
        handleEventsUnorderedSets<ObjectState>(this, {
            handleKeyDown: this._handleKeyDown.bind(this),
            pointTypes: ["cells"],
            ensureConnected: false, // TODO: Change to true when properly implemented
            allowOverlap: true, // TODO: Change to false when properly implemented
            overwriteOthers: false,
        });
    },

    getBlits({ grid, stored }) {
        const cageBlits: Record<string, object> = {};
        const numberBlits: Record<string, object> = {};
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
    },

    getOverlayBlits() {
        // TODO: Only render the current Killer Cage when focused
        return [];
    },
};