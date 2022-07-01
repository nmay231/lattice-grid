import { UserCodeJSON } from ".";
import { ICodeBlock } from "../../../globals";
import { ComputeManager } from "../ComputeManager";

export interface IDefineAlias {
    id: string;
    type: "DefineAlias";
    name: string;
    expression: UserCodeJSON;
}

export class DefineAlias implements ICodeBlock<IDefineAlias> {
    constructor(public compute: ComputeManager, public json: IDefineAlias) {}

    registerVariableNames() {
        if (this.json.name in this.compute.variables) {
            // TODO: Ironically, this will produce duplicate errors if there are more than two duplicate variable names.
            this.compute.compilerErrors.push({
                message: "Duplicate variable/alias names",
                internalError: false,
                codeBlockIds: [
                    this.compute.variables[this.json.name].json.id,
                    this.json.id,
                ],
            });
        }
        this.compute.variables[this.json.name] = this;
    }
}
