import { PolygonBlits } from "../../components/SVGCanvas/Polygon";
import { ILayer, LayerClass } from "../../globals";
import { BaseLayer, methodNotImplemented } from "./baseLayer";
import { handleEventsCurrentSetting, OnePointProps } from "./controls/onePoint";

interface BackgroundColorProps extends OnePointProps {
    Type: "BackgroundColorLayer";
    ObjectState: { id: string; points: string[]; state: string };
    RawSettings: { selectedState: string };
}

interface IBackgroundColorLayer extends ILayer<BackgroundColorProps> {
    settings: BackgroundColorProps["RawSettings"];
}

export class BackgroundColorLayer
    extends BaseLayer<BackgroundColorProps>
    implements IBackgroundColorLayer
{
    static ethereal = false;
    static unique = false;
    static type = "BackgroundColorLayer" as const;
    static displayName = "Background Color";
    static defaultSettings = { selectedState: "blue" };

    settings = this.rawSettings;
    handleEvent = methodNotImplemented({ name: "BackgroundColor.handleEvent" });
    gatherPoints = methodNotImplemented({ name: "BackgroundColor.gatherPoints" });

    static create: LayerClass<BackgroundColorProps>["create"] = (puzzle) => {
        return new BackgroundColorLayer(BackgroundColorLayer, puzzle);
    };

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

    getBlits: IBackgroundColorLayer["getBlits"] = ({ storage, grid }) => {
        const stored = storage.getStored<BackgroundColorProps>({
            grid,
            layer: this,
        });
        const { cells } = grid.getPoints({
            connections: { cells: { svgOutline: true } },
            points: [...stored.renderOrder],
        });

        const objectsByColor: Record<string, PolygonBlits["blits"]> = {};
        for (const id of stored.renderOrder) {
            const { state } = stored.objects[id];
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
