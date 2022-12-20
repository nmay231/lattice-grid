import { Box, Button, Center, Divider, Group, Modal, Text, Textarea } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { cloneDeep } from "lodash";
import { deflate, inflate } from "pako";
import { useMemo, useRef, useState } from "react";
import { proxy, useSnapshot } from "valtio";
import { availableLayers } from "../../logic/layers";
import { PuzzleManager } from "../../logic/PuzzleManager";
import { usePuzzle } from "../../state/puzzle";
import { errorNotification } from "../../utils/DOMUtils";

const layersAlwaysPresent: (keyof typeof availableLayers)[] = ["CellOutlineLayer", "OverlayLayer"];

export const importPuzzle = (puzzle: PuzzleManager, text: string) => {
    text = text.trim();
    if (/^https?:\/\//.test(text)) {
        text = text.split("?")[1];
    }
    try {
        const puzzleData = JSON.parse(inflate(Buffer.from(text, "base64"), { to: "string" }));
        if (puzzleData?.version !== "alpha-0")
            return errorNotification({
                title: "Failed to parse",
                message: "malformed puzzle string",
            });

        puzzle.storage.histories = {};
        puzzle._resetLayers();
        puzzle._loadPuzzle(puzzleData.params);
        puzzle.resizeCanvas();
        const cloned = cloneDeep(puzzle.storage.objects);
        for (const layerId of layersAlwaysPresent) {
            // Keep layer data that was not included in the puzzle string
            puzzleData.objects[puzzle.grid.id][layerId] = cloned[puzzle.grid.id][layerId];
        }
        puzzle.storage.objects = puzzleData.objects;
        puzzle.renderChange({ type: "draw", layerIds: "all" });
    } catch (e) {
        // Really nailing these error messages
        errorNotification({
            title: "Failed to parse",
            message: (e as any).message || "Bad puzzle data or unknown error",
        });
    }
};

export const modalProxy = proxy({ modal: null as "import-export" | null });

export const ImportExportModal = () => {
    const puzzle = usePuzzle();
    const [importAttempted, setImportAttempted] = useState(false);
    const textRef = useRef<HTMLTextAreaElement>(null);
    const modalSnap = useSnapshot(modalProxy);

    const { copied, copy, error: copyError } = useClipboard({ timeout: 3000 });

    const puzzleString = useMemo(() => {
        if (modalProxy.modal === "import-export") {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [puzzle, modalSnap.modal]);

    const noRefSet = () => {
        throw errorNotification({ message: "Ref not set in import/export textarea" });
    };

    const handleImport = () => {
        if (!textRef.current) return noRefSet();
        importPuzzle(puzzle, textRef.current.value);
        modalProxy.modal = null;
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
            opened={modalSnap.modal === "import-export"}
            title="Import / Export Puzzle"
            onClose={() => (modalProxy.modal = null)}
            size="lg"
            {...puzzle.controls.stopPropagation}
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
