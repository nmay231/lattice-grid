import { Context } from "./run";

export interface Variable {
    // For now, I think I'll take after the MatLab style of every variable being a nested array of a scalar type.
    scalarType: "boolean" | "integer" | "point" | "object";
    rank: number;
    // TODO: Eventually, I want a convenient function that will return values in the specified rank
    getValue: () => any;
}

export type Expression =
    | PointSelector
    | ObjectSelector
    | Compare
    | Int
    | ReadVariable;

export interface Compare {
    type: "compare";
    compareType: ">" | "<";
    left: Expression;
    right: Expression;
}

export const compareExpression = (
    ctx: Context,
    userCode: Compare,
): Variable => {
    const left = compileVariable(ctx, userCode.left);
    const right = compileVariable(ctx, userCode.right);

    if (
        left.rank !== 0 ||
        right.rank !== 0 ||
        left.scalarType !== right.scalarType ||
        left.scalarType !== "integer"
    ) {
        ctx.compilerErrors.push({ message: "issue with compare expression" });
    }

    return {
        scalarType: "boolean",
        rank: 0,
        getValue: () => {
            switch (userCode.compareType) {
                case "<":
                    return left.getValue() < right.getValue();
                case ">":
                    return left.getValue() > right.getValue();
            }
        },
    };
};

// TODO: Rename this to Integer to be more consistent with the TS naming convention.
export interface Int {
    type: "int";
    value: number;
}

export const intExpression = (ctx: Context, userCode: Int): Variable => {
    if (typeof userCode.value !== "number" || userCode.value % 1 !== 0) {
        throw Error(`${userCode.value} is not an integer`);
    }
    return {
        scalarType: "integer",
        rank: 0,
        getValue: () => userCode.value,
    };
};

export interface ObjectSelector {
    type: "objectSelector";
    // TODO: I think it's reasonable that the object selector would have access to the raw id.
    layerId: string;
    // TODO: How should filters be structured? Should there be multiple distinct filters, or should it just be a codeBody that returns whatever? It could be a codeBody of the type Variable. That might work...
    // filters: any,
}

export const objectSelectorExpression = (
    ctx: Context,
    userCode: ObjectSelector,
): Variable => {
    return {
        scalarType: "object",
        rank: 0,
        getValue: () => {
            return ctx.storage.getStored({
                layer: ctx.layers[userCode.layerId],
                grid: ctx.grid,
            })?.objects;
        },
    };
};

type PointType = "cells" | "edges" | "corners";

export interface PointSelector {
    type: "pointSelector";
    pointType: PointType;
}

export const pointSelectorExpression = (
    ctx: Context,
    userCode: PointSelector,
): Variable => {
    return {
        scalarType: "point",
        rank: 0,
        getValue: () => ctx.grid.getAllPoints(userCode.pointType),
    };
};

export interface ReadVariable {
    type: "readVariable";
    variableName: string;
}

export const readVariableExpression = (
    ctx: Context,
    userCode: ReadVariable,
): Variable => {
    const variable = ctx.variables[userCode.variableName];
    return {
        scalarType: variable.scalarType,
        rank: 0,
        getValue: () => {
            return variable.getValue();
        },
    };
};

export const compileVariable = (
    ctx: Context,
    expression: Expression,
): Variable => {
    if (expression.type === "pointSelector") {
        return pointSelectorExpression(ctx, expression);
    } else if (expression.type === "objectSelector") {
        return objectSelectorExpression(ctx, expression);
    } else if (expression.type === "compare") {
        return compareExpression(ctx, expression);
    } else if (expression.type === "int") {
        return intExpression(ctx, expression);
    } else if (expression.type === "readVariable") {
        return readVariableExpression(ctx, expression);
    } else {
        throw Error("you failed");
    }
};
