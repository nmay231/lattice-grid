import { Context } from "./run";

export interface Variable {
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
    return {
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

export interface Int {
    type: "int";
    value: number;
}

export const intExpression = (ctx: Context, userCode: Int): Variable => {
    if (typeof userCode.value !== "number" || userCode.value % 1 !== 0) {
        throw Error(`${userCode.value} is not an integer`);
    }
    return {
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
    return {
        getValue: () => {
            return ctx.variables[userCode.variableName].getValue();
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
