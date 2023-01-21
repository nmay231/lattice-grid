import { cloneDeep } from "lodash";
import { PuzzleManager } from "../PuzzleManager";
import {
    Layer,
    LayerClass,
    LayerEvent,
    LayerEventEssentials,
    LayerHandlerResult,
    LayerProps,
    Point,
    PointerMoveOrDown,
} from "../types";
import { errorNotification } from "../utils/DOMUtils";

/** I could annotate all attributes that are assigned at runtime with an exclamation to mark them as assigned elsewhere (`attr!: type`), but then I don't have visibility into the cause of certain errors */
export const methodNotImplemented = ({ name }: { name: string }) => {
    return (): any => {
        throw errorNotification({
            error: null,
            message: `Method: ${name} called before implementing!`,
            forever: true,
        });
    };
};

const randomId = (blacklist: Layer["id"][], suggested: Layer["id"]) => {
    let id: Layer["id"] = suggested;
    let num = 1;
    while (blacklist.includes(id)) {
        id = `${suggested}-${num++}`;
    }
    return id;
};

export abstract class BaseLayer<LP extends LayerProps>
    implements Omit<Layer<LP>, "newSettings" | "getBlits">
{
    static ethereal = true;
    static displayName = "INTERNAL_BASE_LAYER";
    static defaultSettings = {};

    readonly type: string;
    id: Layer["id"];
    ethereal: Layer["ethereal"];
    displayName: Layer["displayName"];
    rawSettings: LP["RawSettings"] = {};
    controls?: Layer["controls"];
    constraints?: Layer["constraints"];

    constructor(klass: LayerClass<LP>, puzzle: Pick<PuzzleManager, "layers">) {
        this.id = randomId(puzzle.layers.keys(), klass.type);
        this.ethereal = klass.ethereal;
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
