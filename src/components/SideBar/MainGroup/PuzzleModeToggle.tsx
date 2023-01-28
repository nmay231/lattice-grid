import { SegmentedControl } from "@mantine/core";
import { useSnapshot } from "valtio";
import { usePuzzle } from "../../../state/puzzle";
import { EditMode } from "../../../types";

export const PuzzleModeToggle = () => {
    const puzzle = usePuzzle();
    const snap = useSnapshot(puzzle.settings);

    return (
        <div>
            <SegmentedControl
                data={
                    [
                        { value: "question", label: "Setting" },
                        { value: "answer", label: "Solving" },
                    ] satisfies Array<{ label: string; value: EditMode }>
                }
                value={snap.editMode}
                onChange={(value: EditMode) => {
                    puzzle.settings.editMode = value;
                }}
            ></SegmentedControl>
        </div>
    );
};
