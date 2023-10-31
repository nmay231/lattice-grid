import { cloneDeep } from "lodash";
import { PuzzleManager } from "../PuzzleManager";
import { Layer, LayerClass, LayerProps } from "../types";
import { notify } from "../utils/notifications";

const randomId = (blacklist: Layer["id"][], suggested: Layer["id"]) => {
    let id: Layer["id"] = suggested;
    let num = 1;
    while (blacklist.includes(id)) {
        id = `${suggested}-${num++}`;
    }
    return id;
};

export class BaseLayer<LP extends LayerProps>
    implements Omit<Layer<LP>, "updateSettings" | "getSVG">
{
    static ethereal = true;
    static displayName = "INTERNAL_BASE_LAYER";
    static defaultSettings = {};

    klass: Layer<LP>["klass"];
    readonly type: string;
    id: Layer<LP>["id"];
    ethereal: Layer<LP>["ethereal"];
    displayName: Layer<LP>["displayName"];
    controls?: Layer<LP>["controls"];
    constraints?: Layer<LP>["constraints"];

    settings: LP["Settings"];

    constructor(klass: LayerClass<LP>, puzzle: Pick<PuzzleManager, "layers">) {
        this.klass = klass;
        this.id = randomId(puzzle.layers.keys(), klass.type);
        this.ethereal = klass.ethereal;
        this.type = klass.type;
        this.displayName = klass.displayName;
        this.controls = klass.controls;
        this.constraints = klass.constraints;
        this.settings = cloneDeep(klass.defaultSettings);
    }

    gatherPoints: Layer<LP>["gatherPoints"] = () => {
        throw notify.error({
            message: `${this.type}.gatherPoints() called before implementing!`,
            forever: true,
        });
    };

    handleEvent: Layer<LP>["handleEvent"] = () => {
        throw notify.error({
            message: `${this.type}.handleEvent() called before implementing!`,
            forever: true,
        });
    };
}
