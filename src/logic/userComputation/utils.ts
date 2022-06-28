import { IVariable, NeedsUpdating } from "../../globals";
import { Blockly } from "../../utils/Blockly";

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

export const DEFAULT_ALIAS_NAME = "MY ALIAS";
export const addAliasCategoryToToolbox = (workspace: Blockly.Workspace) => {
    const variables = Blockly.Variables.allUsedVarModels(workspace);

    // Always show the user a variable so that they have some idea of how it works
    const id = Blockly.Variables.getOrCreateVariablePackage(
        workspace,
        null,
        DEFAULT_ALIAS_NAME,
        "",
    ).getId();
    const toolboxCategories: any[] = [
        { kind: "block", type: "DefineAlias" },
        { kind: "block", type: "ReadAlias", fields: { NAME: { id } } },
    ];

    for (let variableId of variables.map((v) => v.getId())) {
        if (id === variableId) continue;
        toolboxCategories.push({
            kind: "block",
            type: "ReadAlias",
            fields: { NAME: { id: variableId } },
        });
    }
    return toolboxCategories;
};
