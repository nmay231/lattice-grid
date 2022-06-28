import { UserCodeJSON } from ".";
import { CompileContext, ICodeBlock, NeedsUpdating } from "../../../globals";

export interface IForEach {
    id: string;
    type: "ForEach";
    variableName: string;
    expression: NeedsUpdating;
    codeBody: UserCodeJSON[];
}

export class ForEach implements ICodeBlock<IForEach> {
    constructor(public ctx: CompileContext, public json: IForEach) {}

    registerVariableNames() {
        console.log(this);
        if (this.json.variableName in this.ctx.variables) {
            // TODO: Ironically, this will produce duplicate errors if there are more than two duplicate variable names.
            this.ctx.compilerErrors.push({
                message: "Duplicate variable/alias names",
                internalError: false,
                codeBlockIds: [
                    this.ctx.variables[this.json.variableName]?.json.id,
                    this.json.id,
                ],
            });
        }
        this.ctx.variables[this.json.variableName] = this;
    }
}
