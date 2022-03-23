import { SquareGrid } from "../grids/SquareGrid";
import { StorageManager } from "../StorageManager";

type PointType = "cells" | "edges" | "corners";

interface Variable {
    getValue: () => any;
}

interface PointSelector {
    type: "pointSelector";
    pointType: PointType;
}

const pointSelectorExpression = (
    ctx: Context,
    userCode: PointSelector
): Variable => {
    return {
        getValue: () => ctx.grid.getAllPoints(userCode.pointType),
    };
};

interface ObjectSelector {
    type: "objectSelector";
    // TODO: I think it's reasonable that the object selector would have access to the raw id.
    layerId: string;
    // TODO: How should filters be structured? Should there be multiple distinct filters, or should it just be a codeBody that returns whatever? I think it should be the latter because I need to have a Variable interface similar to CompiledCode that has a function(s) to get different values. But not right now lol.
    // filters: any,
}

const objectSelectorExpression = (
    ctx: Context,
    userCode: ObjectSelector
): Variable => {
    return {
        getValue: () => {
            return ctx.storage.getStored({
                layer: ctx.layers[userCode.layerId],
                grid: ctx.grid,
            })?.objects;
        },
    };
};

// interface MarkIncomplete {
//     type: "markIncomplete";
//     objectOrArrayOfObjectsOrSomething: any;
// }

interface ForEach {
    type: "forEach";
    // TODO: Would I allow the user to name their variables? Why even have variable names when they can just be numbers. Then again, I guess they'll probably demand it anyways. I'll just strip out var names when generating the final/shorted code that's shared.
    // What needs to be part of the context(s)? Do I need both runtime and compile time contexts?
    // Do I need another selector besides objectSelector? Like I can select points or I can select (certain types of) objects of a layer.
    // How would blocks like MarkIncomplete affect the display of the grid? It needs access to it from the context.
    variableName: string;
    expression: Expression;
    codeBody: UserCodeStatement[];
}

const forEachStatement = (ctx: Context, userCode: ForEach): CompiledCode => {
    const compiled = compile(ctx, userCode.codeBody);
    const variable = compileVariable(ctx, userCode.expression);
    return {
        run: () => {
            ctx.variables[userCode.variableName] = variable;
            compiled.run();
            delete ctx.variables[userCode.variableName];
        },
    };
};

interface Debug {
    type: "debug";
    variable: string;
}

const debugStatement = (ctx: Context, userCode: Debug): CompiledCode => {
    return {
        run: () => {
            console.log(ctx.variables[userCode.variable].getValue());
        },
    };
};

type UserCodeStatement = ForEach | Debug;
type Expression = PointSelector | ObjectSelector;

interface Context {
    grid: SquareGrid;
    storage: StorageManager;
    layers: { [layerId: string]: any };
    variables: { [key: string]: Variable };
    // TODO: Do I need temporary?
    temporary?: {
        variableValuesOrSomething: { [key: string]: any };
        [key: string]: any;
    };
}

interface CompiledCode {
    run: () => any;
}

const compileVariable = (ctx: Context, expression: Expression): Variable => {
    if (expression.type === "pointSelector") {
        return pointSelectorExpression(ctx, expression);
    } else if (expression.type === "objectSelector") {
        return objectSelectorExpression(ctx, expression);
    } else {
        throw Error("you failed");
    }
};

export const compile = (
    ctx: Context,
    userCode: UserCodeStatement[]
): CompiledCode => {
    const thingsToRun: CompiledCode[] = [];
    for (let code of userCode) {
        if (code.type === "forEach") {
            thingsToRun.push(forEachStatement(ctx, code));
        } else if (code.type === "debug") {
            thingsToRun.push(debugStatement(ctx, code));
        }
    }
    return {
        run: () => {
            for (let things of thingsToRun) {
                things.run();
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
        type: "forEach",
        variableName: "myVar",
        expression: {
            type: "objectSelector",
            // pointType: "cells",
            layerId: "Number",
        },
        codeBody: [
            {
                type: "debug",
                variable: "myVar",
            },
        ],
    },
];

export const testCode2: UserCodeStatement[] = [
    // {
    //     type: "forEach",
    // },
];
