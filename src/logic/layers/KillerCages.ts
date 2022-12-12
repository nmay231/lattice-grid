import { PolygonBlits } from "../../components/SVGCanvas/Polygon";
import { TextBlits } from "../../components/SVGCanvas/Text";
import { Layer, LayerClass, NeedsUpdating } from "../../types";
import { BaseLayer, methodNotImplemented } from "./baseLayer";
import {
    handleEventsUnorderedSets,
    MultiPointKeyDownHandler,
    MultiPointLayerProps,
} from "./controls/multiPoint";
import { DO_NOTHING, numberTyper } from "./controls/numberTyper";

interface KillerCagesProps extends MultiPointLayerProps {
    Type: "KillerCagesLayer";
    ObjectState: MultiPointLayerProps["ObjectState"] & { state: string | null };
}

interface IKillerCagesLayer extends Layer<KillerCagesProps> {
    _handleKeyDown: MultiPointKeyDownHandler<KillerCagesProps>;
    _numberTyper: ReturnType<typeof numberTyper>;
}

export class KillerCagesLayer extends BaseLayer<KillerCagesProps> implements IKillerCagesLayer {
    static ethereal = false;
    static unique = false;
    static type = "KillerCagesLayer" as const;
    static displayName = "Killer Cages";
    static defaultSettings = { selectedState: "blue" };

    settings = this.rawSettings;
    handleEvent = methodNotImplemented({ name: "KillerCages.handleEvent" });
    gatherPoints = methodNotImplemented({ name: "KillerCages.gatherPoints" });
    _numberTyper = methodNotImplemented({
        name: "KillerCages._numberTyper",
    }) as IKillerCagesLayer["_numberTyper"];

    static create: LayerClass<KillerCagesProps>["create"] = (puzzle) => {
        return new KillerCagesLayer(KillerCagesLayer, puzzle);
    };

    _handleKeyDown: IKillerCagesLayer["_handleKeyDown"] = ({ type, keypress, grid, storage }) => {
        const stored = storage.getStored<KillerCagesProps>({
            layer: this,
            grid,
        });

        if (!stored.extra.currentObjectId) return {};

        const id = stored.extra.currentObjectId;
        const object = stored.objects.get(id);

        if (type === "delete") {
            if (object.state === null) return {};
            return { history: [{ id, object: { ...object, state: null } }] };
        }

        const state = this._numberTyper(object.state || "", { type, keypress });

        if (state === object.state || state === DO_NOTHING) {
            return {}; // No change necessary
        }

        return { history: [{ id, object: { ...object, state } }] };
    };

    static controls = undefined;
    static constraints = undefined;

    newSettings: IKillerCagesLayer["newSettings"] = () => {
        handleEventsUnorderedSets(this, {
            handleKeyDown: this._handleKeyDown.bind(this) as NeedsUpdating, // Screw you typescript
            pointTypes: ["cells"],
            ensureConnected: false, // TODO: Change to true when properly implemented
            allowOverlap: true, // TODO: Change to false when properly implemented
            overwriteOthers: false,
        });
        return {};
    };

    getBlits: IKillerCagesLayer["getBlits"] = ({ storage, grid }) => {
        const stored = storage.getStored<KillerCagesProps>({
            grid,
            layer: this,
        });

        const cageBlits: PolygonBlits["blits"] = {};
        const numberBlits: TextBlits["blits"] = {};
        for (const id of stored.objects.keys()) {
            const object = stored.objects.get(id);
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

            const style = id === stored.extra.currentObjectId ? { stroke: "#33F" } : undefined;
            for (const key in cageOutline.svgPolygons) {
                cageBlits[`${object.id}-${key}`] = {
                    style,
                    points: cageOutline.svgPolygons[key],
                };
            }

            if (object.state !== null) {
                const point = sorted[0];
                const { svgPoint, maxRadius } = cells[point];
                const corner = [svgPoint[0] - 0.85 * maxRadius, svgPoint[1] - 0.85 * maxRadius] as [
                    number,
                    number,
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
    };

    getOverlayBlits: IKillerCagesLayer["getOverlayBlits"] = () => {
        // TODO: Only render the current Killer Cage when focused
        return [];
    };
}
