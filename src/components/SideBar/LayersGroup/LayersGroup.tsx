import { Group } from "../Group";
import { AddNewLayerButton } from "./AddNewLayerButton";
import { LayerConstraintSettings } from "./LayerConstraintSettings";
import { LayerList } from "./LayerList";

export const LayersGroup = () => {
    return (
        <Group name="Layers" expanded>
            <AddNewLayerButton />
            <LayerList />
            <hr />
            <LayerConstraintSettings />
        </Group>
    );
};
