import { getLayers } from "../../atoms/layers";
import { UserCodeJSON } from "../../logic/userComputation/codeBlocks";
import { DEFAULT_ALIAS_NAME } from "../../logic/userComputation/utils";
import { Blockly } from "../../utils/Blockly";

// TODO: this.setTooltip("") and other helpful things like colour and such

const blocks = Blockly.Blocks as Record<
    UserCodeJSON["type"],
    { init: (this: Blockly.Block) => void }
>;

blocks["Compare"] = {
    init() {
        this.appendValueInput("LEFT").setCheck(null);

        this.appendValueInput("RIGHT")
            .setCheck(null)
            .appendField(
                new Blockly.FieldDropdown([
                    // TODO: Have Compare export a map of strings to operations and build the dropdown based on that.
                    ["<", "<"],
                    [">", ">"],
                    ["=", "="],
                ]),
                "COMPARE_TYPE",
            );
        this.setInputsInline(true);
        this.setOutput(true, null);
        this.setColour(230);
    },
};

blocks["Debug"] = {
    init() {
        this.appendValueInput("EXPRESSION")
            .setCheck(null)
            .appendField("Debug value");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    },
};

blocks["DefineAlias"] = {
    init() {
        this.appendValueInput("EXPRESSION")
            .setCheck(null)
            .appendField("Define")
            .appendField(new Blockly.FieldVariable(DEFAULT_ALIAS_NAME), "NAME")
            .appendField("as");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    },
};

blocks["ForEach"] = {
    init() {
        this.appendValueInput("COLLECTION")
            .setCheck(null)
            .appendField("for each")
            .appendField(new Blockly.FieldTextInput("instance"), "NAME")
            .appendField("of the collection");
        this.appendStatementInput("CODE_BODY")
            .setCheck(null)
            .appendField("run");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    },
};

blocks["IfElse"] = {
    init() {
        this.appendValueInput("EXPRESSION").setCheck(null).appendField("If");
        this.appendStatementInput("IF").setCheck(null).appendField("Then");
        this.appendStatementInput("ELSE").setCheck(null).appendField("Else");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    },
};

blocks["Integer"] = {
    init() {
        this.appendDummyInput().appendField(
            new Blockly.FieldNumber(0, -Infinity, Infinity, 1),
            "VALUE",
        );
        this.setOutput(true, null);
        this.setColour(230);
    },
};

blocks["MarkInvalid"] = {
    init() {
        this.appendValueInput("EXPRESSION").setCheck(null).appendField("Mark");
        this.appendDummyInput()
            .appendField("as invalid with message")
            .appendField(
                new Blockly.FieldTextInput("Shown to solver"),
                "MESSAGE",
            );
        this.appendDummyInput()
            .appendField("highlight?")
            .appendField(new Blockly.FieldCheckbox("highlight"), "HIGHLIGHTED");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    },
};

blocks["ObjectSelector"] = {
    init() {
        this.appendDummyInput().appendField(
            new Blockly.FieldDropdown(() => {
                // TODO: How to trigger this function if the current layers change...
                const layers = getLayers();
                return layers.layers
                    .filter(({ ethereal }) => !ethereal)
                    .map(({ id }) => [id, id]);
            }),
            "LAYER_ID",
        );
        this.setOutput(true, null);
        this.setColour(230);
    },
};

blocks["ReadAlias"] = {
    init() {
        this.appendDummyInput().appendField(
            new Blockly.FieldVariable("Alias Name"),
            "NAME",
        );
        this.setOutput(true, null);
        this.setColour(230);
    },
};

blocks["RootBlock"] = {
    init() {
        this.appendDummyInput()
            .appendField("with")
            .appendField(
                // TODO: multi-select dropdown (not available by default, but there might be some Blockly utility library I can install...)
                new Blockly.FieldDropdown([["a square", "SQUARE"]]),
                "GRID_TYPE",
            )
            .appendField("grid");
        this.appendDummyInput()
            .appendField("and the layers")
            .appendField(
                // TODO: Use a button that shows a modal to allow much more granular control. Trying to do it inside of blockly will just be a pain.
                // In fact, the grid type should also be selected in the modal.
                // But I should always show a shortened version of what the configuration is in the blockly view so that you don't always have to open the modal to see what's going on.
                // Speaking of, I probably should do that for other fields depending on how complex they might get.
                new Blockly.FieldDropdown([
                    ["[select layer type]", "UNSELECTED"],
                    ["Number", "NUMBER"],
                    ["Line", "LINE"],
                ]),
                "LAYER_CONFIG",
            );
        this.appendStatementInput("CODE_BODY").setCheck(null);
        this.setColour(230);
    },
};
