import { CompileContext, ICodeBlock } from "../../../globals";

export interface IObjectSelector {
    id: string;
    type: "ObjectSelector";
    layerId: string;
    // TODO: How should filters be structured? Should there be multiple distinct filters, or should it just be a codeBody that returns whatever? It could be an IVariable codeBody with type boolean. That might work...
    // filters: any,
}

// export const objectSelectorExpression = (
//     ctx: Context,
//     userCode: ObjectSelector,
// ): Variable => {
//     return {
//         scalarType: "object",
//         rank: 1,
//         getValue: () => {
//             return ctx.storage.getStored({
//                 layer: ctx.layers[userCode.layerId],
//                 grid: ctx.grid,
//             })?.objects;
//         },
//     };
// };

export class ObjectSelector implements ICodeBlock<IObjectSelector> {
    constructor(public ctx: CompileContext, public json: IObjectSelector) {}
}
