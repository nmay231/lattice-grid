import { compile, CompileContext, ICodeBlock, UserCodeJSON } from "../compile";

export interface IRootBlock {
    id: string;
    type: "RootBlock";
    codeBody: UserCodeJSON[];
}

export class RootBlock implements ICodeBlock<IRootBlock> {
    constructor(public ctx: CompileContext, public json: IRootBlock) {
        for (let code of json.codeBody) {
            compile(ctx, code);
        }
    }

    validateInputs() {
        if (!this.json.codeBody.length) {
            this.ctx.compilerErrors.push({
                message: "The root block must have at least one statement",
                internalError: false,
                codeBlockIds: [this.json.id],
            });
        }
    }
}
