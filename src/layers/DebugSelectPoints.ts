import { isEqual } from "lodash";
import { LineBlits } from "../components/SVGCanvas/Line";
import { Delta, Layer, LayerClass, LayerProps, Point } from "../types";
import { BaseLayer } from "./BaseLayer";

interface DebugSelectPointsProps extends LayerProps {
    TempStorage: { previousPoint: Point; newPoints: Point[] };
    ObjectState: { points: Point[] };
    RawSettings: { straight: boolean; diagonal: boolean; knight: boolean };
}

interface IDebugSelectPointsLayer extends Layer<DebugSelectPointsProps> {
    settings: {
        deltas: Delta[];
    };
}

// There is only one line object in storage at any point (the previous is always deleted)
const Line_ID = "objectId";

export class DebugSelectPointsLayer
    extends BaseLayer<DebugSelectPointsProps>
    implements IDebugSelectPointsLayer
{
    static ethereal = true;
    static readonly type = "DebugSelectPointsLayer";
    static displayName = "DEBUG: Select Points";

    static controls = undefined;
    static constraints = {
        schema: {
            type: "object",
            properties: {
                straight: { type: "boolean" },
                diagonal: { type: "boolean" },
                knight: { type: "boolean" },
            },
        },
        uischemaElements: [
            { type: "Control", label: "Straight", scope: "#/properties/straight" },
            { type: "Control", label: "Diagonal", scope: "#/properties/diagonal" },
            { type: "Control", label: "Knight", scope: "#/properties/knight" },
        ],
    };

    static defaultSettings: IDebugSelectPointsLayer["rawSettings"] = {
        straight: true,
        diagonal: false,
        knight: false,
    };

    settings: IDebugSelectPointsLayer["settings"] = { deltas: [] };

    newSettings: IDebugSelectPointsLayer["newSettings"] = ({ newSettings }) => {
        this.rawSettings = newSettings;
        this.settings = { deltas: [] };

        if (newSettings.straight) {
            this.settings.deltas.push(
                { dx: 0, dy: 2 },
                { dx: 0, dy: -2 },
                { dx: 2, dy: 0 },
                { dx: -2, dy: 0 },
            );
        }
        if (newSettings.diagonal) {
            this.settings.deltas.push(
                { dx: 2, dy: 2 },
                { dx: 2, dy: -2 },
                { dx: -2, dy: 2 },
                { dx: -2, dy: -2 },
            );
        }
        if (newSettings.knight) {
            this.settings.deltas.push(
                { dx: 2, dy: 4 },
                { dx: 2, dy: -4 },
                { dx: -2, dy: 4 },
                { dx: -2, dy: -4 },
                { dx: 4, dy: 2 },
                { dx: 4, dy: -2 },
                { dx: -4, dy: 2 },
                { dx: -4, dy: -2 },
            );
        }

        return { history: [{ object: null, id: Line_ID }] };
    };

    static create = ((puzzle): DebugSelectPointsLayer => {
        return new DebugSelectPointsLayer(DebugSelectPointsLayer, puzzle);
    }) satisfies LayerClass<DebugSelectPointsProps>["create"];

    gatherPoints: IDebugSelectPointsLayer["gatherPoints"] = ({
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
            deltas: this.settings.deltas,
        });

        if (!tempStorage.previousPoint) {
            tempStorage.previousPoint = newPoints.shift();
            if (!tempStorage.previousPoint) return [];
        }

        if (isEqual(tempStorage.newPoints, newPoints)) return [];
        tempStorage.newPoints = newPoints;

        return [tempStorage.previousPoint, ...newPoints];
    };

    handleEvent: IDebugSelectPointsLayer["handleEvent"] = (event) => {
        // TODO: Include a circle on pointer down/up to give more precise information
        if (event.type === "pointerDown" || event.type === "pointerMove") {
            return {
                history: [
                    {
                        id: Line_ID,
                        batchId: "ignore",
                        storageMode: "ui",
                        object: { points: event.points },
                    },
                ],
            };
        }
        return {};
    };

    getBlits() {
        return [];
    }

    getOverlayBlits: IDebugSelectPointsLayer["getOverlayBlits"] = ({ grid, storage, settings }) => {
        const object = storage
            .getStored<DebugSelectPointsProps>({ grid, layer: this })
            .objects.get(Line_ID);

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
