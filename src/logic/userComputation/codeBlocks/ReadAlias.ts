import { CompileContext, ICodeBlock } from "../../../globals";

export interface IReadAlias {
    id: string;
    type: "ReadAlias";
    name: string;
}

export class ReadAlias implements ICodeBlock<IReadAlias> {
    _underlyingExpression?: ICodeBlock;

    constructor(public ctx: CompileContext, public json: IReadAlias) {}

    expandVariables() {
        if (!(this.json.name in this.ctx.variables)) {
            this.ctx.compilerErrors.push({
                message: `Missing variable name "${this.json.name}"`,
                internalError: false,
                codeBlockIds: [this.json.id],
            });
        }
        this._underlyingExpression = this.ctx.variables[this.json.name];
    }

    variableInfo() {
        if (!this._underlyingExpression?.variableInfo) {
            this._uninitialized();
            return null;
        }
        return this._underlyingExpression.variableInfo();
    }

    _uninitialized() {
        this.ctx.compilerErrors.push({
            message: `Uninitialized variable "${this.json.name}"`,
            internalError: true,
            codeBlockIds: [this.json.id],
        });
    }
}
