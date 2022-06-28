import { CompileContext, ICodeBlock, NeedsUpdating } from "../../../globals";

export interface IMarkInvalid {
    id: string;
    type: "MarkInvalid";
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

export class MarkInvalid implements ICodeBlock<IMarkInvalid> {
    constructor(public ctx: CompileContext, public json: IMarkInvalid) {}
}
