import { proxy } from "valtio";
import { EditMode, Layer, LayerProps, ObjectId, StorageMode, UnknownObject } from "./types";
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
    objects = proxy(new OrderedMap<LP["ObjectState"]>());
    permStorage: Partial<LP["PermStorage"]> = {};
    groups = new DisjointSets<StorageMode>();

    /** Was mostly used for testing, should probably be updated to be more convenient and general */
    static fromObjects<LP extends LayerProps>({
        ids,
        objs,
        editMode = "question",
    }: {
        ids: ObjectId[];
        objs: LP["ObjectState"][];
        editMode?: EditMode;
    }) {
        const storage = new LayerStorage<LP>();

        ids.forEach((id, index) => {
            storage.objects.set(id, objs[index]);
            storage.groups.setKey(id, editMode);
        });

        return storage satisfies LayerStorageJSON;
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

    clearGroup(group: StorageMode) {
        for (const id of this.groups.getGroup(group)) {
            this.objects.delete(id);
            this.groups.deleteKey(id);
        }
    }

    toJSON(): LayerStorageJSON {
        return {
            objects: { map: this.objects.map, order: this.objects.order },
            groups: { byKey: this.groups.byKey },
        };
    }

    static fromJSON<LP extends LayerProps = LayerProps>(json: LayerStorageJSON): LayerStorage<LP> {
        const storage = new LayerStorage<LP>();
        Object.assign(storage.objects, json.objects);
        for (const [key, group] of Object.entries(json.groups.byKey)) {
            storage.groups.setKey(key, group);
        }
        return storage;
    }
}
