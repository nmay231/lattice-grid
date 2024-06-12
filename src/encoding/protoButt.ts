import { Reader, Writer } from "protobufjs";
import { filterUnique } from "../utils/data";
import { notify } from "../utils/notifications";
import { smartSort, stringifyAnything } from "../utils/string";

if (window.process) {
    // TODO: zero length bytes decode as Buffers on node (during test runs). This hack prevents that.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
    const util = require("protobufjs/src/util");
    util.Buffer = null;
}

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
    _fieldIndexes?: number[];
    /** @internal */
    _indexToField?: Record<number, string>;
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
export class Encoder<E extends Encoding | Scalar> {
    /** Constructor is private. Use `.create()` instead */
    private constructor(public encoding: E) {}

    static _validationRecursionCheck = new WeakSet();
    private static validate(encoding: TopLevel<Encoding>): void {
        if (this._validationRecursionCheck.has(encoding)) {
            throw new Error("Validation recursion has looped");
        }
        this._validationRecursionCheck.add(encoding);
        encoding._indexToField = {} as Record<number, string>;
        encoding._fieldIndexes = [] as number[];
        const fields = Object.entries(encoding.fields);
        for (const [key, field] of fields) {
            if (key in Object.prototype) {
                throw new Error(`Do not use keys in Object.prototype: ${key}`);
            }
            encoding._indexToField[field.index] = key;
            encoding._fieldIndexes.push(field.index);
        }
        encoding._fieldIndexes = encoding._fieldIndexes.filter(filterUnique);
        encoding._fieldIndexes.sort(smartSort);

        if (encoding._fieldIndexes.length !== fields.length) {
            throw new Error(`Some indexes overlap: ${stringifyAnything(encoding)}`);
        }
        if (encoding.type === "tuple" && encoding._fieldIndexes.some((v, i) => v !== i)) {
            throw new Error(
                `Tuple fields must not have gaps and start at zero: ${stringifyAnything(encoding)}`,
            );
        }

        for (const [, field] of fields) {
            if (field.type === "message" || field.type === "enum" || field.type === "tuple") {
                this.validate(field);
            }
        }
    }

    /**
     * Factory function to make an `Encoder`
     * The toplevel index is not used but needed to satisfy typescript (grr...)
     */
    static create<const E extends Encoding | Scalar>(encoding: E): Encoder<E> {
        this._validationRecursionCheck = new WeakSet();
        if ("fields" in encoding) this.validate(encoding);

        return new Encoder(encoding);
    }

    encode(value: DescriptionToObject<E>): Uint8Array {
        const writer = new Writer();
        this._encodingRecursionCheck = new WeakSet();
        this._encode(this.encoding, value, writer, false);
        return writer.finish();
    }

    _encodingRecursionCheck = new WeakSet();
    _encode<E extends Encoding | Scalar>(
        encoding: E,
        value: any,
        writer: Writer,
        encodeIndex: boolean,
    ): void {
        if (this._encodingRecursionCheck.has(encoding)) {
            throw new Error("Encoding recursion has looped");
        }

        if (encodeIndex) writer.uint32(encoding.index);

        if (encoding.repeated) {
            writer.uint32(value.length);
            if (value.length === 0) return;

            const encoding_ = { ...encoding, repeated: false } as typeof encoding;
            for (const v of value) {
                this._encode(encoding_, v, writer, false);
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
                for (const index of encoding._fieldIndexes!) {
                    const key = encoding._indexToField![index];
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
                let definedAttrs;
                if (encoding.type === "message") {
                    writer.fork();

                    definedAttrs = Object.values(value).reduce(
                        (nDefined: number, valueAttr: unknown) =>
                            valueAttr === undefined ? nDefined : nDefined + 1,
                        0,
                    );
                }

                let encodedFields = 0;
                for (const index of encoding._fieldIndexes!) {
                    const key = encoding._indexToField![index];
                    if (value[key] === undefined) continue;

                    encodedFields += 1;
                    this._encode(encoding.fields[key], value[key], writer, true);
                }

                if (encoding.type === "enum" && encodedFields !== 1) {
                    throw notify.error(
                        `enum has ${encodedFields} value(s) set: value=${stringifyAnything(value)}`,
                    );
                } else if (encoding.type === "message" && definedAttrs !== encodedFields) {
                    throw notify.error(
                        `message includes fields not in set "${stringifyAnything(Object.values(encoding._indexToField!))}": message=${stringifyAnything(value)}`,
                    );
                }

                if (encoding.type === "message") {
                    writer.ldelim();
                }

                return;
            }
        }
    }

    decode(encoded: Uint8Array): DescriptionToObject<E> {
        const reader = new Reader(encoded);
        const result = { key: null as DescriptionToObject<E> };

        this._decodingRecursionCheck = new WeakSet();
        this._decode(this.encoding, "key", result, reader);

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

    _decodingRecursionCheck = new WeakSet();
    _decode<E extends Encoding | Scalar>(
        encoding: E,
        key: string,
        container: any,
        reader: Reader,
    ): void {
        if (this._decodingRecursionCheck.has(encoding)) {
            throw new Error("Decoding recursion has looped");
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
                const enumVariant = encoding._indexToField![index];
                container[key] = {};
                this._decode(encoding.fields[enumVariant], enumVariant, container[key], reader);
                return;
            }
            case "tuple": {
                const tuple = (container[key] = {});
                for (const index of encoding._fieldIndexes!) {
                    const fieldKey = encoding._indexToField![index];
                    this._decode(encoding.fields[fieldKey], fieldKey, tuple, reader);
                }
                return;
            }
            case "message": {
                const message = (container[key] = {});
                const length = reader.uint32();
                const end = reader.pos + length;

                let loopingLimit;
                for (loopingLimit = 1000; reader.pos < end && loopingLimit > 0; loopingLimit--) {
                    const index = reader.uint32();
                    const fieldKey = encoding._indexToField![index];
                    this._decode(encoding.fields[fieldKey], fieldKey, message, reader);
                }

                if (loopingLimit <= 0) {
                    throw notify.error("Looped too much while decoding message");
                } else if (reader.pos !== end) {
                    notify.error(
                        `message length did not match encoded length: ${reader.pos - end + length} != ${length}`,
                    );
                }

                return;
            }
            default: {
                throw notify.error(`Unknown encoding type: ${(encoding as any).type}`);
            }
        }
    }
}
