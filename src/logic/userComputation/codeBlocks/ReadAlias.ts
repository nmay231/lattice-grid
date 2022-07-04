import { CompilerError, ICodeBlock, VariableCodeBlock } from "../../../globals";
import { ComputeManager } from "../ComputeManager";

export interface IReadAlias {
    id: string;
    type: "ReadAlias";
    varId: string;
}

export class ReadAlias implements ICodeBlock<IReadAlias> {
    _underlyingExpression?: VariableCodeBlock;

    constructor(public compute: ComputeManager, public json: IReadAlias) {}

    // TODO: Better error messages (I don't need to include the var name because the codeblock will be highlighted)
    // TODO: Also, this would be a usecase where being able to throw an error would be nice.
    expandVariables() {
        if (!(this.json.varId in this.compute.variables)) {
            this.compute.compilerErrors.push({
                message: `Missing variable name "${
                    this.compute.getVariable(this.json.varId)?.name ||
                    "VARIABLE_NOT_FOUND"
                }"`,
                internalError: true,
                codeBlockIds: [this.json.id],
            });
            return;
        }
        this._underlyingExpression = this.compute.variables[this.json.varId];
    }

    variableInfo() {
        if (!this._underlyingExpression?.variableInfo) {
            this.compute.compilerErrors.push(this._noVarInfo(this.json.varId));
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
