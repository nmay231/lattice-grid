import { CompilerErrorDetails, VariableCodeBlock } from "../../globals";
import { Blockly } from "../../utils/Blockly";

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

export const blockIsVariable = (
    block: Partial<VariableCodeBlock>,
): block is VariableCodeBlock => {
    return !!(block.getValue && block.variableInfo && block.json);
};

export class CompilerError extends Error {
    constructor(public details: CompilerErrorDetails) {
        super(details.message);
    }
}
