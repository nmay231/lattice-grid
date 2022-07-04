import { UserCodeJSON } from ".";
import {
    ICodeBlock,
    IVariableInfo,
    NeedsUpdating,
    VariableCodeBlock,
} from "../../../globals";
import { ComputeManager } from "../ComputeManager";
import { blockIsVariable } from "../utils";

export interface ICompare {
    id: string;
    type: "Compare";
    compareType: ">" | "<" | "=";
    left: UserCodeJSON | null;
    right: UserCodeJSON | null;
}

export class Compare implements ICodeBlock<ICompare> {
    left: VariableCodeBlock;
    right: VariableCodeBlock;

    constructor(public compute: ComputeManager, public json: ICompare) {
        if (!json.left || !json.right) {
            // TODO: Change these regular errors to CompilerErrors
            throw Error(
                "Left or right operator was not provided" as NeedsUpdating,
            );
        }

        compute.compileBlock(this, json.left);
        compute.compileBlock(this, json.right);

        const block1 = compute.codeBlocks[json.left.id];
        if (blockIsVariable(block1)) {
            this.left = block1;
        } else {
            throw Error("Left block is not a variable" as NeedsUpdating);
        }

        const block2 = compute.codeBlocks[json.right.id];
        if (blockIsVariable(block2)) {
            this.right = block2;
        } else {
            throw Error("Right block is not a variable" as NeedsUpdating);
        }
    }

    validateInputs() {
        // TODO: Allow broadcasting and all that rot
        const left = this.left.variableInfo();
        const right = this.right.variableInfo();

        if (!left) {
            this.compute.compilerErrors.push({
                message: "Left operator did not provide variableInfo",
                codeBlockIds: [this.left.json.id],
                internalError: true,
            });
            return;
        }
        if (!right) {
            this.compute.compilerErrors.push({
                message: "Right operator did not provide variableInfo",
                codeBlockIds: [this.right.json.id],
                internalError: true,
            });
            return;
        }

        if (left.rank || right.rank || left.scalarType !== right.scalarType) {
            this.compute.compilerErrors.push({
                message:
                    "Only single value comparisons of the same type are supported",
                codeBlockIds: [this.left.json.id, this.right.json.id],
                internalError: false,
            });
        }
    }

    variableInfo(): IVariableInfo {
        // TODO: rank will change once I allow broadcasting
        return { rank: 0, scalarType: "boolean" };
    }

    getValue() {
        // TODO: Implement  :P
        return true;
    }
}
