import { Compare, ICompare } from "./Compare";
import { Debug, IDebug } from "./Debug";
import { DefineAlias, IDefineAlias } from "./DefineAlias";
import { ForEach, IForEach } from "./ForEach";
import { IfElse, IIfElse } from "./IfElse";
import { IInteger, Integer } from "./Integer";
import { IMarkInvalid, MarkInvalid } from "./MarkInvalid";
import { IObjectSelector, ObjectSelector } from "./ObjectSelector";
import { IReadAlias, ReadAlias } from "./ReadAlias";
import { IRootBlock, RootBlock } from "./RootBlock";

export const CodeBlocks = {
    Compare,
    Debug,
    DefineAlias,
    ForEach,
    IfElse,
    Integer,
    MarkInvalid,
    ObjectSelector,
    ReadAlias,
    RootBlock,
};

export const blocklyToolbox = {
    kind: "categoryToolbox",
    contents: [
        {
            kind: "category",
            name: "statements",
            contents: [
                // { kind: "block", type: "Compare" },
                // { kind: "block", type: "Debug" },
                { kind: "block", type: "DefineAlias" },
                { kind: "block", type: "ForEach" },
                { kind: "block", type: "IfElse" },
                { kind: "block", type: "Integer", fields: { VALUE: 1 } },
                { kind: "block", type: "MarkInvalid" },
                // { kind: "block", type: "ObjectSelector" },
                { kind: "block", type: "ReadAlias" },
                { kind: "block", type: "RootBlock" },
            ],
        },
        {
            kind: "category",
            name: "user aliases",
            custom: "ALIASES",
        },
    ],
};

export type UserCodeJSON =
    | ICompare
    | IDebug
    | IDefineAlias
    | IForEach
    | IIfElse
    | IInteger
    | IMarkInvalid
    | IObjectSelector
    | IReadAlias
    | IRootBlock;
