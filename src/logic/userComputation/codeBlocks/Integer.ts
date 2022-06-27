import { CompileContext, ICodeBlock, IVariable } from "../compile";

export interface IInteger {
    id: string;
    type: "Integer";
    value: number;
}

export class Integer implements ICodeBlock<IInteger> {
    constructor(public ctx: CompileContext, public json: IInteger) {}

    variableInfo(): IVariable {
        return { rank: 0, scalarType: "integer" };
    }

    validateInputs() {
        if (typeof this.json.value !== "number" || this.json.value % 1 !== 0) {
            this.ctx.compilerErrors.push({
                message: `${this.json.value} is not an integer`,
                internalError: true,
                codeBlockIds: [this.json.id],
            });
        }
    }
}
