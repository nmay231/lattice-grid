import { Button, Center, Group, Popover, Stack, Text, TextInput } from "@mantine/core";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSnapshot } from "valtio";
import { useProxy } from "valtio/utils";
import type { PuzzleManager } from "../../../PuzzleManager";
import { openModal, useFocusElementHandler } from "../../../utils/focusManagement";
import { ImportExportButton } from "../../ImportExportModal/ImportExportModal";
import { Group as Collapse } from "../Group";
import { ResizeGridButton } from "./ResizeModal";

const PuzzleNameStuff = ({ puzzle }: { puzzle: PuzzleManager }) => {
    const currentPuzzle = useProxy(puzzle.sessionMetadata.myPuzzles[0]);

    const authorInput = useFocusElementHandler();
    const titleInput = useFocusElementHandler();

    const [author, setAuthor] = useState(currentPuzzle.author);
    const [title, setTitle] = useState(currentPuzzle.title);

    // Rerender when the first puzzle changes, aka when changing current puzzle
    useSnapshot(puzzle.sessionMetadata);
    useEffect(() => {
        if (currentPuzzle.title !== title) {
            setAuthor(currentPuzzle.author);
            setTitle(currentPuzzle.title);
        }
    }, [currentPuzzle, title]);

    return (
        <div>
            <TextInput
                ref={authorInput.ref}
                tabIndex={0}
                label="Author (You)"
                placeholder="Anonymous"
                value={author}
                onChange={(event) => {
                    setAuthor(event.target.value);
                }}
                onBlur={() => {
                    authorInput.unfocus();
                    currentPuzzle.author = author;
                    puzzle.sessionMetadata.myAuthorName = author;
                    puzzle.writeMetadata();
                }}
            />
            <TextInput
                ref={titleInput.ref}
                tabIndex={0}
                label="Puzzle Title"
                placeholder="My best puzzle yet!"
                value={title}
                onChange={(event) => {
                    setTitle(event.target.value);
                }}
                onBlur={() => {
                    titleInput.unfocus();
                    currentPuzzle.title = title;
                    puzzle.writeMetadata();
                }}
            />
        </div>
    );
};

export const MainGroup = React.memo(function MainGroup({ puzzle }: { puzzle: PuzzleManager }) {
    const resetButton = useFocusElementHandler();
    const resetConfirmButton = useFocusElementHandler();
    const [resetOpened, setResetOpened] = useState(false);

    const puzzlesListButton = useFocusElementHandler();
    const newPuzzleButton = useFocusElementHandler();
    const { pageMode } = useProxy(puzzle.settings);

    return (
        <Collapse name="Puzzle" expanded>
            <Center style={{ width: "100%" }} my="sm" component={Group}>
                <Stack>
                    {pageMode === "edit" && (
                        <>
                            <Group style={{ justifyContent: "center" }}>
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
                                <Button
                                    ref={newPuzzleButton.ref}
                                    tabIndex={0}
                                    onClick={() => {
                                        newPuzzleButton.unfocus();
                                        puzzle.freshPuzzle();
                                    }}
                                >
                                    New Puzzle
                                </Button>
                            </Group>

                            <PuzzleNameStuff puzzle={puzzle} />
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
                            <hr />
                            <Group>
                                <ResizeGridButton />
                                <ImportExportButton />
                            </Group>
                        </>
                    )}
                    <Link to="/about">About this site</Link>
                </Stack>
            </Center>
        </Collapse>
    );
});
