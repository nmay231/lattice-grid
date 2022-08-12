import { Box, Button, Center, Divider, Group, Modal, Text, Textarea } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { atom, useAtom } from "jotai";
import { cloneDeep } from "lodash";
import { deflate, inflate } from "pako";
import { useMemo, useRef, useState } from "react";
import { usePuzzle } from "../../atoms/puzzle";
import { errorNotification } from "../../utils/DOMUtils";

export const ImportExportAtom = atom(false);
const layersAlwaysPresent = ["Cell Outline", "Selections", "OVERLAY_BLITS_KEY"];

export const ImportExportModal = () => {
    const puzzle = usePuzzle();
    const [importAttempted, setImportAttempted] = useState(false);
    const textRef = useRef<HTMLTextAreaElement>(null);
    const [opened, setOpened] = useAtom(ImportExportAtom);

    const { copied, copy, error: copyError } = useClipboard({ timeout: 3000 });

    const puzzleString = useMemo(() => {
        if (opened) {
            const objects = cloneDeep(puzzle.storage.objects);
            const grid = objects[puzzle.grid.id];
            for (const layerId of layersAlwaysPresent) {
                delete grid[layerId];
            }
            const params = puzzle._getParams();
            return Buffer.from(
                // TODO: Synchronize version numbers from one source.
                deflate(JSON.stringify({ objects, params, version: "alpha-0" })),
            ).toString("base64");
        }
    }, [puzzle, opened]);

    const noRefSet = () => errorNotification({ message: "Ref not set in import/export textarea" });

    const handleImport = () => {
        try {
            if (!textRef.current) return noRefSet();

            const puzzleData = JSON.parse(
                inflate(Buffer.from(textRef.current.value.trim(), "base64"), { to: "string" }),
            );
            if (puzzleData?.version !== "alpha-0")
                return errorNotification({
                    title: "Failed to parse",
                    message: "malformed puzzle string",
                });

            puzzle.storage.histories[puzzle.grid.id] = { actions: [], index: 0 };
            puzzle._resetLayers();
            puzzle._loadPuzzle(puzzleData.params);
            const cloned = cloneDeep(puzzle.storage.objects);
            for (const layerId of layersAlwaysPresent) {
                // Keep layer data that was not included in the puzzle string
                puzzleData.objects[puzzle.grid.id][layerId] = cloned[puzzle.grid.id][layerId];
            }
            puzzle.storage.objects = puzzleData.objects;
            puzzle.renderChange({ type: "draw", layerIds: "all" });
            setOpened(false);
        } catch (e) {
            // Really nailing these error messages
            errorNotification({
                title: "Failed to parse",
                message: (e as any).message || "Bad puzzle data or unknown error",
            });
        }
    };

    const handlePaste = () => {
        navigator.clipboard
            .readText()
            .then((text) => {
                if (!textRef.current) return noRefSet();

                // I don't need to update the value in the DOM since the modal will be hidden, but I do it anyways
                textRef.current.value = text;
                handleImport();
            })
            .catch(() => {
                setImportAttempted(true);
                errorNotification({
                    title: "Failed to paste",
                    message:
                        "You have prevented us from pasting using this button. You can still manually paste into the text field above and click Load.",
                });
            });
    };

    return (
        <Modal
            opened={opened}
            title="Import / Export Puzzle"
            onClose={() => setOpened(false)}
            size="lg"
            {...puzzle.controls.stopPropagation}
        >
            <Box p="sm">
                <Text size="lg" italic weight="bold" align="center" color="yellow">
                    *Temporary solution for import/export*
                </Text>
                <Text size="sm" italic align="center" mb="md">
                    I want to decide on some things before I switch to storing the puzzle data in a
                    url.
                </Text>

                <Textarea autosize readOnly minRows={1} maxRows={6} mb="md" value={puzzleString} />
                <Center>
                    <Button
                        onClick={() => {
                            textRef.current?.select();
                            if (puzzleString) copy(puzzleString);
                        }}
                        color={copyError ? "red" : copied ? "teal" : "blue"}
                    >
                        {copyError ? "Cannot copy!" : copied ? "Copied!" : "Export + Copy"}
                    </Button>
                </Center>

                <Divider my="xl" label="OR" labelPosition="center" />

                <Textarea
                    autosize
                    minRows={1}
                    maxRows={6}
                    mb="md"
                    ref={textRef}
                    onChange={() => setImportAttempted(true)}
                />
                <Center>
                    <Group spacing="sm">
                        {importAttempted ? (
                            <Button onClick={handleImport}>Import</Button>
                        ) : (
                            <Button onClick={handlePaste} disabled={importAttempted}>
                                Paste + Import
                            </Button>
                        )}
                    </Group>
                </Center>
            </Box>
        </Modal>
    );
};
