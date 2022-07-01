import { ICodeBlock } from "../../../globals";
import { ComputeManager } from "../ComputeManager";

export interface IDebug {
    id: string;
    type: "Debug";
    variable: string;
}

export class Debug implements ICodeBlock<IDebug> {
    constructor(public compute: ComputeManager, public json: IDebug) {}

    runOnce() {
        if (!(this.json.variable in this.compute.variables)) {
            this.compute.compilerErrors.push({
                message: `Missing variable name "${this.json.variable}"`,
                internalError: false,
                codeBlockIds: [this.json.id],
            });
        }
        // -console.log(this.compute .variables[this.json.variable].getValue?.());
    }
}
