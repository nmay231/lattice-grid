import { ICodeBlock, NeedsUpdating } from "../../../globals";
import { ComputeManager } from "../ComputeManager";

export interface IMarkInvalid {
    id: string;
    type: "MarkInvalid";
    expression: NeedsUpdating;
    userMessage?: string;
}

export class MarkInvalid implements ICodeBlock<IMarkInvalid> {
    constructor(public compute: ComputeManager, public json: IMarkInvalid) {
        compute.assert(false, {
            message: "MarkInvalid not supported yet",
            internalError: true,
        });
    }
}
