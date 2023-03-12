import { isEqual } from "lodash";
import { LineBlits } from "../components/SVGCanvas/Line";
import { Layer, LayerClass, LayerProps, Point } from "../types";
import { BaseLayer } from "./BaseLayer";

interface DebugPointerProps extends LayerProps {
    TempStorage: { previousPoint: Point; newPoints: Point[] };
    ObjectState: { points: Point[] };
}

interface IDebugPointerLayer extends Layer<DebugPointerProps> {}

const OBJECT_ID = "objectId";

export class DebugPointerLayer extends BaseLayer<DebugPointerProps> implements IDebugPointerLayer {
    static ethereal = true;
    static readonly type = "DebugPointerLayer";
    static displayName = "DEBUG: Pointer Events";

    static controls = undefined;
    static constraints = undefined;

    static create = ((puzzle): DebugPointerLayer => {
        return new DebugPointerLayer(DebugPointerLayer, puzzle);
    }) satisfies LayerClass<DebugPointerProps>["create"];

    gatherPoints: IDebugPointerLayer["gatherPoints"] = ({
        grid,
        settings,
        cursor,
        tempStorage,
    }) => {
        const newPoints = grid.selectPointsWithCursor({
            settings,
            cursor,
            previousPoint: tempStorage.previousPoint,
            pointTypes: ["cells"],
            // TODO: Make this pluggable with settings
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

        if (!tempStorage.previousPoint) {
            tempStorage.previousPoint = newPoints.shift();
            if (!tempStorage.previousPoint) return [];
        }

        if (isEqual(tempStorage.newPoints, newPoints)) return [];
        tempStorage.newPoints = newPoints;

        return [tempStorage.previousPoint, ...newPoints];
    };

    handleEvent: IDebugPointerLayer["handleEvent"] = (event) => {
        if (event.type === "pointerDown" || event.type === "pointerMove") {
            return {
                history: [
                    {
                        id: OBJECT_ID,
                        batchId: "ignore",
                        storageMode: "ui",
                        object: { points: event.points },
                    },
                ],
            };
        }
        return {};
    };

    newSettings() {
        return {};
    }
    getBlits() {
        return [];
    }

    getOverlayBlits: IDebugPointerLayer["getOverlayBlits"] = ({ grid, storage, settings }) => {
        const object = storage
            .getStored<DebugPointerProps>({ grid, layer: this })
            .objects.get(OBJECT_ID);

        if (!object?.points.length) {
            return [];
        }
        if (object.points.length === 1) {
            // TODO: Draw a circle to mark the start
            return [];
        }

        const blits: LineBlits["blits"] = {};
        const { cells } = grid.getPoints({
            settings,
            connections: { cells: { svgPoint: true } },
            points: object.points,
        });

        for (let index = 0; index < object.points.length - 1; index++) {
            const start = object.points[index];
            const end = object.points[index + 1];
            blits[end] = {
                style: { stroke: "black", strokeWidth: "3px", strokeLinecap: "round" },
                x1: cells[start].svgPoint[0],
                y1: cells[start].svgPoint[1],
                x2: cells[end].svgPoint[0],
                y2: cells[end].svgPoint[1],
            };
        }

        return [{ id: "path", blitter: "line", blits }];
    };
}
