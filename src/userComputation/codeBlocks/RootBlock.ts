import { UserCodeJSON } from ".";
import { ICodeBlock } from "../../types";
import { ComputeManager } from "../ComputeManager";

export interface IRootBlock {
    id: string;
    type: "RootBlock";
    codeBody: UserCodeJSON[];
}

export class RootBlock implements ICodeBlock<IRootBlock> {
    constructor(
        public compute: ComputeManager,
        public json: IRootBlock,
    ) {
        if (!Array.isArray(json.codeBody)) {
            compute.compilerErrors.push({
                message: "RootBlock requires a codeBody attribute",
                isInternal: true,
                codeBlockIds: [json.id],
            });
            return;
        }
        json.codeBody.forEach((block) => compute.compileBlock(this, block));
    }

    validateInputs() {
        if (!this.json.codeBody.length) {
            this.compute.compilerErrors.push({
                message: "The root block must have at least one statement",
                isInternal: false,
                codeBlockIds: [this.json.id],
            });
        }
    }
}
