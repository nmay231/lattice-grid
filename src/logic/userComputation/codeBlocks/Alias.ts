import { CompileContext, ICodeBlock, UserCodeJSON } from "../compile";

export interface IAlias {
    id: string;
    type: "Alias";
    name: string;
    expression: UserCodeJSON;
}

export class Alias implements ICodeBlock<IAlias> {
    constructor(public ctx: CompileContext, public json: IAlias) {}

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
