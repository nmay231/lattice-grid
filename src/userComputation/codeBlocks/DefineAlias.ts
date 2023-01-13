import { UserCodeJSON } from ".";
import { ICodeBlock } from "../../types";
import { ComputeManager } from "../ComputeManager";

export interface IDefineAlias {
    id: string;
    type: "DefineAlias";
    varId: string;
    expression: UserCodeJSON | null;
}

export class DefineAlias implements ICodeBlock<IDefineAlias> {
    constructor(public compute: ComputeManager, public json: IDefineAlias) {}

    registerVariableNames() {
        if (this.json.varId in this.compute.variables) {
            // TODO: Ironically, this will produce duplicate errors if there are more than two duplicate variable names.
            this.compute.compilerErrors.push({
                message: "Duplicate variable/alias names",
                isInternal: false,
                codeBlockIds: [this.compute.variables[this.json.varId].json.id, this.json.id],
            });
        }
        // this.compute.variables[this.json.varId] = this;
    }
}
