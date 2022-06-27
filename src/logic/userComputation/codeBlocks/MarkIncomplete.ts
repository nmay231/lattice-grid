import { NeedsUpdating } from "../../../globals";
import { CompileContext, ICodeBlock } from "../compile";

// TODO: Rename to mark invalid?

export interface IMarkIncomplete {
    id: string;
    type: "MarkIncomplete";
    expression: NeedsUpdating;
    userMessage?: string;
}

// export const markIncompleteStatement = (
//     ctx: Context,
//     userCode: IMarkIncomplete,
// ): CompiledCode => {
//     const x = compileVariable(ctx, userCode.expression);
//     return {
//         run: () => {
//             ctx.puzzleWarnings.push({
//                 message: userCode.userMessage || "",
//                 objects: x.getValue(),
//             });
//         },
//     };
// };

export class MarkIncomplete implements ICodeBlock<IMarkIncomplete> {
    constructor(public ctx: CompileContext, public json: IMarkIncomplete) {}
}
