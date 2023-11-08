import React from "react";
import { useSettings } from "../../../state/puzzle";
import { Group } from "../Group";
import { AddNewLayerButton } from "./AddNewLayerButton";
import { LayerConstraintSettings } from "./LayerConstraintSettings";
import { LayerList } from "./LayerList";

export const LayersGroup = React.memo(function LayersGroup() {
    const { pageMode } = useSettings();
    const editing = pageMode === "edit";

    return (
        <Group name="Layers" expanded>
            {editing && <AddNewLayerButton />}
            <LayerList />
            {editing && <hr />}
            {editing && <LayerConstraintSettings />}
        </Group>
    );
});
