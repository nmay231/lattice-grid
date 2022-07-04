import { CompilerError, ICodeBlock, VariableCodeBlock } from "../../globals";
import { Blockly } from "../../utils/Blockly";
import { PuzzleManager } from "../PuzzleManager";
import { CodeBlocks, UserCodeJSON } from "./codeBlocks";
import { RealCompilerError } from "./utils";

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
    compilerErrors: CompilerError[] = [];

    // Should a failing validation show errors are internal (we generated invalid code) or external (the user did not copy the code correctly)?
    _weGeneratedTheCode = false;

    constructor(public puzzle: PuzzleManager) {}

    _parseJson(str: string): object {
        try {
            return JSON.parse(str);
        } catch {
            this.compilerErrors.push({
                message: `failed to parse: ${str}`,
                internalError: this._weGeneratedTheCode,
                codeBlockIds: [],
            });
            return {};
        }
    }

    compileBlock = (parent: ICodeBlock | null, json: UserCodeJSON): void => {
        if (typeof json?.id === "string" && json.type in CodeBlocks) {
            try {
                const codeBlock = new CodeBlocks[json.type](this, json as any);
                this.codeBlocks[json.id] = codeBlock;
                return;
            } catch (e) {
                if (e instanceof RealCompilerError) {
                    this.compilerErrors.push(e.details);
                    return;
                }
            }
        }

        this.compilerErrors.push({
            message: `Failed to initialize "${json.type}" block nested under ${
                parent && parent.json.type
            }`,
            internalError: true,
            codeBlockIds: parent ? [parent.json.id, json.id] : [json.id],
        });
    };

    compile(
        jsonString: string,
        opts?: Partial<{ weGeneratedTheCode: boolean }>,
    ) {
        this._weGeneratedTheCode = opts?.weGeneratedTheCode || false;

        const json = this._parseJson(jsonString);
        this.compileBlock(null, json as UserCodeJSON);

        const functions: KeysMatching<ICodeBlock, () => void>[] = [
            "registerVariableNames",
            "expandVariables",
            "validateInputs",
        ];

        const blocks = Object.values(this.codeBlocks);

        for (let func of functions) {
            for (let block of blocks) block[func]?.();
        }

        this._weGeneratedTheCode = false;
    }

    runOnce() {
        const blocks = Object.values(this.codeBlocks);

        for (let block of blocks) block.runOnce?.();
    }

    getVariable(varId: string): null | Blockly.VariableModel {
        return Blockly.Variables.getOrCreateVariablePackage(
            Blockly.getMainWorkspace(),
            varId,
        );
    }
}
