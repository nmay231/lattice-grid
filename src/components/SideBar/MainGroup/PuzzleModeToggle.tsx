import { SegmentedControl } from "@mantine/core";
import { usePuzzle, useSettings } from "../../../state/puzzle";
import { EditMode } from "../../../types";

export const PuzzleModeToggle = () => {
    const puzzle = usePuzzle();
    const { editMode } = useSettings();

    return (
        <div>
            <SegmentedControl
                data={
                    [
                        { value: "question", label: "Setting" },
                        { value: "answer", label: "Solving" },
                    ] satisfies Array<{ label: string; value: EditMode }>
                }
                value={editMode}
                onChange={(value: EditMode) => {
                    puzzle.settings.editMode = value;
                }}
            ></SegmentedControl>
        </div>
    );
};
