import { Reader, Writer } from "protobufjs";
import { notify } from "../utils/notifications";
import { stringifyAnything } from "../utils/string";

// TODO: zero length bytes decode as Buffers on node. This hack prevents that.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const util = require("protobufjs/src/util");
util.Buffer = null;

export type ScalarMap = {
    uint32: number;
    sint32: number;
    // uint64: bigint;
    // sint64: bigint;
    // TODO: I will only choose string over bytes for user text. All encoding should use bytes to get the full bit space.
    // string: string;
    bytes: Uint8Array;
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
    /** @internal */
    _fieldOrder?: string[];
};
export type TopLevel<E extends Encoding | Scalar> = Omit<E, "index">;

export type DescriptionToObject<E extends TopLevel<Encoding> | TopLevel<Scalar>> =
    E extends TopLevel<Encoding>
        ? E["type"] extends "tuple"
            ? PossibleRepeated<_DescriptionToObject<E>, E["repeated"]>
            : E["type"] extends "message" | "enum"
            ? PossibleRepeated<Partial<_DescriptionToObject<E>>, E["repeated"]>
            : never
        : E["type"] extends infer Type
        ? Type extends keyof ScalarMap
            ? PossibleRepeated<ScalarMap[Type], E["repeated"]>
            : never
        : never;

type _DescriptionToObject<E extends TopLevel<Encoding>> = {
    [K in keyof E["fields"]]: E["fields"][K]["type"] extends infer Type
        ? Type extends keyof ScalarMap
            ? PossibleRepeated<ScalarMap[Type], E["fields"][K]["repeated"]>
            : E["fields"][K] extends Encoding
            ? DescriptionToObject<E["fields"][K]>
            : never
        : never;
};

type PossibleRepeated<T, Repeated> = Repeated extends true ? T[] : T;

/**
 * ProtoButt (only serious business here) is an reimplementation of protobuf with some large changes to make it better for our specific use-case. It would be worth reading up on protobuf's encoding strategy to get a better understanding before reading the code (https://protobuf.dev/programming-guides/encoding).
 * -   For one, many of the encoding types are not included since most of them are redundant or simply unneeded (so far).
 * -   Since we don't care about forwards compatibility (old programs reading new data still working), that means we can exclude encoding the wire-type as part of the field index. This saves a lot of data when including many small messages. Additionally, the message length encodes the number of fields not the number of bytes.
 * -   We also add a tuple type that is similar to messages except only data is encoded; no field numbers or field/byte count. This requires all fields to be set and no new fields to be added in the future. That means the container of the tuple must add a new tuple (or message) field encoding the new data if the old one doesn't suffice. Therefore tuples should be used tastefully and certainly not at the toplevel of an encoding.
 * -   `oneof` fields are merged into enums to basically give you tagged-variants just like Rust enums. In other words, an enum is a message with only one field chosen. Enum variants with no data attached (what most programming languages consider as enums) are accomplished by adding a scalar type called `unit` that encodes no data itself and relies on the container encoding its field number, therefore determining which enum variant it is. Unlike `oneof` fields, enums can be repeated; the only reason for that restriction in the first place is if you care about encoding being "distributive", that is `encode({...data1, ...data2}) == concat(encode(data1), encode(data2))`.
 */
// TODO: This would be better implemented as a curried function, but I feel like future features might require a more OOP approach
export class Encoder<E extends Encoding | Scalar> {
    /** Constructor is private. Use `.create()` instead */
    private constructor(public encoding: E) {}

    static _validateLimit = 0;
    private static validate(encoding: TopLevel<Encoding>): boolean {
        if (this._validateLimit++ > 15) {
            throw Error("Validating recursion limit reached");
        }
        const fieldOrder = [] as string[];
        const fields = Object.entries(encoding.fields);
        for (const [key, field] of fields) {
            fieldOrder[field.index] = key;
        }

        // Indexes must be unique
        if (Object.values(fieldOrder).length !== fields.length) return false;
        // Tuple fields must not have gaps and start at zero
        if (fieldOrder.length !== fields.length && encoding.type === "tuple") return false;

        encoding._fieldOrder = fieldOrder;

        return fields.every(
            ([, subEncoding]) =>
                (subEncoding.type !== "tuple" &&
                    subEncoding.type !== "message" &&
                    subEncoding.type !== "enum") ||
                this.validate(subEncoding),
        );
    }

    /**
     * Factory function to make an `Encoder`
     * The toplevel index is not used but needed to satisfy typescript (grr...)
     */
    static create<const E extends Encoding | Scalar>(encoding: E): Encoder<E> {
        if ("fields" in encoding && !this.validate(encoding)) {
            throw Error(`Could not instantiate Encoding with ${stringifyAnything(encoding)}`);
        }
        this._validateLimit = 0;
        return new Encoder(encoding);
    }

    /** Value is consumed destructively */
    encode(value: DescriptionToObject<E>): Uint8Array {
        const writer = new Writer();
        this._encode(this.encoding, value, writer, false);
        this._encodeLimit = 0;
        return writer.finish();
    }

    _encodeLimit = 0;
    _encode<E extends Encoding | Scalar>(
        encoding: E,
        value: any,
        writer: Writer,
        encodeIndex: boolean,
    ): void {
        if (this._encodeLimit++ > 300) {
            throw Error("Encoding recursion limit reached");
        }
        if (encodeIndex) writer.uint32(encoding.index);
        if (encoding.repeated) {
            writer.uint32(value.length);
            if (!value.length) return;
            const encoding_ = { ...encoding, repeated: false } as typeof encoding;
            for (const v of value) {
                this._encode(encoding_, v, writer, encodeIndex);
            }
            return;
        }

        switch (encoding.type) {
            case "sint32":
            case "uint32":
            case "bytes": {
                writer[encoding.type](value);
                return;
            }
            case "unit": {
                return; // Only the index is encoded for unit types (to mimic enum variants)
            }
            case "tuple": {
                for (const key of encoding._fieldOrder!) {
                    if (!(key in value)) {
                        throw notify.error(
                            `tuple missing key=${key}: encoding=${stringifyAnything(
                                encoding,
                            )}; value=${stringifyAnything(value)}`,
                        );
                    }
                    this._encode(encoding.fields[key], value[key], writer, false);
                }
                return;
            }
            case "enum":
            case "message": {
                if (encoding.type === "message") {
                    writer.uint32(Object.keys(value).length);
                }

                let encodedFields = 0;
                for (const key of encoding._fieldOrder!) {
                    if (!(key in value)) continue;

                    encodedFields += 1;
                    this._encode(encoding.fields[key], value[key], writer, true);
                }
                if (encoding.type === "enum" && Object.keys(value).length !== encodedFields) {
                    throw notify.error(
                        `enum has more than one value set: value=${stringifyAnything(value)}`,
                    );
                }
                return;
            }
        }
    }

    decode(encoded: Uint8Array): DescriptionToObject<E> {
        const reader = new Reader(encoded);
        const result = { key: null as DescriptionToObject<E> };
        this._decode(this.encoding, "key", result, reader);
        this._decodeLimit = 0;
        if (reader.pos !== encoded.length) {
            throw notify.error(
                `Message not fully consumed: encoding=${stringifyAnything(
                    this.encoding,
                )}; toDecode=${stringifyAnything(encoded)}; result=${stringifyAnything(
                    result.key,
                )}`,
            );
        }
        return result.key;
    }

    _decodeLimit = 0;
    _decode<E extends Encoding | Scalar>(
        encoding: E,
        key: string,
        container: any,
        reader: Reader,
        // decodeIndex: boolean,
    ): void {
        if (this._decodeLimit++ > 300) {
            throw Error("Decoding recursion limit reached");
        }
        if (encoding.repeated) {
            const repeated = (container[key] = [] as any[]);
            const encoding_ = { ...encoding, repeated: false } as typeof encoding;
            for (let length = reader.uint32(); length > 0; length--) {
                const subContainer = { key: null };
                this._decode(encoding_, "key", subContainer, reader);
                repeated.push(subContainer.key);
            }
            return;
        }

        switch (encoding.type) {
            case "sint32":
            case "uint32":
            case "bytes": {
                container[key] = reader[encoding.type]();
                return;
            }
            case "unit": {
                container[key] = true;
                return;
            }
            case "enum": {
                const index = reader.uint32();
                const enumVariant = encoding._fieldOrder![index];
                container[key] = {};
                this._decode(encoding.fields[enumVariant], enumVariant, container[key], reader);
                return;
            }
            case "tuple": {
                const tuple = (container[key] = {});
                for (const fieldKey of encoding._fieldOrder!) {
                    this._decode(encoding.fields[fieldKey], fieldKey, tuple, reader);
                }
                return;
            }
            case "message": {
                const message = (container[key] = {});
                for (let nFields = reader.uint32(); nFields > 0; nFields--) {
                    const index = reader.uint32();
                    const fieldKey = encoding._fieldOrder![index];
                    this._decode(encoding.fields[fieldKey], fieldKey, message, reader);
                }
                // const fields = encoding.fields;
                // for (const [key, desc] of Object.entries(fields)) {
                //     this._decode(desc, container[key], reader, encoding.type !== "tuple");
                // }
                return;
            }
        }
    }
}

const e = Encoder.create({ type: "uint32", index: 0 });
e.encode(1);
