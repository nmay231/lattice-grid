import { usePuzzle } from "../../../atoms/puzzle";
import { blurActiveElement } from "../../../utils/DOMUtils";
import { Group } from "../Group";
import { AddNewLayerButton } from "./AddNewLayerButton";
import { LayerConstraintSettings } from "./LayerConstraintSettings";
import { LayerList } from "./LayerList";

export const LayersGroup = () => {
    const puzzle = usePuzzle();

    return (
        <Group name="Layers" expanded>
            <button
                onClick={() => {
                    // Temporary in it's current form
                    puzzle.freshPuzzle();
                    puzzle.resizeCanvas();
                    puzzle.renderChange({ type: "draw", layerIds: "all" });
                    blurActiveElement();
                }}
            >
                Reset Puzzle
            </button>
            <AddNewLayerButton />
            <LayerList />
            <hr />
            <LayerConstraintSettings />
        </Group>
    );
};
