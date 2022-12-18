import { cloneDeep } from "lodash";
import {
    Layer,
    LayerClass,
    LayerEvent,
    LayerEventEssentials,
    LayerHandlerResult,
    LayerProps,
    Point,
    PointerMoveOrDown,
} from "../../types";
import { errorNotification } from "../../utils/DOMUtils";
import { randomStringId } from "../../utils/stringUtils";
import { PuzzleManager } from "../PuzzleManager";

export const methodNotImplemented = ({ name }: { name: string }) => {
    return (): any => {
        throw errorNotification({
            message: `Method: ${name} called before implementing!`,
            forever: true,
        });
    };
};

export abstract class BaseLayer<LP extends LayerProps>
    implements Omit<Layer<LP>, "newSettings" | "getBlits">
{
    static ethereal = true;
    static unique = false;
    static type = "BASE_LAYER";
    static displayName = "INTERNAL_BASE_LAYER";
    static defaultSettings = {};

    type: LP["Type"];
    id: Layer["id"];
    ethereal: Layer["ethereal"];
    displayName: Layer["displayName"];
    unique: Layer["unique"];
    rawSettings: LP["RawSettings"] = {};
    controls?: Layer["controls"];
    constraints?: Layer["constraints"];

    constructor(klass: LayerClass<LP>, puzzle: PuzzleManager) {
        this.id = klass.unique ? klass.type : randomStringId(Object.keys(puzzle.layers));
        this.ethereal = klass.ethereal;
        this.unique = klass.unique;
        this.type = klass.type;
        this.displayName = klass.displayName;
        this.controls = klass.controls;
        this.constraints = klass.constraints;
        this.rawSettings = cloneDeep(klass.defaultSettings);
    }

    abstract gatherPoints: (
        layerEvent: PointerMoveOrDown & LayerEventEssentials<LayerProps>,
    ) => Point[];

    abstract handleEvent: (layerEvent: LayerEvent<LayerProps>) => LayerHandlerResult<LP>;
}
