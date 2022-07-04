import { ICodeBlock, NeedsUpdating } from "../../../globals";
import { ComputeManager } from "../ComputeManager";
import { CompilerError } from "../utils";

export interface IMarkInvalid {
    id: string;
    type: "MarkInvalid";
    expression: NeedsUpdating;
    userMessage?: string;
}

export class MarkInvalid implements ICodeBlock<IMarkInvalid> {
    constructor(public compute: ComputeManager, public json: IMarkInvalid) {
        throw new CompilerError({
            message: "MarkInvalid not supported yet",
            codeBlockIds: [this.json.id],
        });
    }
}
