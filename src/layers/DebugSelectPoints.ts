import { Delta, FormSchema, Layer, LayerClass, LayerProps, Point, SVGGroup } from "../types";
import { zip } from "../utils/data";
import { Vec } from "../utils/math";
import { BaseLayer } from "./BaseLayer";
import styles from "./layers.module.css";

interface DebugSelectPointsProps extends LayerProps {
    TempStorage: { previousPoint: Point; start: Vec; end: Vec };
    ObjectState: { points: Point[]; start: Vec; end: Vec };
    RawSettings: { straight: boolean; diagonal: boolean; knight: boolean };
}

interface IDebugSelectPointsLayer extends Layer<DebugSelectPointsProps> {
    settings: {
        deltas: Delta[];
    };
}

// Object ids (there is only one copy of each at a time)
const LINE_ID = "line";
const START_ID = "start";
const END_ID = "end";

export class DebugSelectPointsLayer
    extends BaseLayer<DebugSelectPointsProps>
    implements IDebugSelectPointsLayer
{
    static ethereal = true;
    static readonly type = "DebugSelectPointsLayer";
    static displayName = "DEBUG: Select Points";

    static controls = undefined;
    static constraints: FormSchema<DebugSelectPointsProps> = {
        elements: [
            { type: "boolean", key: "straight", desc: "Straight" },
            { type: "boolean", key: "diagonal", desc: "Diagonal" },
            { type: "boolean", key: "knight", desc: "Knight" },
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

        return { history: [{ object: null, id: LINE_ID }] };
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

        if (!tempStorage.start) {
            tempStorage.start = new Vec(cursor.x, cursor.y);
        }
        tempStorage.end = new Vec(cursor.x, cursor.y);
        return [tempStorage.previousPoint, ...newPoints];
    };

    handleEvent: IDebugSelectPointsLayer["handleEvent"] = (event) => {
        // TODO: Include a circle on pointer down/up to give more precise information
        if (event.type === "pointerDown" || event.type === "pointerMove") {
            const { start, end } = event.tempStorage;
            return {
                history: [
                    {
                        id: LINE_ID,
                        batchId: "ignore",
                        storageMode: "ui",
                        object: { points: event.points, start: start!, end: end! },
                    },
                ],
            };
        }
        return {};
    };

    getSVG() {
        return [];
    }

    getOverlaySVG: IDebugSelectPointsLayer["getOverlaySVG"] = ({ grid, storage, settings }) => {
        const object = storage
            .getStored<DebugSelectPointsProps>({ grid, layer: this })
            .objects.get(LINE_ID);

        if (!object?.points.length) {
            return [];
        }
        if (object.points.length === 1) {
            // TODO: Draw a circle to mark the start
            return [];
        }

        const elements: SVGGroup["elements"] = new Map();
        const pt = grid.getPointTransformer(settings);
        const [map, points] = pt.fromPoints("cells", object.points);
        const cells = points.toSVGPoints();

        for (const [_start, _end] of zip(object.points, object.points.slice(1))) {
            const start = cells.get(map.get(_start));
            const end = cells.get(map.get(_end));
            if (!start || !end) break;

            const [x1, y1] = start;
            const [x2, y2] = end;
            elements.set(_end, { x1, y1, x2, y2, className: styles.debugSelectPoints });
        }

        const pointElements: SVGGroup["elements"] = new Map([
            [
                START_ID,
                {
                    cx: object.start.x,
                    cy: object.start.y,
                    r: 5,
                    className: styles.debugSelectPointsCircles,
                },
            ],
            [
                END_ID,
                {
                    cx: object.end.x,
                    cy: object.end.y,
                    r: 5,
                    className: styles.debugSelectPointsCircles,
                },
            ],
        ]);

        return [
            { id: "path", type: "line", elements },
            { id: "start", type: "circle", elements: pointElements },
        ];
    };
}
