import { Group } from "../Group";
import { LayerControlSettings } from "./LayerControlSettings";

// TODO: Allow customization by selecting which sections are visible. Also allow the controls to (un)dock from the sidebar and be dragged around (mostly for mobile controls).

export const ControlsGroup = () => {
    return (
        <Group name="Controls" expanded>
            {/* Layer control settings, aka Object placement/selection */}
            <LayerControlSettings />
        </Group>
    );
};
