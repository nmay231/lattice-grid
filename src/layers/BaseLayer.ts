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
    id: Layer<LP>["id"];
    displayName: Layer<LP>["displayName"];

    settings: LP["Settings"];

    constructor(klass: LayerClass<LP>, puzzle: Pick<PuzzleManager, "layers">) {
        this.klass = klass;
        this.id = randomId(puzzle.layers.keys(), klass.type);
        this.displayName = klass.displayName;
        this.settings = cloneDeep(klass.defaultSettings);
    }

    gatherPoints: Layer<LP>["gatherPoints"] = () => {
        throw notify.error({
            message: `${this.klass.type}.gatherPoints() called before implementing!`,
            forever: true,
        });
    };

    handleEvent: Layer<LP>["handleEvent"] = () => {
        throw notify.error({
            message: `${this.klass.type}.handleEvent() called before implementing!`,
            forever: true,
        });
    };
}
