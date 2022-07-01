import { ICodeBlock, PointType } from "../../../globals";
import { ComputeManager } from "../ComputeManager";

// TODO: Might be completely unnecessary

export interface IPointSelector {
    id: string;
    type: "PointSelector";
    pointType: PointType;
}

// -export const pointSelectorExpression = (
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
    constructor(public compute: ComputeManager, public json: IPointSelector) {}
}
