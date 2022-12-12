import { LayerProps, ObjectId } from "../types";
import { OrderedMap } from "../utils/OrderedMap";

export class LayerStorage<LP extends LayerProps = LayerProps> {
    objects = new OrderedMap<LP["ObjectState"]>();
    extra: Partial<LP["ExtraLayerStorageProps"]> = {};

    // Helper function for tests
    // TODO: Relocate to a separate function?
    static fromObjects<LP extends LayerProps>({
        ids,
        objs,
    }: {
        ids: ObjectId[];
        objs: LP["ObjectState"][];
    }) {
        const storage = new LayerStorage<LP>();

        ids.forEach((id, index) => storage.objects.set(id, objs[index]));

        return storage;
    }
}
