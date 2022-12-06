import { LayerProps, ObjectId } from "../types";

export class LayerStorage<LP extends LayerProps = LayerProps> {
    renderOrder: ObjectId[] = [];
    objects: Record<ObjectId, LP["ObjectState"]> = {};
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

        storage.renderOrder = ids;
        ids.forEach((id, index) => {
            storage.objects[id] = objs[index];
        });

        return storage;
    }
}
