import { Grid, ICodeBlock, IVariableInfo } from "../../types";
import { ComputeManager } from "../ComputeManager";
import { CompilerError } from "../utils";

export interface IObjectSelector {
    id: string;
    type: "ObjectSelector";
    layerId: string;
    // TODO: How should filters be structured? Should there be multiple distinct filters, or should it just be a codeBody that returns whatever? It could be an IVariable codeBody with type boolean. That might work...
    // Perhaps filters should be implemented as a separate block; maybe a sorta compacted ForEach block?
    // filters: any,
}

export class ObjectSelector implements ICodeBlock<IObjectSelector> {
    grid: Grid;
    constructor(
        public compute: ComputeManager,
        public json: IObjectSelector,
    ) {
        if (!json.layerId) {
            throw new CompilerError({
                message: "ObjectSelector requires layerId",
                isInternal: false,
                codeBlockIds: [json.id],
            });
        }

        if (!(json.layerId in compute.puzzle.layers)) {
            // TODO: I need to decide if this type of error is alwaysInternal or not. What I mean is, it's much more likely that if all other aspects of the json is valid, that not having a matching layerId is our fault, rather than a mis-copy from outside. In other words, I should expect mostly correct code to be generated by us and should therefore label it as an isInternal.
            throw new CompilerError({
                message: `layerId does match any known layer: ${json.layerId}`,
                isInternal: false,
                codeBlockIds: [json.id],
            });
        }

        this.grid = compute.puzzle.grid; // TODO: This assumes puzzle.grid is static and will not be reassigned.
    }

    variableInfo(): IVariableInfo {
        return { rank: 1, scalarType: "object" };
    }

    getValue() {
        // TODO: Temporary fix from old expectations. All of this is likely to be scrapped anyways
        return [
            ...this.compute.puzzle.storage
                .getStored({
                    grid: this.grid,
                    layer: this.compute.puzzle.layers.get(this.json.layerId),
                })
                .entries("question"),
        ].map(([, object]) => object);
    }
}
