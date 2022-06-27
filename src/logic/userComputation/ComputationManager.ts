import { PuzzleManager } from "../PuzzleManager";
import { compile, CompileContext, ICodeBlock } from "./compile";

type KeysMatching<Obj, Type> = keyof Obj extends infer K
    ? K extends keyof Obj
        ? Type extends Obj[K]
            ? K
            : never
        : never
    : never;

export class ComputationManager {
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
