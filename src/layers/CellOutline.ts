import { Layer, LayerClass, ObjectId, Point } from "../types";
import { BaseLayer, methodNotImplemented } from "./BaseLayer";
import { handleEventsCycleStates, OnePointProps } from "./controls/onePoint";

type ObjectState = true;

interface CellOutlineProps extends OnePointProps<ObjectState> {
    ObjectState: { id: ObjectId; points: Point[]; state: ObjectState };
}

interface ICellOutlineLayer extends Layer<CellOutlineProps> {}

export class CellOutlineLayer extends BaseLayer<CellOutlineProps> implements ICellOutlineLayer {
    static ethereal = true;
    static readonly type = "CellOutlineLayer";
    static displayName = "Cell Outline";

    static uniqueInstance?: CellOutlineLayer;
    static create = ((puzzle): CellOutlineLayer => {
        CellOutlineLayer.uniqueInstance =
            CellOutlineLayer.uniqueInstance || new CellOutlineLayer(CellOutlineLayer, puzzle);
        return CellOutlineLayer.uniqueInstance;
    }) satisfies LayerClass<CellOutlineProps>["create"];

    handleEvent: ICellOutlineLayer["handleEvent"] = methodNotImplemented({
        name: "CellOutline.handleEvent",
    });
    gatherPoints: ICellOutlineLayer["gatherPoints"] = methodNotImplemented({
        name: "CellOutline.gatherPoints",
    });

    static controls = undefined;
    static constraints = undefined;

    newSettings() {
        handleEventsCycleStates(this, {
            states: [true],
            pointTypes: ["cells"],
            // TODO: Change deltas to Finite State Machine
            deltas: [
                { dx: 0, dy: 2 },
                { dx: 0, dy: -2 },
                { dx: 2, dy: 0 },
                { dx: -2, dy: 0 },
            ],
        });
        const handleEvent = this.handleEvent;
        this.handleEvent = (arg) => {
            const result = handleEvent(arg);
            return {
                ...result,
                history: (result.history || []).map((action) => ({
                    ...action,
                    editMode: "question",
                })),
            };
        };
        return {};
    }

    getBlits: ICellOutlineLayer["getBlits"] = ({ grid, storage, settings }) => {
        if (settings.editMode === "answer") return [];

        const stored = storage.getStored<CellOutlineProps>({
            grid,
            layer: this,
        });

        // TODO: Would I eventually support modifying the grid in the answer editMode? Does that even make sense?
        const blacklist = stored.groups.getGroup("question");
        const points = grid.getAllPoints("cells").filter((point) => !blacklist.has(point));
        const { cells, gridEdge } = grid.getPoints({
            settings,
            points,
            connections: {
                cells: {
                    edges: { corners: { svgPoint: true } },
                    shrinkwrap: { key: "gridEdge", svgPolygons: { inset: -4 } },
                },
            },
        });

        const Nothing = { x1: 0, x2: 0, y1: 0, y2: 0 };
        const edges: Record<string, typeof Nothing> = {};
        for (const cell in cells) {
            for (const edge in cells[cell].edges) {
                /* If a cell does not share an edge with another cell, use a thick line. */
                if (edges[edge] === undefined) {
                    edges[edge] = Nothing;
                } else {
                    const corners = cells[cell].edges[edge].corners;
                    const [[x1, y1], [x2, y2]] = Object.values(corners).map(
                        ({ svgPoint }: any) => svgPoint,
                    );
                    edges[edge] = { x1, y1, x2, y2 };
                }
            }
        }

        for (const id in edges) {
            if (edges[id] === Nothing) {
                delete edges[id];
            }
        }

        const outline: Record<string, any> = {};
        for (const key in gridEdge.svgPolygons) {
            outline[key] = { points: gridEdge.svgPolygons[key] };
        }

        return [
            {
                id: "grid",
                blitter: "line",
                blits: edges,
                style: {
                    stroke: "black",
                    strokeWidth: 2,
                    strokeLinecap: "square",
                },
            },
            {
                id: "outline",
                blitter: "polygon",
                blits: outline,
                style: {
                    stroke: "black",
                    strokeWidth: 10,
                    strokeLinejoin: "miter",
                    fill: "none",
                },
            },
        ];
    };
}
