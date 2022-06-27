import { DEFAULT_ALIAS_NAME } from "../../logic/userComputation/compile";
import { Blockly } from "../../utils/Blockly";

// TODO: this.setTooltip("") and other helpful things like colour and such
// Change names to be more consistent, like for_each => ForEach, and have field names be UPPER_SNAKE_CASE

Blockly.Blocks["objects_of_layer"] = {
    init(this: Blockly.Block) {
        this.appendDummyInput()
            .appendField("in")
            .appendField(
                // TODO: Populate this layer selection based on the layers listed in the root_block
                new Blockly.FieldDropdown([
                    ["[select layer]", "UNSELECTED"],
                    ["sudoku", "SUDOKU"],
                    ["number", "OPTIONNAME"],
                ]),
                "layer",
            )
            .appendField("select")
            // .appendField('(insert "any of"/"all of"/"none of" mutator here)')
            .appendField(
                new Blockly.FieldDropdown([
                    ["all objects", "ALL_OBJECTS"],
                    ["1", "1"],
                    ["2", "2"],
                ]),
                "object_filter",
            );
        this.setOutput(true, null);
        this.setColour(230);
    },
};

Blockly.Blocks["for_each"] = {
    init(this: Blockly.Block) {
        this.appendValueInput("header")
            .setCheck(null)
            .appendField("for each")
            .appendField(new Blockly.FieldTextInput("instance"), "variableName")
            .appendField("of the collection");
        this.appendStatementInput("codeBody").setCheck(null).appendField("run");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    },
};

Blockly.Blocks["if_else"] = {
    init(this: Blockly.Block) {
        this.appendValueInput("NAME").setCheck(null).appendField("If");
        this.appendStatementInput("then").setCheck(null).appendField("Then");
        this.appendStatementInput("else").setCheck(null).appendField("Else");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    },
};

Blockly.Blocks["mark_incomplete"] = {
    init(this: Blockly.Block) {
        this.appendValueInput("expression").setCheck(null).appendField("Mark");
        this.appendDummyInput()
            .appendField("as invalid with message")
            .appendField(new Blockly.FieldTextInput("ERROR"), "userMessage")
            .appendField("highlight?")
            .appendField(new Blockly.FieldCheckbox("highlight"), "highlight");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    },
};

Blockly.Blocks["user_alias"] = {
    init(this: Blockly.Block) {
        this.appendValueInput("expression")
            .setCheck(null)
            .appendField("Define")
            .appendField(new Blockly.FieldVariable(DEFAULT_ALIAS_NAME), "name")
            .appendField("as");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    },
};

Blockly.Blocks["read_variable"] = {
    init(this: Blockly.Block) {
        this.appendDummyInput().appendField(
            new Blockly.FieldVariable("Alias Name"),
            "name",
        );
        this.setOutput(true, null);
        this.setColour(230);
    },
};

Blockly.Blocks["root_block"] = {
    init(this: Blockly.Block) {
        this.appendDummyInput()
            .appendField("with")
            .appendField(
                // TODO: multi-select dropdown (not available by default, but there might be some Blockly utility library I can install...)
                new Blockly.FieldDropdown([["a square", "SQUARE"]]),
                "grid_type",
            )
            .appendField("grid");
        this.appendDummyInput()
            .appendField("and the layers")
            .appendField(
                // TODO: Use a button that shows a modal to allow much more granular control. Trying to do it inside of blockly will just be a pain.
                // But I should always show a shortened version of what the configuration is in the blockly view so that you don't always have to open the modal to see what's going on.
                // Speaking of, I probably should do that for other fields depending on how complex they might get.
                new Blockly.FieldDropdown([
                    ["[select layer type]", "UNSELECTED"],
                    ["Number", "NUMBER"],
                    ["Line", "LINE"],
                ]),
                "layer1",
            );
        this.appendStatementInput("codeBody").setCheck(null);
        this.setColour(230);
    },
};
