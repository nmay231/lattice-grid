import { NeedsUpdating } from "../../globals";
import { IVariable } from "./compile";

export const convertToBool = (variable: IVariable) => {
    const x = (variable as NeedsUpdating).getValue();
    let bool: boolean | null = null;
    if (Array.isArray(x) && x.length) {
        bool = true;
    } else if (typeof x === "boolean") {
        bool = x;
    }

    if (bool === null) {
        // TODO: move this exception to the calling function?
        throw Error(`Invalid value for expression: ${x}`);
    }
    return bool;
};
