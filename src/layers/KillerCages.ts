import { PolygonBlits } from "../components/SVGCanvas/Polygon";
import { TextBlits } from "../components/SVGCanvas/Text";
import { Layer, LayerClass, NeedsUpdating } from "../types";
import { maxReducer } from "../utils/data";
import { FancyVector } from "../utils/math";
import { BaseLayer, methodNotImplemented } from "./BaseLayer";
import {
    handleEventsUnorderedSets,
    MultiPointKeyDownHandler,
    MultiPointLayerProps,
} from "./controls/multiPoint";
import { numberTyper } from "./controls/numberTyper";

interface KillerCagesProps extends MultiPointLayerProps {
    ObjectState: MultiPointLayerProps["ObjectState"] & { state: string | null };
}

interface IKillerCagesLayer extends Layer<KillerCagesProps> {
    _handleKeyDown: MultiPointKeyDownHandler<KillerCagesProps>;
    _numberTyper: ReturnType<typeof numberTyper>;
}

export class KillerCagesLayer extends BaseLayer<KillerCagesProps> implements IKillerCagesLayer {
    static ethereal = false;
    static readonly type = "KillerCagesLayer";
    static displayName = "Killer Cages";
    static defaultSettings = { selectedState: "blue" };

    settings = this.rawSettings;
    handleEvent = methodNotImplemented({ name: "KillerCages.handleEvent" });
    gatherPoints = methodNotImplemented({ name: "KillerCages.gatherPoints" });
    _numberTyper = methodNotImplemented({
        name: "KillerCages._numberTyper",
    }) as IKillerCagesLayer["_numberTyper"];

    static create = ((puzzle): KillerCagesLayer => {
        return new KillerCagesLayer(KillerCagesLayer, puzzle);
    }) satisfies LayerClass<KillerCagesProps>["create"];

    _handleKeyDown: IKillerCagesLayer["_handleKeyDown"] = ({ type, keypress, grid, storage }) => {
        const stored = storage.getStored<KillerCagesProps>({
            layer: this,
            grid,
        });

        if (!stored.permStorage.currentObjectId) return {};

        const id = stored.permStorage.currentObjectId;
        const object = stored.objects.get(id);

        if (type === "delete") {
            if (object.state === null) return {};
            return { history: [{ id, object: { ...object, state: null } }] };
        }

        const states = this._numberTyper([object.state || null], { type, keypress });

        if (states === "doNothing" || states[0] === object.state) {
            return {}; // No change necessary
        }

        const [state] = states;
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
        this._numberTyper = numberTyper({ max: -1, negatives: false });
        return {};
    };

    getBlits: IKillerCagesLayer["getBlits"] = ({ grid, storage, settings }) => {
        const stored = storage.getStored<KillerCagesProps>({
            grid,
            layer: this,
        });
        const group = stored.groups.getGroup(settings.editMode);
        const renderOrder = stored.objects.keys().filter((id) => group.has(id));
        const pt = grid.getPointTransformer(settings);

        const cageBlits: PolygonBlits["blits"] = {};
        const numberBlits: TextBlits["blits"] = {};

        for (const id of renderOrder) {
            const object = stored.objects.get(id);
            const [, cells] = pt.fromPoints("cells", object.points);
            const shrinkwrap = pt.shrinkwrap(cells, { inset: 5 });

            const style =
                id === stored.permStorage.currentObjectId ? { stroke: "#33F" } : undefined;
            for (const [key, wrap] of Object.entries(shrinkwrap)) {
                cageBlits[`${id}-${key}`] = {
                    style,
                    points: wrap,
                };
            }

            if (object.state !== null) {
                const topLeft = pt.sorter({ direction: "NW" });
                const corner = cells.points.reduce(maxReducer(topLeft));

                const maxRadius = pt.maxRadius({ type: "cells", shape: "square", size: "lg" });

                numberBlits[corner.xy.join(",")] = {
                    text: object.state,
                    point: corner
                        .scale(settings.cellSize / 2)
                        .plus(new FancyVector([1, 1]).scale(-0.85 * maxRadius)).xy,
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
