import { Group } from "../Group";
import { AddNewLayerButton } from "./AddNewLayerButton";
import { CurrentLayerSettings } from "./CurrentLayerSettings";
import { LayerList } from "./LayerList";

export const LayersGroup = () => {
    return (
        <Group name="Layers" expanded>
            <AddNewLayerButton />
            <LayerList />
            <hr />
            <p>Settings:</p>
            <CurrentLayerSettings />
        </Group>
    );
};
