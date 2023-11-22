import { LayerProps, ObjectId, StorageMode, UnknownObject } from "./types";
import { OrderedMap, PutAtEnd } from "./utils/OrderedMap";

export type LayerStorageJSON = {
    answer: Array<[ObjectId, UnknownObject]>;
    question: Array<[ObjectId, UnknownObject]>;
};

export class LayerStorage<LP extends LayerProps = LayerProps> {
    private answer = new OrderedMap<LP["ObjectState"]>();
    private question = new OrderedMap<LP["ObjectState"]>();
    private ui = new OrderedMap<LP["ObjectState"]>();
    permStorage: Partial<LP["PermStorage"]> = {};

    keys(group: StorageMode): ReadonlyArray<ObjectId> {
        return this[group].order;
    }

    /** Set the objects as [id, object] pairs for the given storage group */
    setEntries(group: StorageMode, entries: Array<[ObjectId, LP["ObjectState"]]>): void {
        this.clearGroup(group);

        for (const [id, object] of entries) {
            this[group].set(id, object);
        }
    }

    /** Get the objects as [id, object] pairs for the given storage group */
    entries(group: StorageMode): ReadonlyArray<[ObjectId, LP["ObjectState"]]> {
        return this[group].entries();
    }

    // TODO: The format of these methods are mixed between low-level "map"-like names and specific names to LayerStorage. Fix that at some point.
    getObject(group: StorageMode, id: ObjectId): Readonly<LP["ObjectState"]> {
        return this[group].get(id);
    }

    setObject(
        group: StorageMode,
        id: ObjectId,
        object: LP["ObjectState"] | null,
        prevKey: ObjectId | null | PutAtEnd,
    ): void {
        if (object === null) {
            this[group].delete(id);
        } else {
            this[group].set(id, object, prevKey);
        }
    }

    prevObjectId(group: StorageMode, id: ObjectId): ObjectId | null {
        return this[group].getPrevKey(id);
    }

    clearGroup(group: StorageMode): OrderedMap<LP["ObjectState"]> {
        const old = this[group];
        this[group] = new OrderedMap();
        return old;
    }

    /** Serialization to cache */
    toJSON(): LayerStorageJSON {
        return {
            answer: this.answer.entries(),
            question: this.question.entries(),
        };
    }

    /** Deserialization from cache */
    static fromJSON<LP extends LayerProps = LayerProps>(json: LayerStorageJSON): LayerStorage<LP> {
        const storage = new LayerStorage<LP>();
        storage.setEntries("answer", json.answer);
        storage.setEntries("question", json.question);
        return storage;
    }
}
