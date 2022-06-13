import { Grid } from "../../globals";
import { StorageManager } from "../StorageManager";
import { Variable } from "./expressions";
import {
    debugStatement,
    forEachStatement,
    ifElseStatement,
    markIncompleteStatement,
    UserCodeStatement,
    userVariableStatement,
} from "./statements";

type PuzzleError = {
    message: string;
    objects: any[];
    // TODO: This might be better? I also need layerId and gridId.
    // objectIds: string[];
};

type CompilerError = {
    message: string;
    // codeBlockIds: string[]
};

export interface Context {
    grid: Grid;
    storage: StorageManager;
    layers: { [layerId: string]: any };
    variables: { [key: string]: Variable };
    compilerErrors: CompilerError[];
    puzzleErrors: PuzzleError[];
    puzzleWarnings: PuzzleError[];
}

export interface CompiledCode {
    run: () => any;
}

export const compile = (
    ctx: Context,
    userCode: UserCodeStatement[],
): CompiledCode => {
    const thingsToRun: CompiledCode[] = [];
    for (let code of userCode) {
        if (code.type === "forEach") {
            thingsToRun.push(forEachStatement(ctx, code));
        } else if (code.type === "debug") {
            thingsToRun.push(debugStatement(ctx, code));
        } else if (code.type === "markIncomplete") {
            thingsToRun.push(markIncompleteStatement(ctx, code));
        } else if (code.type === "ifElse") {
            thingsToRun.push(ifElseStatement(ctx, code));
        } else if (code.type === "userVariable") {
            thingsToRun.push(userVariableStatement(ctx, code));
        } else {
            throw Error("you failed");
        }
    }
    return {
        run: () => {
            for (let thing of thingsToRun) {
                thing.run();
            }
        },
    };
};

export const example = `
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
`;

// TODO: I'm having a hard time figuring out if, in the context of forEach-loops and potentially nested forEach-loops, I need to have operations run on individual items, run it broadcasted on 1 layer down, or run it broadcasted to the highest level. I guess I could have a(n array of) function(s) that can translate between levels of nesting. What are the benefits?
// - Potentially speed increases (run a function once with an array instead of 10 times with each item)
// - I want users to be able to call some functions on individual items or on arrays of items, e.g. markIncomplete().
// Downsides:
// - I don't know what level of nesting functions should be called on... If I want to get the unique items, the user might mean the unique numbers (for example), or the *unique combinations* of numbers.
// - How would I even begin to handle uneven rank of arrays? (e.g. an array with object and also other arrays)

// I guess I could have functions or whatever that remembers how deep objects were stored and how deep in the stack of forEach loops you are running code in.

// I also never figured out if adjacent statements are truly independent or not. When modifying an object, one statement might need to happen before the other. Is there anything like that?
export const testCode: UserCodeStatement[] = [
    {
        type: "userVariable",
        name: "five",
        expression: { type: "int", value: 5 },
    },
    {
        type: "userVariable",
        name: "four",
        expression: { type: "int", value: 4 },
    },
    {
        type: "userVariable",
        name: "bool",
        expression: {
            type: "compare",
            compareType: "<",
            left: { type: "readVariable", variableName: "four" },
            right: { type: "readVariable", variableName: "four" },
        },
    },
    { type: "debug", variable: "bool" },
    {
        type: "markIncomplete",
        expression: { type: "int", value: 42 },
        userMessage: "Not really the answer to life...",
    },
    {
        type: "forEach",
        variableName: "myVar",
        expression: {
            type: "objectSelector",
            // pointType: "cells",
            layerId: "Number",
        },
        codeBody: [
            { type: "debug", variable: "myVar" },
            // {
            //     type: "markIncomplete",
            //     expression: {
            //         type: "objectSelector",
            //         layerId: "Number",
            //     },
            // },
        ],
    },
];

export const testCode2: UserCodeStatement[] = [
    // {
    //     type: "forEach",
    // },
];
