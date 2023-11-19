import { Layer, LayerClass, ObjectId, Point } from "../types";
import { BaseLayer } from "./BaseLayer";
import { OnePointProps, handleEventsCycleStates } from "./controls/onePoint";

type ObjectState = true;

interface CellOutlineProps extends OnePointProps<ObjectState> {
    ObjectState: { id: ObjectId; points: Point[]; state: ObjectState };
}

interface ICellOutlineLayer extends Layer<CellOutlineProps> {}

export class CellOutlineLayer extends BaseLayer<CellOutlineProps> implements ICellOutlineLayer {
    static ethereal = true;
    static readonly type = "CellOutlineLayer";
    static displayName = "Cell Outline";

    static uniqueInstance?: CellOutlineLayer;
    static create = ((puzzle): CellOutlineLayer => {
        CellOutlineLayer.uniqueInstance =
            CellOutlineLayer.uniqueInstance || new CellOutlineLayer(CellOutlineLayer, puzzle);
        return CellOutlineLayer.uniqueInstance;
    }) satisfies LayerClass<CellOutlineProps>["create"];

    static controls = undefined;
    static constraints = undefined;
    static settingsDescription: LayerClass<CellOutlineProps>["settingsDescription"] = {};

    static isValidSetting<K extends keyof CellOutlineProps["Settings"]>(
        key: K | string,
        value: unknown,
    ): value is CellOutlineProps["Settings"][K] {
        return false;
    }

    updateSettings() {
        handleEventsCycleStates(this, {
            states: [true],
            pointTypes: ["cells"],
            // TODO: Change deltas to Finite State Machine
            deltas: [
                { dx: 0, dy: 2 },
                { dx: 0, dy: -2 },
                { dx: 2, dy: 0 },
                { dx: -2, dy: 0 },
            ],
        });
        const handleEvent = this.handleEvent;
        this.handleEvent = (arg) => {
            const result = handleEvent(arg);
            return {
                ...result,
                history: (result.history || []).map((action) => ({
                    ...action,
                    // TODO: Would I eventually support modifying the grid in the answer editMode? Does that even make sense?
                    editMode: "question",
                })),
            };
        };
        return {};
    }

    getSVG: ICellOutlineLayer["getSVG"] = ({ settings, storage, grid }) => {
        const stored = storage.getObjects<CellOutlineProps>(this.id);

        if (settings.editMode === "answer") return [];
        return grid._getSVG({ blacklist: new Set(stored.keys("question")), settings });
    };
}
