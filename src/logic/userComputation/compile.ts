import { Grid, NeedsUpdating } from "../../globals";
import { Blockly } from "../../utils/Blockly";
import { StorageManager } from "../StorageManager";
import { Alias, IAlias } from "./codeBlocks/Alias";
import { Compare, ICompare } from "./codeBlocks/Compare";
import { Debug, IDebug } from "./codeBlocks/Debug";
import { ForEach, IForEach } from "./codeBlocks/ForEach";
import { IfElse, IIfElse } from "./codeBlocks/IfElse";
import { IInteger, Integer } from "./codeBlocks/Integer";
import { IMarkIncomplete, MarkIncomplete } from "./codeBlocks/MarkIncomplete";
import { IObjectSelector, ObjectSelector } from "./codeBlocks/ObjectSelector";
import { IPointSelector, PointSelector } from "./codeBlocks/PointSelector";
import { IReadVariable, ReadVariable } from "./codeBlocks/ReadVariable";
import { IRootBlock, RootBlock } from "./codeBlocks/RootBlock";

type PuzzleError = {
    message: string;
    objects?: {
        layerId: string;
        gridId: string;
        objectIds: string[];
    };
};

type CompilerError = {
    message: string;
    internalError: boolean;
    codeBlockIds: string[];
};

export interface CompileContext {
    // TODO: Ensure that fields of this context are static after compilation and are not dynamic each code run
    codeBlocks: Record<string, ICodeBlock>;
    variables: { [key: string]: ICodeBlock };
    compilerErrors: CompilerError[];

    // That means that these should only be passed to computation at runtime
    layers: { [layerId: string]: any };
    grid: Grid;
    storage: StorageManager;
    // And even these should probably be so as well, I think
    puzzleErrors: PuzzleError[];
    puzzleWarnings: PuzzleError[];
}

const CodeBlockMap = {
    Alias,
    Compare,
    Debug,
    ForEach,
    IfElse,
    Integer,
    MarkIncomplete,
    ObjectSelector,
    PointSelector,
    ReadVariable,
    RootBlock,
};

// TODO: Merge with ComputationManager.compile()
export const compile = (ctx: CompileContext, json: UserCodeJSON): void => {
    try {
        if (!(json.type in CodeBlockMap)) {
            throw Error("" as NeedsUpdating);
        }
        const codeBlock: ICodeBlock = new CodeBlockMap[json.type](
            ctx,
            json as any,
        );
        ctx.codeBlocks[json.id] = codeBlock;
    } catch {
        ctx.compilerErrors.push({
            message: `Failed to initialize "${json.type}" block`,
            internalError: true,
            codeBlockIds: [json.id],
        });
    }
};

export type ICodeBlock<T extends UserCodeJSON = UserCodeJSON> = {
    json: T;

    registerVariableNames?: () => void;
    expandVariables?: () => void;
    variableInfo?: () => IVariable | null;
    validateInputs?: () => void;
    // Figure out the requirements of this function. Should IVariable have getValue()?
    // What about IVariable.effectiveRank?
    // Should this be required?
    runOnce?: () => void;

    // validation: expression type+rank validation, variable scope checks, alias expansion ->
    // optimization: unused code errors, optimization pattern matching, caching static values ->
    // runtime: step-solver, puzzle solution validation ->
    // stringify: compression (var name shorten, remove useless aliases), debug output (basically a memory dump)
};

export type UserCodeJSON =
    | IAlias
    | ICompare
    | IDebug
    | IForEach
    | IIfElse
    | IInteger
    | IMarkIncomplete
    | IObjectSelector
    | IPointSelector
    | IReadVariable
    | IRootBlock;

export const DEFAULT_ALIAS_NAME = "MY ALIAS";

export const addAliasCategoryToToolbox = (workspace: Blockly.Workspace) => {
    const variables = Blockly.Variables.allUsedVarModels(workspace);

    // Always show the user a variable so that they have some idea of how it works
    const id = Blockly.Variables.getOrCreateVariablePackage(
        workspace,
        null,
        DEFAULT_ALIAS_NAME,
        "",
    ).getId();
    const toolboxCategories: any[] = [
        { kind: "block", type: "user_alias" },
        { kind: "block", type: "read_variable", fields: { name: { id } } },
    ];

    for (let variableId of variables.map((v) => v.getId())) {
        if (id === variableId) continue;
        toolboxCategories.push({
            kind: "block",
            type: "read_variable",
            fields: { name: { id: variableId } },
        });
    }
    return toolboxCategories;
};

export interface IVariable {
    // For now, I think I'll take after the MatLab style of every variable being a nested array of a scalar type.
    scalarType: "boolean" | "integer" | "point" | "object";
    rank: number;
    effectiveRank?: number; // TODO: Is this what I need to handle iteration in for-each loops?
    // TODO: Eventually, I want a convenient function that will return values in the specified rank
    // getValue: () => any;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const example = `
// Part 1.a: ensure every cell is filled with a number
ForEach(cell, (cell) => {
    if (number on cell) {
        // Two things. There is a slight ambiguity about what "<object> on cell" might mean if the object is two-/multi-Point.
        // Also, I should definitely think about allowing broadcasting for certain operations such as error(array of cells) and markIncomplete(array of objects).
        markPuzzleIncomplete();
    }
});
// Part 1.b alternate: ensure every cell is filled with a number (much better)
// However, there is ambiguity about whether grid.cells refers to all possible cells or just those with an outline/those in regions (think about cells placed outside the grid).
if (numbers.length < grid.cells.length) {
    markPuzzleIncomplete();
}

// Part 2: ensure no repeated numbers in rows and columns
ForEach(grid.horizontal_rows UNION grid.vertical_rows, (row) => {
    const numbers = number on row;
    ForEach(numbers, (num) => {
        if (numbers.count(num) >= 2) {
            // TODO: Should I allow using the same syntax of object intersection (\`<a> on <b>\`) for filtering (\`numbers.filter(n => n === num)\`)?
            error((num on numbers).point);
        }
    })
});

// Part 3: The grid must be a square using square cells (This should be part 1 honestly).
UsingGrid(
    type = "square",
    restriction = IDontKnowHowToEncodeThis(grid.width == grid.height),
);

// Part 1-3.a: for a latin square (this is an alias since it is such a common operation)
latinSquare()

ForEach(square UNION circle, (square_or_circle) => {
    // Type: point[]
    const neighbors = SymmetriesOfVector(square_or_circle.point, \`something to get 8 neighbors\`);
    const center_number = number on square_or_circle;
    const n_consecutive = 0, n_not_consecutive = 0, n_empty = 0;
    ForEach(neighbors, (neighbor) => {
        if (number not on neighbor) {
            n_empty += 1;
        } else if (abs((number on neighbor) - center_number) === 1) {
            n_consecutive += 1;
        } else {
            n_not_consecutive += 1;
        }
    });
    // some logic is shared but not all of it
    if (square on square_or_circle.point) {
        // Only error if we know for *certain* that the clue is violated
        if (n_consecutive + n_empty < center_number || n_consecutive > center_number) {
            error(square_or_circle, "squares must indicate the number of surrounding numbers that are consecutive");
        }
    } else {
        if (n_not_consecutive + n_empty < center_number || n_not_consecutive > center_number) {
            error(square_or_circle, "circles must indicate the number of surrounding numbers that are not consecutive");
        }
    }
});
` as NeedsUpdating;
