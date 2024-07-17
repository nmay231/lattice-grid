import React from "react";
import { useProxy } from "valtio/utils";
import { PuzzleManager } from "../../../PuzzleManager";
import { Group } from "../Group";
import { AddNewLayerButton } from "./AddNewLayerButton";
import { LayerConstraintSettings } from "./LayerConstraintSettings";
import { LayerList } from "./LayerList";

export const LayersGroup = React.memo(function LayersGroup({ puzzle }: { puzzle: PuzzleManager }) {
    const { pageMode } = useProxy(puzzle.settings);
    const editing = pageMode === "edit";

    return (
        <Group name="Layers" expanded>
            {editing && <AddNewLayerButton puzzle={puzzle} />}
            <LayerList puzzle={puzzle} />
            {editing && <hr />}
            {editing && <LayerConstraintSettings puzzle={puzzle} />}
        </Group>
    );
});
