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
(codeGen as any).scrub_ = scrub_;

const asString = (stringName: string) => JSON.stringify(stringName);

// TODO: To make indentation easier, I could require the parent element to include the wrapping parenthesis

// This indents everything but the first line of the codeBlock
const dedentFirstLine = (codeBlock: string) =>
    codeBlock.slice(codeGen.INDENT.length) || null;

const indent = (codeBlock: string) =>
    codeBlock
        ? `[\n${codeGen.prefixLines(codeBlock + "\n]", codeGen.INDENT)}`
        : "[]";

(codeGen as any)["for_each"] = (block: Blockly.Block) => {
    const variableNameText = block.getFieldValue("variableName");
    const headerValue = codeGen.valueToCode(block, "header", 0);
    const codeBodyStatements = codeGen.statementToCode(block, "codeBody");

    return `{
    "id": ${asString(block.id)},
    "type": "ForEach",
    "variableName": ${asString(variableNameText)},
    "expression": ${dedentFirstLine(headerValue)},
    "codeBody": ${indent(codeBodyStatements)}
}`;
};

(codeGen as any)["if_else"] = (block: Blockly.Block) => {
    const nameValue = codeGen.valueToCode(block, "NAME", 0);
    const thenStatements = codeGen.statementToCode(block, "then");
    const elseStatements = codeGen.statementToCode(block, "else");

    return `{
    "id": ${asString(block.id)},
    "type": "IfElse",
    "expression": ${dedentFirstLine(nameValue)},
    "ifTrue": ${indent(thenStatements)},
    "ifFalse": ${indent(elseStatements)}
}`;
};

(codeGen as any)["mark_incomplete"] = (block: Blockly.Block) => {
    const expressionValue = codeGen.valueToCode(block, "expression", 0);
    // TODO: Is this field definition wrong?
    // const usermessageText = block.getFieldValue("userMessage");
    const userMessageValue = codeGen.valueToCode(block, "userMessage", 0);

    return `{
    "id": ${asString(block.id)},
    "type": "MarkIncomplete",
    "expression": ${dedentFirstLine(expressionValue)},
    "userMessage": ${dedentFirstLine(userMessageValue)}
}`;
};

(codeGen as any)["user_alias"] = (block: Blockly.Block) => {
    const expressionValue = codeGen.valueToCode(block, "expression", 0);
    // -const nameText = block.getFieldValue("name");
    const aliasNameValue = codeGen.valueToCode(block, "aliasName", 0);

    return `{
    "id": ${asString(block.id)},
    "type": "Alias",
    "name": ${dedentFirstLine(aliasNameValue)},
    "expression": ${dedentFirstLine(expressionValue)}
}`;
};

(codeGen as any)["root_block"] = (block: Blockly.Block) => {
    // -const typeDropdownGrid = block.getFieldValue("typeGrid");
    // const layer1Dropdown = block.getFieldValue("layer1");
    // TODO: mutator to add a list of layer types dynamically
    const codeBodyStatements = codeGen.statementToCode(block, "codeBody");

    return `{
    "id": ${asString(block.id)},
    "type": "RootBlock",
    "codeBody": ${indent(codeBodyStatements)}
}`;
};
