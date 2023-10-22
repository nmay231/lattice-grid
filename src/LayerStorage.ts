import { proxy } from "valtio";
import { Layer, LayerProps, ObjectId, StorageMode, UnknownObject } from "./types";
import { OrderedMap } from "./utils/OrderedMap";

class DisjointSets<Groups extends string = string> {
    byKey: Record<string, Groups> = {};
    byGroup: Partial<Record<Groups, Set<string>>> = {};

    setKey(key: string, group: Groups) {
        if (key in this.byKey) {
            this.getGroup(this.byKey[key]).delete(key);
        }
        this.getGroup(group).add(key);
        this.byKey[key] = group;
    }

    deleteKey(key: string) {
        if (key in this.byKey) {
            this.getGroup(this.byKey[key]).delete(key);
            delete this.byKey[key];
        }
    }

    getGroup(group: Groups): Set<string> {
        return (this.byGroup[group] = this.byGroup[group] || new Set());
    }
}

export type LayerStorageJSON = {
    objects: { order: Layer["id"][]; map: Record<Layer["id"], UnknownObject> };
    groups: { byKey: Record<string, StorageMode> };
};

export class LayerStorage<LP extends LayerProps = LayerProps> {
    // TODO: Should this be where I wrap it in proxy?
    private objects = proxy(new OrderedMap<LP["ObjectState"]>());
    private groups = new DisjointSets<StorageMode>();
    permStorage: Partial<LP["PermStorage"]> = {};

    keys(group: StorageMode): ReadonlySet<ObjectId> {
        return this.groups.getGroup(group);
    }

    /** Set the objects as [id, object] pairs for the given storage group */
    setEntries(group: StorageMode, entries: Array<[ObjectId, LP["ObjectState"]]>): void {
        this.clearGroup(group);

        for (const [id, object] of entries) {
            this.objects.set(id, object);
            this.groups.setKey(id, group);
        }
    }

    /** Get the objects as [id, object] pairs for the given storage group */
    *entries(group: StorageMode): Generator<[ObjectId, LP["ObjectState"]]> {
        for (const id of this.groups.getGroup(group)) {
            yield [id, this.objects.get(id)];
        }
    }

    // TODO: The format of these methods are mixed between low-level "map"-like names and specific names to LayerStorage. Fix that at some point.
    getObject(id: ObjectId): Readonly<LP["ObjectState"]> {
        return this.objects.get(id);
    }

    setObject(
        storageMode: StorageMode,
        id: ObjectId,
        object: LP["ObjectState"] | null,
        nextObjectId: ObjectId | null = null,
    ): void {
        if (object === null) {
            this.objects.delete(id);
            this.groups.deleteKey(id);
        } else {
            this.objects.set(id, object, nextObjectId);
            this.groups.setKey(id, storageMode);
        }
    }

    _getNextId(id: ObjectId): ObjectId | null {
        return this.objects.getNextKey(id);
    }

    _getPrevId(id: ObjectId): ObjectId | null {
        return this.objects.getPrevKey(id);
    }

    clearGroup(group: StorageMode) {
        for (const id of this.groups.getGroup(group)) {
            this.objects.delete(id);
            this.groups.deleteKey(id);
        }
    }

    /** Serialization to cache */
    toJSON(): LayerStorageJSON {
        return {
            objects: { map: this.objects.map, order: this.objects.order },
            groups: { byKey: this.groups.byKey },
        };
    }

    /** Deserialization from cache */
    static fromJSON<LP extends LayerProps = LayerProps>(json: LayerStorageJSON): LayerStorage<LP> {
        const storage = new LayerStorage<LP>();
        Object.assign(storage.objects, json.objects);
        for (const [key, group] of Object.entries(json.groups.byKey)) {
            storage.groups.setKey(key, group);
        }
        return storage;
    }
}
