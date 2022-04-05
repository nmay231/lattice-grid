import { usePuzzle } from "../../PuzzleContext";
import { Group } from "../Group";
import { AddNewLayerButton } from "./AddNewLayerButton";
import { LayerBehaviorSettings } from "./LayerBehaviorSettings";
import { LayerList } from "./LayerList";

export const LayersGroup = () => {
    const puzzle = usePuzzle();

    return (
        <Group name="Layers" expanded>
            <button
                onClick={() => {
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
            <LayerBehaviorSettings />
        </Group>
    );
};
