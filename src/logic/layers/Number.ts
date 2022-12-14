import { TextBlits } from "../../components/SVGCanvas/Text";
import { Layer, LayerClass, Point } from "../../types";
import { bySubset } from "../../utils/structureUtils";
import { BaseLayer, methodNotImplemented } from "./baseLayer";
import { DO_NOTHING, numberTyper } from "./controls/numberTyper";
import { handleEventsSelection, KeyDownEventHandler, SelectedProps } from "./controls/selection";

export interface NumberProps extends SelectedProps {
    Type: "NumberLayer";
    ObjectState: { state: string; point: Point };
    RawSettings: { max: number; negatives: boolean };
}

interface INumberLayer extends Layer<NumberProps>, KeyDownEventHandler<NumberProps> {
    _numberTyper: ReturnType<typeof numberTyper>;
}

export class NumberLayer extends BaseLayer<NumberProps> implements INumberLayer {
    static ethereal = false;
    static unique = false;
    static type = "NumberLayer" as const;
    static displayName = "Number";
    static defaultSettings = { max: 9, negatives: false };

    handleEvent = methodNotImplemented({ name: "Number.handleEvent" });
    gatherPoints = methodNotImplemented({ name: "Number.gatherPoints" });
    _numberTyper = methodNotImplemented({
        name: "Number._numberTyper",
    }) as INumberLayer["_numberTyper"];

    static create: LayerClass<NumberProps>["create"] = (puzzle) => {
        return new NumberLayer(NumberLayer, puzzle);
    };

    handleKeyDown: INumberLayer["handleKeyDown"] = ({
        points: ids,
        type,
        keypress,
        storage,
        grid,
    }) => {
        const stored = storage.getStored<NumberProps>({ grid, layer: this });
        if (!ids.length) {
            return {};
        }

        const states = ids.map((id) => stored.objects.get(id)?.state);
        const theSame = !!(states as Array<string | false>).reduce((prev, next) =>
            prev === next ? next : false,
        );

        const state = theSame ? states[0] : "";
        const event = { type, keypress };
        const newState = this._numberTyper(state, event);

        if (newState === DO_NOTHING) {
            return {};
        }
        return {
            history: ids.map((id) => ({
                object: newState === null ? null : { state: newState, point: id },
                id,
            })),
        };
    };

    static controls = undefined;
    static constraints = {
        schema: {
            type: "object",
            properties: { negatives: { type: "boolean" }, max: { type: "integer" } },
        },
        uischemaElements: [
            {
                type: "Control",
                label: "Allow Negatives",
                scope: "#/properties/negatives",
            },
            {
                type: "Control",
                label: "Maximum",
                scope: "#/properties/max",
            },
        ],
    };

    newSettings: INumberLayer["newSettings"] = ({ newSettings, grid, storage }) => {
        this.rawSettings = newSettings;
        this._numberTyper = numberTyper(newSettings);

        handleEventsSelection(this, {});

        const { objects } = storage.getStored<NumberProps>({
            grid,
            layer: this,
        });

        const history = [];

        // Delete numbers that are out of range
        const min = newSettings.negatives ? -newSettings.max : 0;
        const max = newSettings.max;
        for (const [id, object] of objects.entries()) {
            const state = parseInt(object.state);
            if (state < min || state > max) {
                history.push({ object: null, id });
            }
        }

        return { history };
    };

    getBlits: INumberLayer["getBlits"] = ({ grid, storage, editMode }) => {
        const stored = storage.getStored<NumberProps>({ grid, layer: this });
        const points = stored.objects.keys().filter(bySubset(stored.groups.getGroup(editMode)));
        const { cells } = grid.getPoints({
            connections: {
                cells: {
                    svgPoint: true,
                    maxRadius: { shape: "square", size: "large" },
                },
            },
            points,
        });

        const blits: TextBlits["blits"] = {};
        for (const id of points) {
            blits[id] = {
                text: stored.objects.get(id).state,
                point: cells[id].svgPoint,
                size: cells[id].maxRadius * 1.6,
            };
        }

        return [
            {
                id: "number",
                blitter: "text",
                blits,
                style: {
                    originX: "center",
                    originY: "center",
                },
            },
        ];
    };
}
