import { NeedsUpdating } from "../../globals";
import { UserCodeJSON } from "../../logic/userComputation/codeBlocks";
import { Blockly } from "../../utils/Blockly";

export const codeGen = new Blockly.Generator("TODO_BETTER_NAME");
codeGen.INDENT = "    ";

const scrub_: Blockly.Generator["scrub_"] = (block, code, ignoreNext) => {
    const nextBlock = block.nextConnection?.targetBlock();
    if (nextBlock && !ignoreNext) {
        return `${code},\n${codeGen.blockToCode(nextBlock)}`;
    }
    return code;
};
(codeGen as NeedsUpdating).scrub_ = scrub_;

const asString = (stringName: string) => JSON.stringify(stringName);

// TODO: To make indentation easier, I could require the parent element to include the wrapping parenthesis

// This indents everything but the first line of the codeBlock
const dedentFirstLine = (codeBlock: string) =>
    codeBlock.slice(codeGen.INDENT.length) || null;

const indent = (codeBlock: string) =>
    codeBlock
        ? `[\n${codeGen.prefixLines(codeBlock + "\n]", codeGen.INDENT)}`
        : "[]";

const generators = codeGen as NeedsUpdating as Record<
    UserCodeJSON["id"],
    (block: Blockly.Block) => string
>;

generators["ForEach"] = (block) => {
    const variableNameText = block.getFieldValue("NAME");
    const collectionValue = codeGen.valueToCode(block, "COLLECTION", 0);
    const codeBodyStatements = codeGen.statementToCode(block, "CODE_BODY");

    return `{
    "id": ${asString(block.id)},
    "type": "ForEach",
    "variableName": ${asString(variableNameText)},
    "expression": ${dedentFirstLine(collectionValue)},
    "codeBody": ${indent(codeBodyStatements)}
}`;
};

generators["IfElse"] = (block) => {
    const expressionValue = codeGen.valueToCode(block, "EXPRESSION", 0);
    const ifStatements = codeGen.statementToCode(block, "IF");
    const elseStatements = codeGen.statementToCode(block, "ELSE");

    return `{
    "id": ${asString(block.id)},
    "type": "IfElse",
    "expression": ${dedentFirstLine(expressionValue)},
    "ifTrue": ${indent(ifStatements)},
    "ifFalse": ${indent(elseStatements)}
}`;
};

generators["MarkInvalid"] = (block) => {
    const expressionValue = codeGen.valueToCode(block, "EXPRESSION", 0);
    const userMessageValue = codeGen.valueToCode(block, "MESSAGE", 0);
    const highlightedValue = codeGen.valueToCode(block, "HIGHLIGHTED", 0);

    return `{
    "id": ${asString(block.id)},
    "type": "MarkInvalid",
    "expression": ${dedentFirstLine(expressionValue)},
    "userMessage": ${dedentFirstLine(userMessageValue)}
    "highlighted": ${highlightedValue}
}`;
};

generators["DefineAlias"] = (block) => {
    const expressionValue = codeGen.valueToCode(block, "EXPRESSION", 0);
    const nameValue = codeGen.valueToCode(block, "NAME", 0);

    return `{
    "id": ${asString(block.id)},
    "type": "DefineAlias",
    "name": ${dedentFirstLine(nameValue)},
    "expression": ${dedentFirstLine(expressionValue)}
}`;
};

generators["ReadAlias"] = (block) => {
    const nameValue = codeGen.valueToCode(block, "NAME", 0);

    return `{
    "id": ${asString(block.id)},
    "type": "ReadAlias",
    "name": ${dedentFirstLine(nameValue)},
}`;
};

generators["RootBlock"] = (block) => {
    // -const typeDropdownGrid = block.getFieldValue("GRID_TYPE");
    // const layer1Dropdown = block.getFieldValue("LAYER_CONFIG");
    const codeBodyStatements = codeGen.statementToCode(block, "CODE_BODY");

    return `{
    "id": ${asString(block.id)},
    "type": "RootBlock",
    "codeBody": ${indent(codeBodyStatements)}
}`;
};
