import { NeedsUpdating } from "../../../globals";
import { CompileContext, ICodeBlock } from "../compile";

export interface ICompare {
    id: string;
    type: "Compare";
    compareType: ">" | "<";
    left: NeedsUpdating;
    right: NeedsUpdating;
}

// -export const compareExpression = (
//     ctx: Context,
//     userCode: Compare,
// ): Variable => {
//     const left = compileVariable(ctx, userCode.left);
//     const right = compileVariable(ctx, userCode.right);

//     -if (
//         left.rank !== 0 ||
//         right.rank !== 0 ||
//         left.scalarType !== right.scalarType ||
//         left.scalarType !== "integer"
//     ) {
//         ctx.compilerErrors.push({ message: "issue with compare expression" });
//     }

//     -return {
//         scalarType: "boolean",
//         rank: 0,
//         getValue: () => {
//             switch (userCode.compareType) {
//                 case "<":
//                     return left.getValue() < right.getValue();
//                 case ">":
//                     return left.getValue() > right.getValue();
//             }
//         },
//     };
// };

export class Compare implements ICodeBlock<ICompare> {
    constructor(public ctx: CompileContext, public json: ICompare) {}
}
