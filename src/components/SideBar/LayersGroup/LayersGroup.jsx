import { Group } from "../Group";
import { AddNewLayerButton } from "./AddNewLayerButton";
import { LayerBehaviorSettings } from "./LayerBehaviorSettings";
import { LayerList } from "./LayerList";

export const LayersGroup = () => {
    return (
        <Group name="Layers" expanded>
            <AddNewLayerButton />
            <LayerList />
            <hr />
            <p>Settings:</p>
            <LayerBehaviorSettings />
        </Group>
    );
};
