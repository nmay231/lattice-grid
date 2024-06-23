import { Button, Center, Group, Stack } from "@mantine/core";
import React from "react";
import { Link } from "react-router-dom";
import { useProxy } from "valtio/utils";
import type { PuzzleManager } from "../../../PuzzleManager";
import { useFocusElementHandler } from "../../../utils/focusManagement";
import { ImportExportButton } from "../../ImportExportModal/ImportExportModal";
import { Group as Collapse } from "../Group";
import { PuzzleModeToggle } from "./PuzzleModeToggle";
import { ResizeGridButton } from "./ResizeModal";

export const MainGroup = React.memo(function MainGroup({ puzzle }: { puzzle: PuzzleManager }) {
    const { ref, unfocus } = useFocusElementHandler();
    const { pageMode } = useProxy(puzzle.settings);

    return (
        <Collapse name="Puzzle" expanded>
            <Center style={{ width: "100%" }} my="sm" component={Group}>
                <Stack>
                    {pageMode === "edit" && (
                        <>
                            <PuzzleModeToggle puzzle={puzzle} />
                            <ResizeGridButton />
                            <ImportExportButton />
                            <Button
                                ref={ref}
                                tabIndex={0}
                                color="red"
                                onClick={() => {
                                    puzzle.resetPuzzle();
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
});
