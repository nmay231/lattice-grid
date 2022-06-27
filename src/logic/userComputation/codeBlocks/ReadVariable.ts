import { CompileContext, ICodeBlock } from "../compile";

export interface IReadVariable {
    id: string;
    type: "ReadVariable";
    name: string;
}

export class ReadVariable implements ICodeBlock<IReadVariable> {
    _underlyingExpression?: ICodeBlock;

    constructor(public ctx: CompileContext, public json: IReadVariable) {}

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
