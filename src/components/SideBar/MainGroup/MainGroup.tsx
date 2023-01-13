import { Button, Center, Group, Stack } from "@mantine/core";
import { Link } from "react-router-dom";
import { usePuzzle } from "../../../state/puzzle";
import { useFocusElementHandler } from "../../../utils/focusManagement";
import { ImportExportButton } from "../../ImportExportModal/ImportExportModal";
import { Group as Collapse } from "../Group";
import { PuzzleModeToggle } from "./PuzzleModeToggle";
import { ResizeGridButton } from "./ResizeModal";

export const MainGroup = () => {
    const puzzle = usePuzzle();
    const { ref, unfocus } = useFocusElementHandler();

    return (
        <Collapse name="Puzzle" expanded>
            <Center style={{ width: "100%" }} my="sm" component={Group}>
                <Stack>
                    <PuzzleModeToggle />
                    <ResizeGridButton />
                    <ImportExportButton />
                    <Button
                        ref={ref}
                        tabIndex={0}
                        color="red"
                        onClick={() => {
                            // Temporary in it's current form
                            puzzle.freshPuzzle();
                            puzzle.resizeCanvas();
                            puzzle.renderChange({ type: "draw", layerIds: "all" });
                            unfocus();
                        }}
                    >
                        Reset Puzzle
                    </Button>
                    <Link to="/about">About this site</Link>
                </Stack>
            </Center>
        </Collapse>
    );
};
