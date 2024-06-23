import { Button, Center, Group, Stack } from "@mantine/core";
import React from "react";
import { Link } from "react-router-dom";
import { useProxy } from "valtio/utils";
import type { PuzzleManager } from "../../../PuzzleManager";
import { openModal, useFocusElementHandler } from "../../../utils/focusManagement";
import { ImportExportButton } from "../../ImportExportModal/ImportExportModal";
import { Group as Collapse } from "../Group";
import { ResizeGridButton } from "./ResizeModal";

export const MainGroup = React.memo(function MainGroup({ puzzle }: { puzzle: PuzzleManager }) {
    const resetButton = useFocusElementHandler();
    const puzzlesListButton = useFocusElementHandler();
    const { pageMode } = useProxy(puzzle.settings);

    return (
        <Collapse name="Puzzle" expanded>
            <Center style={{ width: "100%" }} my="sm" component={Group}>
                <Stack>
                    {pageMode === "edit" && (
                        <>
                            <Button
                                ref={puzzlesListButton.ref}
                                tabIndex={0}
                                onClick={() => {
                                    openModal("my-puzzle-list");
                                    puzzlesListButton.unfocus();
                                }}
                            >
                                My Puzzles
                            </Button>
                            <hr />
                            <ResizeGridButton />
                            <ImportExportButton />
                            <hr />
                            <Button
                                ref={resetButton.ref}
                                tabIndex={0}
                                color="red"
                                onClick={() => {
                                    puzzle.resetPuzzle();
                                    resetButton.unfocus();
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
