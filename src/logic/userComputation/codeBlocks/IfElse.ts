import { NeedsUpdating } from "../../../globals";
import { CompileContext, ICodeBlock, UserCodeJSON } from "../compile";

export interface IIfElse {
    id: string;
    type: "IfElse";
    expression: NeedsUpdating;
    ifTrue: UserCodeJSON[];
    ifFalse: UserCodeJSON[];
}

// -export const ifElseStatement = (
//     ctx: Context,
//     userCode: IIfElse,
// ): CompiledCode => {
//     const variable = compileVariable(ctx, userCode.expression);
//     const ifTrue = compileOld(ctx, userCode.ifTrue);
//     const ifFalse = compileOld(ctx, userCode.ifFalse);
//     return {
//         run: () => {
//             const bool = convertToBool(variable);
//             if (bool) {
//                 ifTrue.run();
//             } else {
//                 ifFalse.run();
//             }
//         },
//     };
// };

export class IfElse implements ICodeBlock<IIfElse> {
    constructor(public ctx: CompileContext, public json: IIfElse) {}
}
