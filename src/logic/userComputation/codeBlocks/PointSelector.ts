import { PointType } from "../../../globals";
import { CompileContext, ICodeBlock } from "../compile";

// TODO: Might be completely unnecessary

export interface IPointSelector {
    id: string;
    type: "PointSelector";
    pointType: PointType;
}

// export const pointSelectorExpression = (
//     ctx: Context,
//     userCode: PointSelector,
// ): Variable => {
//     return {
//         scalarType: "point",
//         rank: 1,
//         getValue: () => ctx.grid.getAllPoints(userCode.pointType),
//     };
// };

export class PointSelector implements ICodeBlock<IPointSelector> {
    constructor(public ctx: CompileContext, public json: IPointSelector) {}
}
