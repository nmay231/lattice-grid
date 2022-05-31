import { compileVariable, Expression } from "./expressions";
import { compile, CompiledCode, Context } from "./run";
import { convertToBool } from "./utils";

export type UserCodeStatement =
    | ForEach
    | Debug
    | MarkIncomplete
    | IfElse
    | UserVariable;

export interface Debug {
    type: "debug";
    variable: string;
}

export const debugStatement = (ctx: Context, userCode: Debug): CompiledCode => {
    return {
        run: () => {
            console.log(ctx.variables[userCode.variable].getValue());
        },
    };
};

export interface ForEach {
    type: "forEach";
    // TODO: Would I allow the user to name their variables? Why even have variable names when they can just be numbers. Then again, I guess they'll probably demand it anyways. I'll just strip out var names when generating the final/shortened code that's shared.
    // What needs to be part of the context(s)? Do I need both runtime and compile time contexts?
    // Do I need another selector besides objectSelector? Like I can select points or I can select (certain types of) objects of a layer.
    // How would blocks like MarkIncomplete affect the display of the grid? It needs access to it from the context.
    variableName: string;
    expression: Expression;
    codeBody: UserCodeStatement[];
}

export const forEachStatement = (
    ctx: Context,
    userCode: ForEach,
): CompiledCode => {
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

export interface IfElse {
    type: "ifElse";
    expression: Expression;
    ifTrue: UserCodeStatement[];
    ifFalse: UserCodeStatement[];
}

export const ifElseStatement = (
    ctx: Context,
    userCode: IfElse,
): CompiledCode => {
    const variable = compileVariable(ctx, userCode.expression);
    const ifTrue = compile(ctx, userCode.ifTrue);
    const ifFalse = compile(ctx, userCode.ifFalse);
    return {
        run: () => {
            const bool = convertToBool(variable);
            if (bool) {
                ifTrue.run();
            } else {
                ifFalse.run();
            }
        },
    };
};

export interface MarkIncomplete {
    type: "markIncomplete";
    expression: Expression;
    userMessage?: string;
}

export const markIncompleteStatement = (
    ctx: Context,
    userCode: MarkIncomplete,
): CompiledCode => {
    const x = compileVariable(ctx, userCode.expression);
    return {
        run: () => {
            ctx.puzzleWarnings.push({
                message: userCode.userMessage || "",
                objects: x.getValue(),
            });
        },
    };
};

// A user variable is a variable that a user sets directly (as opposed to a variable make automatically like in a for-loop)
export interface UserVariable {
    type: "userVariable";
    name: string;
    expression: Expression;
}

export const userVariableStatement = (
    ctx: Context,
    userCode: UserVariable,
): CompiledCode => {
    const variable = compileVariable(ctx, userCode.expression);
    return {
        run: () => {
            ctx.variables[userCode.name] = variable;
        },
    };
};
