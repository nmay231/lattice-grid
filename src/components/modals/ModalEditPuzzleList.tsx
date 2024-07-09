import { Button, Drawer, Group, Paper, Popover, Stack, Text } from "@mantine/core";
import { useCallback, useState } from "react";
import type { PuzzleManager } from "../../PuzzleManager";
import { useFocusElementHandler, useModal } from "../../utils/focusManagement";

type PuzzleInfo = PuzzleManager["sessionMetadata"]["myPuzzles"][number];
const EditPuzzleItem = ({
    id,
    author,
    title,
    created,
    edited,
    renderButtons,
    loadPuzzle,
    deletePuzzle,
}: PuzzleInfo & {
    renderButtons: boolean;
    loadPuzzle: (id: number) => void;
    deletePuzzle: (id: number) => void;
}) => {
    const [confirmOpened, setConfirmOpened] = useState(false);
    const openConfirmButton = useFocusElementHandler();
    const confirmDeleteButton = useFocusElementHandler();

    return (
        <Paper key={id} withBorder>
            <Group p="sm">
                <Stack gap="xs" w="60%">
                    <Text>Title: {title}</Text>
                    <Text>Author: {author}</Text>
                    <Text size="xs">Created: {new Date(created).toLocaleString()}</Text>
                    <Text size="xs">Edited: {new Date(edited).toLocaleString()}</Text>
                </Stack>

                {renderButtons && (
                    <Stack mx="auto">
                        <Button onClick={() => loadPuzzle(id)}>Load</Button>

                        <Popover
                            trapFocus
                            opened={confirmOpened}
                            onClose={() => setConfirmOpened(false)}
                        >
                            <Popover.Target>
                                <Button
                                    ref={openConfirmButton.ref}
                                    tabIndex={0}
                                    color="red"
                                    onClick={() => setConfirmOpened(true)}
                                >
                                    Delete Puzzle
                                </Button>
                            </Popover.Target>
                            <Popover.Dropdown>
                                <Text>Are you sure?</Text>
                                <Button
                                    ref={confirmDeleteButton.ref}
                                    tabIndex={0}
                                    color="red"
                                    onClick={() => {
                                        confirmDeleteButton.unfocus();
                                        setConfirmOpened(false);
                                        deletePuzzle(id);
                                    }}
                                >
                                    Yes I&apos;m sure
                                </Button>
                            </Popover.Dropdown>
                        </Popover>
                    </Stack>
                )}
            </Group>
        </Paper>
    );
};

// TODO: Tbh, I might end up having this list both editing and solving puzzles, but just use tabs to switch between them
export const ModalEditPuzzleList = ({ puzzle }: { puzzle: PuzzleManager }) => {
    const { close, opened } = useModal("my-puzzle-list");
    const loadPuzzle = useCallback(
        (id: number) => {
            puzzle.loadEditPuzzle(id);
            close();
        },
        [close, puzzle],
    );
    const deletePuzzle = useCallback(
        (id: number) => {
            puzzle.deletePuzzle(id);
            setKey((key) => key + 1);
        },
        [puzzle],
    );
    const [key, setKey] = useState(1);

    return (
        <Drawer
            key={key}
            opened={opened}
            onClose={() => {
                close();
            }}
        >
            {puzzle.sessionMetadata.myPuzzles.map((puzzle, i) => (
                <EditPuzzleItem
                    key={puzzle.id}
                    {...puzzle}
                    renderButtons={i > 0}
                    loadPuzzle={loadPuzzle}
                    // TODO: Hack to ignore the problem of deleting the current puzzle
                    deletePuzzle={deletePuzzle}
                />
            ))}
        </Drawer>
    );
};
