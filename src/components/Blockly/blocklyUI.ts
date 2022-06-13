import * as Blockly from "blockly";

Blockly.Blocks["objects_of_layer"] = {
    init(this: Blockly.Block) {
        this.appendDummyInput()
            .appendField("in")
            .appendField(
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
        this.setTooltip("");
        this.setHelpUrl("");
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
        this.setTooltip("");
        this.setHelpUrl("");
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
        this.setTooltip("");
        this.setHelpUrl("");
    },
};

Blockly.Blocks["mark_incomplete"] = {
    init(this: Blockly.Block) {
        this.appendValueInput("expression")
            .setCheck(null)
            .appendField("Mark incomplete");
        this.appendValueInput("userMessage")
            .setCheck(null)
            .appendField("with the message")
            .appendField(new Blockly.FieldTextInput("ERROR"), "userMessage");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    },
};

Blockly.Blocks["user_alias"] = {
    init(this: Blockly.Block) {
        this.appendValueInput("expression").setCheck(null).appendField("Alias");
        this.appendValueInput("aliasName")
            .setCheck(null)
            .appendField("as this")
            .appendField(new Blockly.FieldTextInput("Alias Name"), "name");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    },
};

Blockly.Blocks["root_block"] = {
    init(this: Blockly.Block) {
        this.appendDummyInput()
            .appendField("with")
            .appendField(
                new Blockly.FieldDropdown([
                    ["any", "ANY"],
                    ["a square", "SQUARE"],
                    ["a hexagon", "HEX"],
                ]),
                "grid_type",
            )
            .appendField("grid");
        this.appendDummyInput()
            .appendField("and a")
            .appendField(
                new Blockly.FieldDropdown([
                    ["[select layer type]", "UNSELECTED"],
                    ["Number", "NUMBER"],
                    ["Line", "LINE"],
                ]),
                "layer1",
            )
            .appendField("layer");
        // .appendField("(TODO: mutator)");
        this.appendStatementInput("NAME").setCheck(null);
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    },
};
