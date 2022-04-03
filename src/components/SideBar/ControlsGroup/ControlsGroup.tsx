import { Group } from "../Group";
import { LayerControlSettings } from "./LayerControlSettings";

// TODO: Allow customization by selecting which sections are visible. Also allow the controls to (un)dock from the sidebar and be dragged around (mostly for mobile controls).

export const ControlsGroup = () => {
    return (
        <Group name="Controls" expanded>
            {/* TODO: Simple Layer selector */}
            {/* TODO: Undo/redo */}
            {/* Layer control settings, aka Object placement/selection */}
            {/* TODO: How to incorporate the delete when it is treated slightly differently with numbers/text as opposed to non-text objects */}
            <LayerControlSettings />
        </Group>
    );
};
