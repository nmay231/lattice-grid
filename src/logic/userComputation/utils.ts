import { Variable } from "./expressions";

export const convertToBool = (variable: Variable) => {
    const x = variable.getValue();
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
