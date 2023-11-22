import {
    Color,
    FormSchema,
    HistoryAction,
    Layer,
    LayerClass,
    StorageFilter,
    SVGGroup,
} from "../types";
import { DEFAULT_COLORS, isValidColor } from "../utils/colors";
import { BaseLayer } from "./BaseLayer";
import { handleEventsCurrentSetting, OnePointProps } from "./controls/onePoint";
import styles from "./layers.module.css";

interface BackgroundColorProps extends OnePointProps<Color> {
    Settings: { selectedState: Color };
}

interface IBackgroundColorLayer extends Layer<BackgroundColorProps> {}

export class BackgroundColorLayer
    extends BaseLayer<BackgroundColorProps>
    implements IBackgroundColorLayer
{
    static ethereal = false;
    static readonly type = "BackgroundColorLayer";
    static displayName = "Background Color";
    static defaultSettings = { selectedState: DEFAULT_COLORS.LIGHT_BLUE };

    static create = ((puzzle): BackgroundColorLayer => {
        return new BackgroundColorLayer(BackgroundColorLayer, puzzle);
    }) satisfies LayerClass<BackgroundColorProps>["create"];

    static controls: FormSchema<BackgroundColorProps> = {
        elements: { selectedState: { type: "color", label: "Fill color" } },
    };
    static constraints = undefined;

    static settingsDescription: LayerClass<BackgroundColorProps>["settingsDescription"] = {
        selectedState: { type: "controls" },
    };

    static isValidSetting<K extends keyof BackgroundColorProps["Settings"]>(
        key: K | string,
        value: unknown,
    ): value is BackgroundColorProps["Settings"][K] {
        if (key === "selectedState") {
            return typeof value === "string" && isValidColor(value);
        }
        return false;
    }

    updateSettings: IBackgroundColorLayer["updateSettings"] = () => {
        handleEventsCurrentSetting(this, {
            pointTypes: ["cells"],
            // TODO: Replace deltas with FSM
            deltas: [
                { dx: 0, dy: 2 },
                { dx: 0, dy: -2 },
                { dx: 2, dy: 0 },
                { dx: -2, dy: 0 },
            ],
        });

        return { filters: [{ filter: this.filterOverlapAndWhiteCells }] };
    };

    filterOverlapAndWhiteCells: StorageFilter = ({ storage }, _action) => {
        const action = _action as HistoryAction<BackgroundColorProps>;
        if (action.object == null) {
            return { keep: true };
        }

        const stored = storage.getObjects(this.id);
        if (action.storageMode === "answer" && stored.getObject("question", action.objectId)) {
            return { keep: false };
        } else if (
            action.storageMode === "question" &&
            stored.getObject("answer", action.objectId)
        ) {
            return {
                keep: true,
                extraActions: [{ ...action, storageMode: "answer", object: null }],
            };
        }

        // White background objects are hard to tell from the grid background.
        if (action.object.state === DEFAULT_COLORS.LIGHT_WHITE) {
            // We really need to transform this action. Since the action is immutable, if you can't batch these actions together, then it's better to prevent it.
            // TODO: That does mean it might be better to change this at the settings level, i.e. allow converting some values to other values instead of just accepting or rejecting
            if (!action.batchId) return { keep: false };

            return { keep: true, extraActions: [{ ...action, object: null }] };
        }

        return { keep: true };
    };

    getSVG: IBackgroundColorLayer["getSVG"] = ({ grid, storage, settings }) => {
        const stored = storage.getObjects<BackgroundColorProps>(this.id);

        const pt = grid.getPointTransformer(settings);
        const [cellMap, cells] = pt.fromPoints("cells", stored.keys(settings.editMode));
        const [outlineMap] = pt.svgOutline(cells);

        const elements: SVGGroup["elements"] = new Map();
        for (const [id, { state: color }] of stored.entries(settings.editMode)) {
            const outline = outlineMap.get(cellMap.get(id));
            if (!outline) continue; // TODO?

            elements.set(id, {
                className: styles.backgroundColor,
                fill: color,
                points: outline.map((vec) => vec.xy.join(",")).join(" "),
            });
        }

        return [{ id: "backgroundColor", type: "polygon", elements }];
    };
}
