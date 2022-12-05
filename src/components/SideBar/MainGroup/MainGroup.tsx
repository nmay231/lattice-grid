import { Button, Center, Group, Stack } from "@mantine/core";
import { useSetAtom } from "jotai";
import { Link } from "react-router-dom";
import { usePuzzle } from "../../../atoms/puzzle";
import { blurActiveElement } from "../../../utils/DOMUtils";
import { ImportExportAtom } from "../../ImportExportModal/ImportExportModal";
import { Group as Collapse } from "../Group";
import { PuzzleModeToggle } from "./PuzzleModeToggle";
import { ResizeGridButton } from "./ResizeGridButton";

export const MainGroup = () => {
    const puzzle = usePuzzle();
    const toggleImportExportModal = useSetAtom(ImportExportAtom);

    return (
        <Collapse name="Puzzle" expanded>
            <Center style={{ width: "100%" }} my="sm" component={Group}>
                <Stack>
                    <PuzzleModeToggle />
                    <ResizeGridButton />
                    <Button onClick={() => toggleImportExportModal(true)}>Import / Export</Button>
                    <Button
                        color="red"
                        onClick={() => {
                            // Temporary in it's current form
                            puzzle.freshPuzzle();
                            puzzle.resizeCanvas();
                            puzzle.renderChange({ type: "draw", layerIds: "all" });
                            blurActiveElement();
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
