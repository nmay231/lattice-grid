import { CompileContext, ICodeBlock, NeedsUpdating } from "../../globals";
import { PuzzleManager } from "../PuzzleManager";
import { CodeBlocks, UserCodeJSON } from "./codeBlocks";

const compile = (ctx: CompileContext, json: UserCodeJSON): void => {
    try {
        if (!(json.type in CodeBlocks)) {
            throw Error("" as NeedsUpdating);
        }
        const codeBlock = new CodeBlocks[json.type](
            ctx,
            json as any,
        ) as ICodeBlock;
        ctx.codeBlocks[json.id] = codeBlock;
    } catch {
        ctx.compilerErrors.push({
            message: `Failed to initialize "${json.type}" block`,
            internalError: true,
            codeBlockIds: [json.id],
        });
    }
};

type KeysMatching<Obj, Type> = keyof Obj extends infer K
    ? K extends keyof Obj
        ? Type extends Obj[K]
            ? K
            : never
        : never
    : never;

export class ComputeManager {
    codeBlocks: Record<string, ICodeBlock> = {}; // string = BlockId
    variables: Record<string, ICodeBlock> = {}; // string = variable name
    ctx: CompileContext;

    constructor(private puzzle: PuzzleManager) {
        this.ctx = {
            codeBlocks: {},
            compilerErrors: [],
            variables: {},
            grid: puzzle.grid,
            layers: puzzle.layers,
            puzzleErrors: [],
            puzzleWarnings: [],
            storage: puzzle.storage,
        };
    }

    compile(json: any) {
        compile(this.ctx, json);

        const functions: KeysMatching<ICodeBlock, () => void>[] = [
            "registerVariableNames",
            "expandVariables",
            "validateInputs",
        ];

        const blocks = Object.values(this.ctx.codeBlocks);

        for (let func of functions) {
            for (let block of blocks) block[func]?.();
        }
    }

    runOnce() {
        const blocks = Object.values(this.ctx.codeBlocks);

        for (let block of blocks) block.runOnce?.();
    }
}
