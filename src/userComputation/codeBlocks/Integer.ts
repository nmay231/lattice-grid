import { ICodeBlock, IVariableInfo } from "../../types";
import { ComputeManager } from "../ComputeManager";

export interface IInteger {
    id: string;
    type: "Integer";
    value: number;
}

export class Integer implements ICodeBlock<IInteger> {
    constructor(public compute: ComputeManager, public json: IInteger) {}

    variableInfo(): IVariableInfo {
        return { rank: 0, scalarType: "integer" };
    }

    getValue() {
        return this.json.value;
    }

    validateInputs() {
        if (typeof this.json.value !== "number" || this.json.value % 1 !== 0) {
            this.compute.compilerErrors.push({
                message: `${this.json.value} is not an integer`,
                isInternal: true,
                codeBlockIds: [this.json.id],
            });
        }
    }
}
