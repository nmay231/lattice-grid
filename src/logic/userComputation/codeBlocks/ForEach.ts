import { UserCodeJSON } from ".";
import { ICodeBlock, NeedsUpdating } from "../../../globals";
import { ComputeManager } from "../ComputeManager";

export interface IForEach {
    id: string;
    type: "ForEach";
    variableName: string;
    expression: NeedsUpdating;
    codeBody: UserCodeJSON[];
}

export class ForEach implements ICodeBlock<IForEach> {
    constructor(public compute: ComputeManager, public json: IForEach) {}

    registerVariableNames() {
        console.log(this);
        if (this.json.variableName in this.compute.variables) {
            // TODO: Ironically, this will produce duplicate errors if there are more than two duplicate variable names.
            this.compute.compilerErrors.push({
                message: "Duplicate variable/alias names",
                internalError: false,
                codeBlockIds: [
                    this.compute.variables[this.json.variableName]?.json.id,
                    this.json.id,
                ],
            });
        }
        this.compute.variables[this.json.variableName] = this;
    }
}
