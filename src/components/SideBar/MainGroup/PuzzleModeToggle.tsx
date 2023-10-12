import { SegmentedControl } from "@mantine/core";
import { usePuzzle, useSettings } from "../../../state/puzzle";
import { EditMode } from "../../../types";
import { useFocusElementHandler } from "../../../utils/focusManagement";

export const PuzzleModeToggle = () => {
    const puzzle = usePuzzle();
    const { editMode } = useSettings();
    const { ref, unfocus } = useFocusElementHandler();

    return (
        <div>
            <SegmentedControl
                ref={ref}
                data={
                    [
                        { value: "question", label: "Setting" },
                        { value: "answer", label: "Solving" },
                    ] satisfies Array<{ label: string; value: EditMode }>
                }
                value={editMode}
                onChange={(value: EditMode) => {
                    puzzle.settings.editMode = value;
                    unfocus();
                }}
            ></SegmentedControl>
        </div>
    );
};
