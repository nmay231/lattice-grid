import { Group } from "../Group";
import { AddNewLayerButton } from "./AddNewLayerButton";
import { CurrentLayerSettings } from "./CurrentLayerSettings";
import { LayerList } from "./LayerList";

export const LayersGroup = ({ puzzle }) => {
    return (
        <Group name="Layers" expanded>
            <AddNewLayerButton puzzle={puzzle} />
            <LayerList puzzle={puzzle} />
            <hr />
            <p>Settings:</p>
            <CurrentLayerSettings puzzle={puzzle} />
        </Group>
    );
};
