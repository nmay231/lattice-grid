export type ScalarMap = {
    float: number;
    double: number;
    // I'm purposely not including int32 and int64, since it's better to use uint* or sint* specifically
    uint32: number;
    sint32: number;
    fixed32: number;
    sfixed32: number;
    uint64: bigint;
    sint64: bigint;
    fixed64: bigint;
    sfixed64: bigint;
    bool: boolean;
    string: string;
    bytes: Uint8Array; // Honestly might not be needed if I get some simple state machines implemented as a first-class type
    // maps are also interesting but not needed, at the moment at least... Additionally, I could create a custom map that encodes entries as tuples instead of messages
    // Same for reserved field numbers and names (don't really need yet)

    /** Since enums will be implemented as tagged unions, we provide a scalar that holds no data but still reserves a field index. */
    unit: true;
};

export type Scalar = {
    type: keyof ScalarMap;
    index: number;
    /** @default false */
    repeated?: boolean;
};

export type Encoding = {
    type: "message" | "tuple" | "enum";
    fields: Record<string, Encoding | Scalar>;
    index: number;
    /** @default false */
    repeated?: boolean;
};
export type TopLevel<E extends Encoding | Scalar> = Omit<E, "index">;

export type DescriptionToObject<E extends TopLevel<Encoding>> = E["type"] extends "tuple"
    ? PossibleRepeated<_DescriptionToObject<E>, E["repeated"]>
    : E["type"] extends "message" | "enum"
    ? PossibleRepeated<Partial<_DescriptionToObject<E>>, E["repeated"]>
    : never;

type PossibleRepeated<T, Repeated> = Repeated extends true ? T[] : T;

type _DescriptionToObject<E extends TopLevel<Encoding>> = {
    [K in keyof E["fields"]]: E["fields"][K]["type"] extends infer Type
        ? Type extends keyof ScalarMap
            ? PossibleRepeated<ScalarMap[Type], E["fields"][K]["repeated"]>
            : E["fields"][K] extends Encoding
            ? DescriptionToObject<E["fields"][K]>
            : never
        : never;
};

export class Encoder<E extends TopLevel<Encoding>> {
    constructor(public fields: E) {}

    // Thank you typescript for adding const generics!
    static create<const E extends TopLevel<Encoding>>(arg: E): Encoder<E> {
        // TODO: Verify indices don't overlap, and that tuple indices are contiguous.
        // TODO: Unless there's a good reason to deviate from standard protobuf, oneof should not be repeatable.
        return new Encoder(arg);
    }

    stringify(obj: DescriptionToObject<E>): Uint8Array {
        // TODO: Don't forget to clamp any types that need clamping (number | 0 => int32).
        throw Error(`TODO, ${JSON.stringify(obj)}`);
    }

    parse(serialized: Uint8Array): { ok: DescriptionToObject<E> } | { error: string } {
        throw Error(`TODO, ${serialized.join(",")}`);
    }
}
