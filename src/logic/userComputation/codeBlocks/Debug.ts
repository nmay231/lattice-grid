import { CompileContext, ICodeBlock } from "../compile";

export interface IDebug {
    id: string;
    type: "Debug";
    variable: string;
}

export class Debug implements ICodeBlock<IDebug> {
    constructor(public ctx: CompileContext, public json: IDebug) {}

    runOnce() {
        if (!(this.json.variable in this.ctx.variables)) {
            this.ctx.compilerErrors.push({
                message: `Missing variable name "${this.json.variable}"`,
                internalError: false,
                codeBlockIds: [this.json.id],
            });
        }
        // -console.log(this.ctx.variables[this.json.variable].getValue?.());
    }
}
