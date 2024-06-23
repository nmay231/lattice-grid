import { Button, Center, Group, Popover, Stack, Text } from "@mantine/core";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useProxy } from "valtio/utils";
import type { PuzzleManager } from "../../../PuzzleManager";
import { openModal, useFocusElementHandler } from "../../../utils/focusManagement";
import { ImportExportButton } from "../../ImportExportModal/ImportExportModal";
import { Group as Collapse } from "../Group";
import { ResizeGridButton } from "./ResizeModal";

export const MainGroup = React.memo(function MainGroup({ puzzle }: { puzzle: PuzzleManager }) {
    const resetButton = useFocusElementHandler();
    const resetConfirmButton = useFocusElementHandler();
    const [resetOpened, setResetOpened] = useState(false);

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
                                    puzzlesListButton.unfocus();
                                    openModal("my-puzzle-list");
                                }}
                            >
                                My Puzzles
                            </Button>
                            <hr />
                            <ResizeGridButton />
                            <ImportExportButton />
                            <hr />
                            <Popover
                                trapFocus
                                opened={resetOpened}
                                onClose={() => setResetOpened(false)}
                            >
                                <Popover.Target>
                                    <Button
                                        ref={resetButton.ref}
                                        tabIndex={0}
                                        color="red"
                                        onClick={() => setResetOpened(true)}
                                    >
                                        Reset Puzzle
                                    </Button>
                                </Popover.Target>
                                <Popover.Dropdown>
                                    <Text>Are you sure?</Text>
                                    <Button
                                        ref={resetConfirmButton.ref}
                                        tabIndex={0}
                                        color="red"
                                        onClick={() => {
                                            resetConfirmButton.unfocus();
                                            setResetOpened(false);
                                            puzzle.resetPuzzle();
                                            puzzle.renderChange({ type: "draw", layerIds: "all" });
                                        }}
                                    >
                                        Yes I&apos;m sure
                                    </Button>
                                </Popover.Dropdown>
                            </Popover>
                        </>
                    )}
                    <Link to="/about">About this site</Link>
                </Stack>
            </Center>
        </Collapse>
    );
});
