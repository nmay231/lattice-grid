import { Button, Drawer, Group, Paper, Stack, Text } from "@mantine/core";
import { useCallback } from "react";
import type { PuzzleManager } from "../../PuzzleManager";
import { useModal } from "../../utils/focusManagement";

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
    return (
        <Drawer
            opened={opened}
            onClose={() => {
                close();
            }}
        >
            {puzzle.sessionMetadata.myPuzzles.map((puzzle) => {
                const { id, author, title, created } = puzzle;
                return (
                    <Paper key={id} withBorder>
                        <Group p="sm">
                            <Stack gap="xs">
                                <Text>Author: {author}</Text>
                                <Text>Title: {title}</Text>
                                <Text>Created: {created}</Text>
                            </Stack>
                            <Button
                                onClick={() => {
                                    loadPuzzle(id);
                                }}
                            >
                                Load
                            </Button>
                        </Group>
                    </Paper>
                );
            })}
        </Drawer>
    );
};
