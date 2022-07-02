import { CompilerError, ICodeBlock } from "../../../globals";
import { ComputeManager } from "../ComputeManager";

export interface IReadAlias {
    id: string;
    type: "ReadAlias";
    varId: string;
}

export class ReadAlias implements ICodeBlock<IReadAlias> {
    _underlyingExpression?: ICodeBlock;

    constructor(public compute: ComputeManager, public json: IReadAlias) {}

    expandVariables() {
        this.compute.assert(this.json.varId in this.compute.variables, {
            message: `Missing variable name "${
                this.compute.getVariable(this.json.varId)?.name ||
                "VARIABLE_NOT_FOUND"
            }"`,
            codeBlockIds: [this.json.id],
        });
        this._underlyingExpression = this.compute.variables[this.json.varId];
    }

    variableInfo() {
        if (!this._underlyingExpression?.variableInfo) {
            this.compute.assert(false, this._noVarInfo(this.json.varId));
            return null;
        }

        return this._underlyingExpression.variableInfo();
    }

    _noVarInfo(varId: string): CompilerError {
        return {
            message: `No info found for variable "${
                this.compute.getVariable(varId)?.name || "VARIABLE_NOT_FOUND"
            }"`,
            internalError: true,
            codeBlockIds: [this.json.id],
        };
    }
}
