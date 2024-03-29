import { PuzzleManager } from "../PuzzleManager";
import { CompilerErrorDetails, ICodeBlock, NeedsUpdating, VariableCodeBlock } from "../types";
import { Blockly } from "../utils/imports/blockly";
import { CodeBlocks, UserCodeJSON } from "./codeBlocks";
import { CompilerError } from "./utils";

type KeysMatching<Obj, Type> = keyof Obj extends infer K
    ? K extends keyof Obj
        ? Type extends Obj[K]
            ? K
            : never
        : never
    : never;

export class ComputeManager {
    codeBlocks: Record<string, ICodeBlock> = {}; // string = BlockId
    variables: Record<string, VariableCodeBlock> = {}; // string = variable name
    compilerErrors: CompilerErrorDetails[] = [];

    // Should a failing validation show errors are internal (we generated invalid code) or external (the user did not copy the code correctly)?
    _weGeneratedTheCode = false;

    constructor(public puzzle: PuzzleManager) {}

    _parseJson(str: string): UserCodeJSON {
        try {
            return JSON.parse(str) as NeedsUpdating; // TODO
        } catch {
            this.compilerErrors.push({
                message: `failed to parse: ${str}`,
                isInternal: this._weGeneratedTheCode,
                codeBlockIds: [],
            });
            return {} as NeedsUpdating;
        }
    }

    compileBlock = (parent: ICodeBlock | null, json: UserCodeJSON): void => {
        if (typeof json?.id === "string" && json.type in CodeBlocks) {
            try {
                // TODO: Use satisfies here and in every code block
                const codeBlock = new CodeBlocks[json.type](this, json as NeedsUpdating);
                this.codeBlocks[json.id] = codeBlock;
                return;
            } catch (e) {
                if (e instanceof CompilerError) {
                    this.compilerErrors.push(e.details);
                    return;
                }
            }
        }

        this.compilerErrors.push({
            message: `Failed to initialize "${json.type}" block nested under ${
                parent && parent.json.type
            }`,
            isInternal: true,
            codeBlockIds: parent ? [parent.json.id, json.id] : [json.id],
        });
    };

    compile(jsonString: string, opts?: Partial<{ weGeneratedTheCode: boolean }>) {
        this._weGeneratedTheCode = opts?.weGeneratedTheCode || false;

        const json = this._parseJson(jsonString);
        this.compileBlock(null, json);

        const functions: KeysMatching<ICodeBlock, () => void>[] = [
            "registerVariableNames",
            "expandVariables",
            "validateInputs",
        ];

        const blocks = Object.values(this.codeBlocks);

        for (const func of functions) {
            for (const block of blocks) block[func]?.();
        }

        this._weGeneratedTheCode = false;
    }

    runOnce() {
        const blocks = Object.values(this.codeBlocks);

        for (const block of blocks) block.runOnce?.();
    }

    getVariable(varId: string): null | Blockly.VariableModel {
        return Blockly.Variables.getOrCreateVariablePackage(Blockly.getMainWorkspace(), varId);
    }
}
