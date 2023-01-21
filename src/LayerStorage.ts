import { proxy } from "valtio";
import { EditMode, LayerProps, ObjectId, StorageMode } from "./types";
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

export class LayerStorage<LP extends LayerProps = LayerProps> {
    // TODO: Should this be where I wrap it in proxy?
    objects = proxy(new OrderedMap<LP["ObjectState"]>());
    permStorage: Partial<LP["PermStorage"]> = {};
    groups = new DisjointSets<StorageMode>();

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

        return storage;
    }
}
