import { UserCodeJSON } from ".";
import { ICodeBlock, NeedsUpdating } from "../../../globals";
import { ComputeManager } from "../ComputeManager";

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
    constructor(public compute: ComputeManager, public json: IIfElse) {
        if (json.ifTrue?.length) {
            json.ifTrue.forEach((block) => compute.compileBlock(this, block));
        }
        if (json.ifFalse?.length) {
            json.ifFalse.forEach((block) => compute.compileBlock(this, block));
        }
    }
}
