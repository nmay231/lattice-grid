import { ICodeBlock, NeedsUpdating } from "../../../globals";
import { ComputeManager } from "../ComputeManager";
import { RealCompilerError } from "../utils";

export interface IMarkInvalid {
    id: string;
    type: "MarkInvalid";
    expression: NeedsUpdating;
    userMessage?: string;
}

export class MarkInvalid implements ICodeBlock<IMarkInvalid> {
    constructor(public compute: ComputeManager, public json: IMarkInvalid) {
        throw new RealCompilerError({
            message: "MarkInvalid not supported yet",
            internalError: true,
            codeBlockIds: [this.json.id],
        });
    }
}
