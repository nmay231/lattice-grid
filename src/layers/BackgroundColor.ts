import { PolygonBlits } from "../components/SVGCanvas/Polygon";
import { Layer, LayerClass } from "../types";
import { bySubset } from "../utils/structureUtils";
import { BaseLayer, methodNotImplemented } from "./BaseLayer";
import { handleEventsCurrentSetting, OnePointProps } from "./controls/onePoint";

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
        const renderOrder = stored.objects
            .keys()
            .filter(bySubset(stored.groups.getGroup(settings.editMode)));
        const { cells } = grid.getPoints({
            settings,
            connections: { cells: { svgOutline: true } },
            points: [...renderOrder],
        });

        const objectsByColor: Record<Color, PolygonBlits["blits"]> = {};
        for (const id of renderOrder) {
            const { state } = stored.objects.get(id);
            objectsByColor[state] = objectsByColor[state] ?? {};
            objectsByColor[state][id] = { points: cells[id].svgOutline };
        }

        return Object.keys(objectsByColor).map((color) => ({
            id: color,
            blitter: "polygon",
            // TODO: Should I keep stroke(Width) even after I allow putting this layer under the grid? It might be cleaner to keep the border so that it looks okay when placed outside of the grid. In any case, I can always add an option.
            style: { fill: color, strokeWidth: 2, stroke: "black" },
            blits: objectsByColor[color],
        }));
    };
}
