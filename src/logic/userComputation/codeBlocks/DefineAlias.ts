import { UserCodeJSON } from ".";
import { CompileContext, ICodeBlock } from "../../../globals";

export interface IDefineAlias {
    id: string;
    type: "DefineAlias";
    name: string;
    expression: UserCodeJSON;
}

export class DefineAlias implements ICodeBlock<IDefineAlias> {
    constructor(public ctx: CompileContext, public json: IDefineAlias) {}

    registerVariableNames() {
        if (this.json.name in this.ctx.variables) {
            // TODO: Ironically, this will produce duplicate errors if there are more than two duplicate variable names.
            this.ctx.compilerErrors.push({
                message: "Duplicate variable/alias names",
                internalError: false,
                codeBlockIds: [
                    this.ctx.variables[this.json.name].json.id,
                    this.json.id,
                ],
            });
        }
        this.ctx.variables[this.json.name] = this;
    }
}
