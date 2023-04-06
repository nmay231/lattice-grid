import { Layer, LayerClass, ObjectId, Point } from "../types";
import { BaseLayer, methodNotImplemented } from "./BaseLayer";
import { handleEventsCycleStates, OnePointProps } from "./controls/onePoint";

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

    handleEvent: ICellOutlineLayer["handleEvent"] = methodNotImplemented({
        name: "CellOutline.handleEvent",
    });
    gatherPoints: ICellOutlineLayer["gatherPoints"] = methodNotImplemented({
        name: "CellOutline.gatherPoints",
    });

    static controls = undefined;
    static constraints = undefined;

    newSettings() {
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
        const stored = storage.getStored<CellOutlineProps>({ grid, layer: this });

        const blacklist = stored.groups.getGroup("question");
        if (settings.editMode === "answer") return [];
        return grid._getSVG({ blacklist, settings });
    };
}
