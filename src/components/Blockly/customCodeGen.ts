import { NeedsUpdating } from "../../globals";
import { UserCodeJSON } from "../../logic/userComputation/codeBlocks";
import { Blockly } from "../../utils/Blockly";
import "./blocklyUI";

// TODO: To make indentation easier, I could require the parent element to include the wrapping parenthesis

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
const oneBlock = (codeBlock: string) =>
    codeGen.prefixLines(codeBlock, codeGen.INDENT).slice(codeGen.INDENT.length) || null;
const manyBlocks = (codeBlocks: string) =>
    codeBlocks ? `[\n${codeGen.prefixLines(codeBlocks + "\n]", codeGen.INDENT)}` : "[]";

const generators = codeGen as NeedsUpdating as Record<
    UserCodeJSON["type"],
    (block: Blockly.Block) => string | [string, any]
>;

generators["Compare"] = (block) => {
    const left = codeGen.valueToCode(block, "LEFT", 0);
    const right = codeGen.valueToCode(block, "RIGHT", 0);
    const compareType = block.getFieldValue("COMPARE_TYPE");

    return [
        `{
    "id": ${asString(block.id)},
    "type": "Compare",
    "compareType": ${asString(compareType)},
    "left": ${oneBlock(left)},
    "right": ${oneBlock(right)}
}`,
        PRECEDENCE_ATOMIC,
    ];
};

generators["Debug"] = (block) => {
    const expressionValue = codeGen.valueToCode(block, "EXPRESSION", 0);

    return `{
    "id": ${asString(block.id)},
    "type": "Debug",
    "expression": ${oneBlock(expressionValue)}
}`;
};

generators["DefineAlias"] = (block) => {
    const expressionValue = codeGen.valueToCode(block, "EXPRESSION", 0);
    const nameValue = block.getFieldValue("NAME");

    return `{
    "id": ${asString(block.id)},
    "type": "DefineAlias",
    "varId": ${asString(nameValue)},
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

generators["Integer"] = (block) => {
    const value = block.getFieldValue("VALUE");

    return [
        `{
    "id": ${asString(block.id)},
    "type": "Integer",
    "value": ${value}
}`,
        PRECEDENCE_ATOMIC,
    ];
};

generators["MarkInvalid"] = (block) => {
    const expressionValue = codeGen.valueToCode(block, "EXPRESSION", 0);
    const userMessageValue = codeGen.valueToCode(block, "MESSAGE", 0);
    const highlightedValue = block.getFieldValue("HIGHLIGHTED");

    return `{
    "id": ${asString(block.id)},
    "type": "MarkInvalid",
    "expression": ${oneBlock(expressionValue)},
    "userMessage": ${oneBlock(userMessageValue)},
    "highlighted": ${highlightedValue === "TRUE"}
}`;
};

generators["ObjectSelector"] = (block) => {
    const layerId = block.getFieldValue("LAYER_ID");

    return [
        `{
    "id": ${asString(block.id)},
    "type": "ObjectSelector",
    "layerId": ${asString(layerId)}
}`,
        PRECEDENCE_ATOMIC,
    ];
};

generators["ReadAlias"] = (block) => {
    const nameValue = block.getFieldValue("NAME");

    return [
        `{
    "id": ${asString(block.id)},
    "type": "ReadAlias",
    "varId": ${asString(nameValue)}
}`,
        PRECEDENCE_ATOMIC,
    ];
};

generators["RootBlock"] = (block) => {
    const codeBodyStatements = codeGen.statementToCode(block, "CODE_BODY");

    return `{
    "id": ${asString(block.id)},
    "type": "RootBlock",
    "codeBody": ${manyBlocks(codeBodyStatements)}
}`;
};
