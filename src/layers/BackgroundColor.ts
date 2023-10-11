import { FormSchema, Layer, LayerClass, SVGGroup } from "../types";
import { BaseLayer } from "./BaseLayer";
import { OnePointProps, handleEventsCurrentSetting } from "./controls/onePoint";
import styles from "./layers.module.css";

type Color = string;
// TODO: Single file exporting all versions of colors?
const BLUE: Color = "var(--user-light-blue)";

interface BackgroundColorProps extends OnePointProps<Color> {
    RawSettings: { selectedState: Color };
}

interface IBackgroundColorLayer extends Layer<BackgroundColorProps> {
    settings: BackgroundColorProps["RawSettings"];
}

export class BackgroundColorLayer
    extends BaseLayer<BackgroundColorProps>
    implements IBackgroundColorLayer
{
    static ethereal = false;
    static readonly type = "BackgroundColorLayer";
    static displayName = "Background Color";
    static defaultSettings = { selectedState: BLUE };

    settings = this.rawSettings;

    static create = ((puzzle): BackgroundColorLayer => {
        return new BackgroundColorLayer(BackgroundColorLayer, puzzle);
    }) satisfies LayerClass<BackgroundColorProps>["create"];

    static controls: FormSchema<BackgroundColorProps> = {
        elements: [{ type: "color", key: "selectedState", label: "Fill color" }],
    };
    static constraints = undefined;

    newSettings: IBackgroundColorLayer["newSettings"] = ({ newSettings }) => {
        this.rawSettings = newSettings;
        this.settings = {
            selectedState: newSettings.selectedState || BLUE,
        };

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

        return {};
    };

    getSVG: IBackgroundColorLayer["getSVG"] = ({ grid, storage, settings }) => {
        const stored = storage.getStored<BackgroundColorProps>({ grid, layer: this });
        const group = stored.groups.getGroup(settings.editMode);
        const renderOrder = stored.objects.keys().filter((id) => group.has(id));

        const pt = grid.getPointTransformer(settings);
        const [cellMap, cells] = pt.fromPoints("cells", renderOrder);
        const [outlineMap] = pt.svgOutline(cells);

        const elements: SVGGroup["elements"] = new Map();
        for (const id of renderOrder) {
            const { state: color } = stored.objects.get(id);
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
