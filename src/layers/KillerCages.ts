import { LayerClass, SVGGroup } from "../types";
import { reduceTo } from "../utils/data";
import { Vec } from "../utils/math";
import { notify } from "../utils/notifications";
import { BaseLayer } from "./BaseLayer";
import {
    MultiPointLayer,
    MultiPointLayerProps,
    MultiPointStorageFilter,
    handleEventsUnorderedSets,
} from "./controls/multiPoint";
import { numberTyper } from "./controls/numberTyper";
import styles from "./layers.module.css";

interface KillerCagesProps extends MultiPointLayerProps {
    ObjectState: MultiPointLayerProps["ObjectState"] & { state: string | null };
    Settings: {
        _numberTyper: ReturnType<typeof numberTyper>;
        storageFilter: MultiPointStorageFilter<KillerCagesProps>;
    };
    HandlesKeyDown: true;
}

interface IKillerCagesLayer extends MultiPointLayer<KillerCagesProps> {}

export class KillerCagesLayer extends BaseLayer<KillerCagesProps> implements IKillerCagesLayer {
    static ethereal = false;
    static readonly type = "KillerCagesLayer";
    static displayName = "Killer Cages";
    static defaultSettings: LayerClass<KillerCagesProps>["defaultSettings"] = {
        _numberTyper: () => {
            throw notify.error({
                message: `${this.type}.settings._numberTyper() called before implementing!`,
            });
        },
        storageFilter: null!,
    };

    static create = ((puzzle): KillerCagesLayer => {
        return new KillerCagesLayer(KillerCagesLayer, puzzle);
    }) satisfies LayerClass<KillerCagesProps>["create"];

    handleKeyDown: IKillerCagesLayer["handleKeyDown"] = ({ type, keypress, grid, storage }) => {
        const stored = storage.getStored<KillerCagesProps>({ grid, layer: this });

        if (!stored.permStorage.currentObjectId) return {};

        const id = stored.permStorage.currentObjectId;
        const object = stored.getObject("question", id);

        if (type === "delete") {
            if (object.state === null) return {};
            return { history: [{ id, object: { ...object, state: null } }] };
        }

        const states = this.settings._numberTyper([object.state || null], { type, keypress });

        if (states === "doNothing" || states[0] === object.state) {
            return {}; // No change necessary
        }

        const [state] = states;
        return { history: [{ id, object: { ...object, state } }] };
    };

    static controls: LayerClass<KillerCagesProps>["controls"] = {
        elements: {},
        numpadControls: true,
    };
    static constraints = undefined;

    static settingsDescription: LayerClass<KillerCagesProps>["settingsDescription"] = {
        // Actually, `derived` is interesting in this case because I don't want it to be serialized, but it's not actually derived from anything (at least yet)
        _numberTyper: { type: "constraints", derived: true },
        storageFilter: { type: "constraints", derived: true },
    };

    static isValidSetting<K extends keyof KillerCagesProps["Settings"]>(
        key: K | string,
        value: unknown,
    ): value is KillerCagesProps["Settings"][K] {
        return false;
    }

    updateSettings: IKillerCagesLayer["updateSettings"] = () => {
        const { gatherPoints, handleEvent, unboundFilter } =
            handleEventsUnorderedSets<KillerCagesProps>({
                pointTypes: ["cells"],
                ensureConnected: true,
                preventOverlap: true,
                // TODO: Add an option for this in global settings?
                overwriteOthers: false,
                previousFilter: this.settings.storageFilter,
            });
        this.gatherPoints = gatherPoints;
        this.handleEvent = handleEvent;

        this.settings.storageFilter = unboundFilter.bind(this);
        this.settings._numberTyper = numberTyper({ max: -1, negatives: false });
        return {
            filters: [{ filter: this.settings.storageFilter }],
        };
    };

    getSVG: IKillerCagesLayer["getSVG"] = ({ grid, storage, settings }) => {
        const stored = storage.getStored<KillerCagesProps>({ grid, layer: this });
        const pt = grid.getPointTransformer(settings);

        const cageElements: SVGGroup["elements"] = new Map();
        const numberElements: SVGGroup["elements"] = new Map();
        const textStyles = [styles.textTop, styles.textLeft].join(" ");

        for (const [id, object] of stored.entries(settings.editMode)) {
            const [, cells] = pt.fromPoints("cells", object.points);
            const shrinkwrap = pt.shrinkwrap(cells, { inset: 5 });

            const style =
                id === stored.permStorage.currentObjectId ? { stroke: "#33F" } : undefined;
            for (const [key, wrap] of Object.entries(shrinkwrap)) {
                cageElements.set(`${id}-${key}`, {
                    className: styles.killerCagesOutline,
                    style,
                    points: wrap.join(" "),
                });
            }

            if (object.state !== null) {
                const topLeft = pt.sorter({ direction: "NW" });
                const corner = cells.points.reduce(reduceTo.first(topLeft));
                const maxRadius = pt.maxRadius({ type: "cells", shape: "square", size: "lg" });
                const point = corner
                    .scale(settings.cellSize / 2)
                    .plus(new Vec(1, 1).scale(-0.85 * maxRadius));

                numberElements.set(corner.xy.join(","), {
                    className: textStyles,
                    children: object.state, // TODO: I don't like this React concept leaking... Then again, className is sorta React specific.
                    x: point.x,
                    y: point.y,
                    fontSize: "12px",
                });
            }
        }

        return [
            { id: "killerCage", type: "polygon", elements: cageElements },
            { id: "numbers", type: "text", elements: numberElements },
        ];
    };

    getOverlaySVG: IKillerCagesLayer["getOverlaySVG"] = () => {
        // TODO: Only render the current Killer Cage when focused
        return [];
    };
}
