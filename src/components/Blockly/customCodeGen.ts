import { NeedsUpdating } from "../../globals";
import { UserCodeJSON } from "../../logic/userComputation/codeBlocks";
import { Blockly } from "../../utils/Blockly";

export const codeGen = new Blockly.Generator("TODO_BETTER_NAME");
codeGen.INDENT = "    ";
const PRECEDENCE_ATOMIC = 0;

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
const oneBlock = (codeBlock: string) =>
    codeGen
        .prefixLines(codeBlock, codeGen.INDENT)
        .slice(codeGen.INDENT.length) || null;

const manyBlocks = (codeBlocks: string) =>
    codeBlocks
        ? `[\n${codeGen.prefixLines(codeBlocks + "\n]", codeGen.INDENT)}`
        : "[]";

const generators = codeGen as NeedsUpdating as Record<
    UserCodeJSON["type"],
    (block: Blockly.Block) => string | [string, any]
>;

generators["DefineAlias"] = (block) => {
    const expressionValue = codeGen.valueToCode(block, "EXPRESSION", 0);
    const nameValue = codeGen.valueToCode(block, "NAME", 0);

    return `{
    "id": ${asString(block.id)},
    "type": "DefineAlias",
    "name": ${asString(nameValue)},
    "expression": ${oneBlock(expressionValue)}
}`;
};

generators["ForEach"] = (block) => {
    const variableNameText = block.getFieldValue("NAME");
    const collectionValue = codeGen.valueToCode(block, "COLLECTION", 0);
    const codeBodyStatements = codeGen.statementToCode(block, "CODE_BODY");

    return `{
    "id": ${asString(block.id)},
    "type": "ForEach",
    "variableName": ${asString(variableNameText)},
    "expression": ${oneBlock(collectionValue)},
    "codeBody": ${manyBlocks(codeBodyStatements)}
}`;
};

generators["IfElse"] = (block) => {
    const expressionValue = codeGen.valueToCode(block, "EXPRESSION", 0);
    const ifStatements = codeGen.statementToCode(block, "IF");
    const elseStatements = codeGen.statementToCode(block, "ELSE");

    return `{
    "id": ${asString(block.id)},
    "type": "IfElse",
    "expression": ${oneBlock(expressionValue)},
    "ifTrue": ${manyBlocks(ifStatements)},
    "ifFalse": ${manyBlocks(elseStatements)}
}`;
};

generators["MarkInvalid"] = (block) => {
    const expressionValue = codeGen.valueToCode(block, "EXPRESSION", 0);
    const userMessageValue = codeGen.valueToCode(block, "MESSAGE", 0);
    const highlightedValue = codeGen.valueToCode(block, "HIGHLIGHTED", 0);

    return `{
    "id": ${asString(block.id)},
    "type": "MarkInvalid",
    "expression": ${oneBlock(expressionValue)},
    "userMessage": ${oneBlock(userMessageValue)}
    "highlighted": ${highlightedValue}
}`;
};

generators["ReadAlias"] = (block) => {
    const nameValue = codeGen.valueToCode(block, "NAME", 0);

    return [
        `{
    "id": ${asString(block.id)},
    "type": "ReadAlias",
    "name": ${asString(nameValue)}
}`,
        PRECEDENCE_ATOMIC,
    ];
};

generators["RootBlock"] = (block) => {
    // -const typeDropdownGrid = block.getFieldValue("GRID_TYPE");
    // const layer1Dropdown = block.getFieldValue("LAYER_CONFIG");
    const codeBodyStatements = codeGen.statementToCode(block, "CODE_BODY");

    return `{
    "id": ${asString(block.id)},
    "type": "RootBlock",
    "codeBody": ${manyBlocks(codeBodyStatements)}
}`;
};
