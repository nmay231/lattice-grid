import { usePuzzle } from "../../../atoms/puzzle";
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
                    puzzle.redrawScreen();
                }}
            >
                Reset Puzzle
            </button>
            <AddNewLayerButton />
            <LayerList />
            <hr />
            <p>Settings:</p>
            <LayerConstraintSettings />
        </Group>
    );
};
