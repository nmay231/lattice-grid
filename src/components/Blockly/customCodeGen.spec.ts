import { UserCodeJSON } from "../../logic/userComputation/codeBlocks";
import { Blockly } from "../../utils/imports";
import { codeGen } from "./customCodeGen";

describe.only("codeGen", () => {
    const generate = (block: Blockly.Block) => {
        const result = codeGen.blockToCode(block);
        const toParse = typeof result === "string" ? result : result[0];

        try {
            return JSON.parse(toParse);
        } catch (error) {
            return [toParse, error];
        }
    };

    const getWorkspace = () => new Blockly.Workspace();
    const newVar = Blockly.Variables.getOrCreateVariablePackage;

    it("should generate DefineAlias empty", () => {
        const workspace = getWorkspace();
        const defineAlias = workspace.newBlock("DefineAlias", "id1");
        const variable = newVar(workspace, "varId", "varName", "");
        defineAlias.getField("NAME")?.setValue(variable.getId());

        expect(generate(defineAlias)).toEqual<UserCodeJSON>({
            id: "id1",
            type: "DefineAlias",
            varId: "varId",
            expression: null,
        });
    });

    it("should generate DefineAlias filled", () => {
        const workspace = getWorkspace();

        const defineAlias = workspace.newBlock("DefineAlias", "id1");
        const variable = newVar(workspace, "varId", "varName", "");
        defineAlias.getField("NAME")?.setValue(variable.getId());

        const integer = workspace.newBlock("Integer", "id2");
        integer.getField("VALUE")?.setValue(42);

        const didConnect = defineAlias
            .getInput("EXPRESSION")
            ?.connection.connect(integer.outputConnection);

        expect(didConnect).toBe(true);
        expect(generate(defineAlias)).toEqual<UserCodeJSON>({
            id: "id1",
            type: "DefineAlias",
            varId: "varId",
            expression: { id: "id2", type: "Integer", value: 42 },
        });
    });

    it("should generate ReadAlias", () => {
        const workspace = getWorkspace();
        const readAlias = workspace.newBlock("ReadAlias", "id1");
        const variable = newVar(workspace, "varId", "varName", "");
        readAlias.getField("NAME")?.setValue(variable.getId());

        expect(generate(readAlias)).toEqual<UserCodeJSON>({
            id: "id1",
            type: "ReadAlias",
            varId: "varId",
        });
    });

    it("should generate Integer", () => {
        const workspace = getWorkspace();
        const integer = workspace.newBlock("Integer", "id1");
        integer.getField("VALUE")?.setValue(42);

        expect(generate(integer)).toEqual<UserCodeJSON>({
            id: "id1",
            type: "Integer",
            value: 42,
        });
    });

    it("should generate IfElse empty", () => {
        const workspace = getWorkspace();
        const IfElse = workspace.newBlock("IfElse", "id1");

        expect(generate(IfElse)).toEqual<UserCodeJSON>({
            id: "id1",
            type: "IfElse",
            expression: null,
            ifTrue: [],
            ifFalse: [],
        });
    });

    it("should generate IfElse filled", () => {
        const workspace = getWorkspace();
        const ifElse = workspace.newBlock("IfElse", "id1");
        const readAlias = workspace.newBlock("ReadAlias", "id2");

        const variable = newVar(workspace, "varId", "varName", "");
        readAlias.getField("NAME")?.setValue(variable.getId());

        const didConnect1 = ifElse
            .getInput("EXPRESSION")
            ?.connection.connect(readAlias.outputConnection);

        const defineAlias1 = workspace.newBlock("DefineAlias", "id3");
        defineAlias1.getField("NAME")?.setValue(variable.getId());
        const didConnect2 = ifElse
            .getInput("IF")
            ?.connection.connect(defineAlias1.previousConnection);

        const defineAlias2 = workspace.newBlock("DefineAlias", "id4");
        defineAlias2.getField("NAME")?.setValue(variable.getId());
        const didConnect3 = ifElse
            .getInput("ELSE")
            ?.connection.connect(defineAlias2.previousConnection);

        expect(didConnect1).toBe(true);
        expect(didConnect2).toBe(true);
        expect(didConnect3).toBe(true);
        expect(generate(ifElse)).toEqual<UserCodeJSON>({
            id: "id1",
            type: "IfElse",
            expression: { id: "id2", varId: "varId", type: "ReadAlias" },
            ifTrue: [
                {
                    id: "id3",
                    varId: "varId",
                    type: "DefineAlias",
                    expression: null,
                },
            ],
            ifFalse: [
                {
                    id: "id4",
                    varId: "varId",
                    type: "DefineAlias",
                    expression: null,
                },
            ],
        });
    });
});
