import { UserCodeJSON } from ".";
import { ICodeBlock } from "../../../globals";
import { ComputeManager } from "../ComputeManager";

export interface IRootBlock {
    id: string;
    type: "RootBlock";
    codeBody: UserCodeJSON[];
}

export class RootBlock implements ICodeBlock<IRootBlock> {
    constructor(public compute: ComputeManager, public json: IRootBlock) {
        if (!Array.isArray(json.codeBody)) {
            compute.compilerErrors.push({
                message: "RootBlock requires a codeBody attribute",
                internalError: false,
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
                internalError: false,
                codeBlockIds: [this.json.id],
            });
        }
    }
}
