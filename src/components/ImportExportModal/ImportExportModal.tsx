import { Box, Button, Center, Divider, Group, Modal, Text, Textarea } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { cloneDeep } from "lodash";
import { deflate, inflate } from "pako";
import { useCallback, useMemo, useRef, useState } from "react";
import { availableLayers } from "../../layers";
import { PuzzleManager } from "../../PuzzleManager";
import { usePuzzle } from "../../state/puzzle";
import { NeedsUpdating } from "../../types";
import { errorNotification } from "../../utils/DOMUtils";
import { openModal, useFocusElementHandler, useModal } from "../../utils/focusManagement";

const layersAlwaysPresent: (keyof typeof availableLayers)[] = ["CellOutlineLayer", "OverlayLayer"];

export const ImportExportButton = () => {
    const open = useCallback(() => openModal("import-export"), []);
    const { ref } = useFocusElementHandler();

    return (
        <Button ref={ref} tabIndex={0} onClick={open}>
            Import / Export
        </Button>
    );
};

export const importPuzzle = (puzzle: PuzzleManager, text: string) => {
    text = text.trim();
    if (/^https?:\/\//.test(text)) {
        text = text.split("?")[1];
    }
    try {
        const puzzleData = JSON.parse(inflate(Buffer.from(text, "base64"), { to: "string" }));
        if (puzzleData?.version !== "alpha-0")
            return errorNotification({
                error: null,
                title: "Failed to parse",
                message: "malformed puzzle string",
            });

        puzzle.storage.histories = {};
        puzzle.resetLayers();
        puzzle._loadPuzzle(puzzleData.params);
        puzzle.resizeCanvas();
        const cloned = cloneDeep(puzzle.storage.objects);
        for (const layerId of layersAlwaysPresent) {
            // Keep layer data that was not included in the puzzle string
            puzzleData.objects[puzzle.grid.id][layerId] = cloned[puzzle.grid.id][layerId];
        }
        puzzle.storage.objects = puzzleData.objects;
        puzzle.renderChange({ type: "draw", layerIds: "all" });
    } catch (error) {
        throw errorNotification({
            error: error as NeedsUpdating,
            title: "Failed to parse",
            message: "Bad puzzle data or unknown error",
        });
    }
};

export const ImportExportModal = () => {
    const puzzle = usePuzzle();
    const [importAttempted, setImportAttempted] = useState(false);
    const textRef = useRef<HTMLTextAreaElement>(null);
    const { opened, close } = useModal("import-export");

    const { copied, copy, error: copyError } = useClipboard({ timeout: 3000 });

    const puzzleString = useMemo(() => {
        if (opened) {
            const objects = cloneDeep(puzzle.storage.objects);
            const grid = objects[puzzle.grid.id];
            for (const layerId of layersAlwaysPresent) {
                delete grid[layerId];
            }
            const params = puzzle._getParams();
            const string = Buffer.from(
                // TODO: Synchronize version numbers from one source.
                deflate(JSON.stringify({ objects, params, version: "alpha-0" })),
            ).toString("base64");
            return `${window.location.origin}/?${string}`;
        }
    }, [puzzle, opened]);

    const noRefSet = () => {
        throw errorNotification({ error: null, message: "Ref not set in import/export textarea" });
    };

    const handleImport = () => {
        if (!textRef.current) return noRefSet();
        importPuzzle(puzzle, textRef.current.value);
        close();
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
            .catch((error) => {
                setImportAttempted(true);
                errorNotification({
                    error,
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
            onClose={close}
            size="lg"
            // TODO: openModal("import-export")
        >
            <Box p="sm">
                <Text size="lg" italic weight="bold" align="center" color="yellow">
                    *Temporary solution for import/export*
                </Text>
                <Text size="sm" italic weight="bold" align="center" mb="md" color="red">
                    This is a temporary format. URLs are not expected to work indefinitely.
                </Text>

                <Textarea autosize readOnly minRows={1} maxRows={6} mb="md" value={puzzleString} />
                <Center>
                    <Button
                        onClick={() => {
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
