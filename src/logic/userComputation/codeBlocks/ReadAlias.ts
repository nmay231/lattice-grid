import { ICodeBlock } from "../../../globals";
import { ComputeManager } from "../ComputeManager";

export interface IReadAlias {
    id: string;
    type: "ReadAlias";
    name: string;
}

export class ReadAlias implements ICodeBlock<IReadAlias> {
    _underlyingExpression?: ICodeBlock;

    constructor(public compute: ComputeManager, public json: IReadAlias) {}

    expandVariables() {
        if (!(this.json.name in this.compute.variables)) {
            this.compute.compilerErrors.push({
                message: `Missing variable name "${this.json.name}"`,
                internalError: false,
                codeBlockIds: [this.json.id],
            });
        }
        this._underlyingExpression = this.compute.variables[this.json.name];
    }

    variableInfo() {
        if (!this._underlyingExpression?.variableInfo) {
            this._uninitialized();
            return null;
        }
        return this._underlyingExpression.variableInfo();
    }

    _uninitialized() {
        this.compute.compilerErrors.push({
            message: `Uninitialized variable "${this.json.name}"`,
            internalError: true,
            codeBlockIds: [this.json.id],
        });
    }
}
