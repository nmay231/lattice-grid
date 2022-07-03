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
    DefineAlias,
    Compare,
    Debug,
    ForEach,
    IfElse,
    Integer,
    MarkInvalid,
    ObjectSelector,
    ReadAlias,
    RootBlock,
};

export type UserCodeJSON =
    | IDefineAlias
    | ICompare
    | IDebug
    | IForEach
    | IIfElse
    | IInteger
    | IMarkInvalid
    | IObjectSelector
    | IReadAlias
    | IRootBlock;
