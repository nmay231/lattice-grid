import { SegmentedControl } from "@mantine/core";
import { useProxy } from "valtio/utils";
import { PuzzleManager } from "../../../PuzzleManager";
import { EditMode } from "../../../types";
import { useFocusElementHandler } from "../../../utils/focusManagement";

export const PuzzleModeToggle = ({ puzzle }: { puzzle: PuzzleManager }) => {
    const { editMode } = useProxy(puzzle.settings);
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
                onChange={(value) => {
                    puzzle.settings.editMode = value satisfies string as EditMode;
                }}
                onClick={() => {
                    unfocus();
                }}
            ></SegmentedControl>
        </div>
    );
};
