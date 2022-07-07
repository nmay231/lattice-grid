import { UserCodeJSON } from ".";
import { ICodeBlock, VariableCodeBlock } from "../../../globals";
import { ComputeManager } from "../ComputeManager";
import { blockIsVariable, CompilerError } from "../utils";

export interface IDebug {
    id: string;
    type: "Debug";
    expression: UserCodeJSON | null;
}

export class Debug implements ICodeBlock<IDebug> {
    value: VariableCodeBlock;
    constructor(public compute: ComputeManager, public json: IDebug) {
        if (!json.expression) {
            throw new CompilerError({
                // TODO: Is there any value to allowing no expressions? Like maybe it could log information about the code run from that spot like "checked ten numbers from the number layer" or something. I don't have a real clear picture of how that would work though. Besides, I would implement that using shadow blocks which means json.expression would *always* be defined.
                message: "Debug statements must have expressions given to them",
                codeBlockIds: [json.id],
                isInternal: false,
            });
        }

        compute.compileBlock(this, json.expression);
        const block = compute.codeBlocks[json.expression.id];

        if (blockIsVariable(block)) {
            this.value = block;
        } else {
            throw new CompilerError({
                message: "Block is not an expression",
                codeBlockIds: [json.id, json.expression.id],
            });
        }
    }

    runOnce() {
        // TODO: Actually display this to the user in the DOM and come up with a way to display all types of data.
        console.log(this.value.getValue());
    }
}
