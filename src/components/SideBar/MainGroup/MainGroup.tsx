import { Button, Center, Group, Stack } from "@mantine/core";
import { Link } from "react-router-dom";
import { usePuzzle, useSettings } from "../../../state/puzzle";
import { useFocusElementHandler } from "../../../utils/focusManagement";
import { ImportExportButton } from "../../ImportExportModal/ImportExportModal";
import { Group as Collapse } from "../Group";
import { PuzzleModeToggle } from "./PuzzleModeToggle";
import { ResizeGridButton } from "./ResizeModal";

export const MainGroup = () => {
    const puzzle = usePuzzle();
    const { pageMode } = useSettings();
    const { ref, unfocus } = useFocusElementHandler();

    return (
        <Collapse name="Puzzle" expanded>
            <Center style={{ width: "100%" }} my="sm" component={Group}>
                <Stack>
                    {pageMode === "edit" && (
                        <>
                            <PuzzleModeToggle />
                            <ResizeGridButton />
                            <ImportExportButton />
                            <Button
                                ref={ref}
                                tabIndex={0}
                                color="red"
                                onClick={() => {
                                    puzzle.freshPuzzle();
                                    unfocus();
                                }}
                            >
                                Reset Puzzle
                            </Button>
                        </>
                    )}
                    <Link to="/about">About this site</Link>
                </Stack>
            </Center>
        </Collapse>
    );
};
