import { Color, FormSchema, Layer, LayerClass, SVGGroup } from "../types";
import { DEFAULT_COLORS, isValidColor } from "../utils/colors";
import { BaseLayer } from "./BaseLayer";
import { OnePointProps, handleEventsCurrentSetting } from "./controls/onePoint";
import styles from "./layers.module.css";

interface BackgroundColorProps extends OnePointProps<Color> {
    Settings: { selectedState: Color };
    ObjectState: { state: Color };
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
        const { gatherPoints, handleEvent } = handleEventsCurrentSetting<
            BackgroundColorProps,
            Color,
            "selectedState"
        >({
            pointTypes: ["cells"],
            // TODO: Replace deltas with FSM
            deltas: [
                { dx: 0, dy: 2 },
                { dx: 0, dy: -2 },
                { dx: 2, dy: 0 },
                { dx: -2, dy: 0 },
            ],
            settingsKey: "selectedState",
        });

        this.gatherPoints = gatherPoints;
        this.handleEvent = handleEvent;

        return {};
    };

    getSVG: IBackgroundColorLayer["getSVG"] = ({ grid, storage, settings }) => {
        const stored = storage.getStored<BackgroundColorProps>({ grid, layer: this });

        const pt = grid.getPointTransformer(settings);
        const [cellMap, cells] = pt.fromPoints("cells", [...stored.keys(settings.editMode)]);
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
