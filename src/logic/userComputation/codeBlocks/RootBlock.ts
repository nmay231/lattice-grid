import { UserCodeJSON } from ".";
import { CompileContext, ICodeBlock, NeedsUpdating } from "../../../globals";

export interface IRootBlock {
    id: string;
    type: "RootBlock";
    codeBody: UserCodeJSON[];
}

export class RootBlock implements ICodeBlock<IRootBlock> {
    constructor(public ctx: CompileContext, public json: IRootBlock) {
        for (let code of json.codeBody) {
            // -compile(ctx, code);
            (1 as NeedsUpdating)(ctx, code);
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
