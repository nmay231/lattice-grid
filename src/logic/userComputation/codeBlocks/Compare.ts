import { UserCodeJSON } from ".";
import { ICodeBlock, IVariableInfo, VariableCodeBlock } from "../../../globals";
import { ComputeManager } from "../ComputeManager";
import { blockIsVariable, CompilerError } from "../utils";

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
            throw new CompilerError({
                message: "Left or right operator was not provided",
                isInternal: false,
                codeBlockIds: [json.id],
            });
        }

        compute.compileBlock(this, json.left);
        compute.compileBlock(this, json.right);

        const block1 = compute.codeBlocks[json.left.id];
        if (blockIsVariable(block1)) {
            this.left = block1;
        } else {
            throw new CompilerError({
                message: "Left block is not a variable",
                isInternal: true,
                codeBlockIds: [json.left.id],
            });
        }

        const block2 = compute.codeBlocks[json.right.id];
        if (blockIsVariable(block2)) {
            this.right = block2;
        } else {
            throw new CompilerError({
                message: "Right block is not a variable",
                isInternal: true,
                codeBlockIds: [json.right.id],
            });
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
                isInternal: true,
            });
            return;
        }
        if (!right) {
            this.compute.compilerErrors.push({
                message: "Right operator did not provide variableInfo",
                codeBlockIds: [this.right.json.id],
                isInternal: true,
            });
            return;
        }

        if (left.rank || right.rank || left.scalarType !== right.scalarType) {
            this.compute.compilerErrors.push({
                message:
                    "Only single value comparisons of the same type are supported",
                codeBlockIds: [this.left.json.id, this.right.json.id],
                isInternal: false,
            });
        }
    }

    variableInfo(): IVariableInfo {
        // TODO: rank will change once I allow broadcasting/bijection
        return { rank: 0, scalarType: "boolean" };
    }

    getValue() {
        if (this.json.compareType === "<") {
            return this.left.getValue() < this.right.getValue();
        } else if (this.json.compareType === "=") {
            return this.left.getValue() === this.right.getValue();
        } else if (this.json.compareType === ">") {
            return this.left.getValue() > this.right.getValue();
        }
    }
}
