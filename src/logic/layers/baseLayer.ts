import { cloneDeep } from "lodash";
import {
    JSONSchema,
    Layer,
    LayerClass,
    LayerEvent,
    LayerEventEssentials,
    LayerHandlerResult,
    LayerProps,
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

// Change this to only contain properties that layers would add at runtime (i.e. remove id, ethereal, and unique since those should always be defined on init)
export abstract class BaseLayer<LP extends LayerProps>
    implements Omit<Layer<LP>, "newSettings" | "getBlits">
{
    static ethereal = true;
    static unique = false;
    static type = "BASE_LAYER";
    static displayName = "INTERNAL_BASE_LAYER";
    static defaultSettings = {};

    type: LP["Type"];
    id: string;
    ethereal: boolean;
    displayName: string;
    unique: boolean;
    rawSettings: LP["RawSettings"] = {};
    controls?: JSONSchema;
    constraints?: JSONSchema;

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
    ) => string[];

    abstract handleEvent: (layerEvent: LayerEvent<LayerProps>) => LayerHandlerResult<LP>;
}
