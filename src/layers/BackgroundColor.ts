import { Layer, LayerClass, PolygonBlitGroup } from "../types";
import { BaseLayer, methodNotImplemented } from "./BaseLayer";
import { handleEventsCurrentSetting, OnePointProps } from "./controls/onePoint";
import styles from "./layers.module.css";

type Color = string;

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
    static defaultSettings = { selectedState: "blue" };

    settings = this.rawSettings;
    handleEvent = methodNotImplemented({ name: "BackgroundColor.handleEvent" });
    gatherPoints = methodNotImplemented({ name: "BackgroundColor.gatherPoints" });

    static create = ((puzzle): BackgroundColorLayer => {
        return new BackgroundColorLayer(BackgroundColorLayer, puzzle);
    }) satisfies LayerClass<BackgroundColorProps>["create"];

    static controls = {
        schema: {
            type: "object",
            properties: {
                selectedState: {
                    type: "string",
                    enum: ["blue", "green", "orange", "pink", "purple", "red", "yellow"],
                },
            },
        },
        uischemaElements: [
            {
                type: "Control",
                label: "Color",
                scope: "#/properties/selectedState",
            },
        ],
    };
    static constraints = undefined;

    newSettings: IBackgroundColorLayer["newSettings"] = ({ newSettings }) => {
        this.rawSettings = newSettings;
        this.settings = {
            selectedState: newSettings.selectedState || "blue",
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

    getBlits: IBackgroundColorLayer["getBlits"] = ({ grid, storage, settings }) => {
        const stored = storage.getStored<BackgroundColorProps>({ grid, layer: this });
        const group = stored.groups.getGroup(settings.editMode);
        const renderOrder = stored.objects.keys().filter((id) => group.has(id));

        const pt = grid.getPointTransformer(settings);
        const [cellMap, cells] = pt.fromPoints("cells", renderOrder);
        const [outlineMap] = pt.svgOutline(cells);

        const elements: PolygonBlitGroup["elements"] = new Map();
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
