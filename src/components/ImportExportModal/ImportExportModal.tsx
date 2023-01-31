import {
    Box,
    Button,
    Center,
    Checkbox,
    Divider,
    Group,
    Modal,
    Text,
    Textarea,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { useCallback, useMemo, useRef, useState } from "react";
import { LayerStorage, LayerStorageJSON } from "../../LayerStorage";
import { PuzzleManager } from "../../PuzzleManager";
import { usePuzzle } from "../../state/puzzle";
import { StorageManager } from "../../StorageManager";
import { Layer, LocalStorageData, NeedsUpdating } from "../../types";
import { errorNotification } from "../../utils/DOMUtils";
import { openModal, useFocusElementHandler, useModal } from "../../utils/focusManagement";
import { compressJSON, decompressJSON } from "../../utils/stringUtils";

export const ImportExportButton = () => {
    const open = useCallback(() => openModal("import-export"), []);
    const { ref } = useFocusElementHandler();

    return (
        <Button ref={ref} tabIndex={0} onClick={open}>
            Import / Export
        </Button>
    );
};

type PuzzleData = {
    version: `alpha-${0 | 1}`;
    params: LocalStorageData;
    objects: Record<Layer["id"], LayerStorageJSON>;
};
const currentVersion: PuzzleData["version"] = "alpha-1";

export const importPuzzle = (puzzle: PuzzleManager, text: string) => {
    try {
        const puzzleData: PuzzleData = decompressJSON(text);
        if (!puzzleData?.version || typeof puzzleData.version !== "string")
            return errorNotification({
                error: null,
                title: "Failed to parse",
                message: "malformed puzzle string",
            });
        else if (puzzleData.version !== currentVersion) {
            return errorNotification({
                forever: true,
                error: null,
                title: "Old puzzle string",
                message:
                    "The puzzle string is incompatible with the current version." +
                    " Backwards compatibility is not a concern until this software leaves alpha",
            });
        }
        puzzle.storage = new StorageManager();
        puzzle.resetLayers();
        puzzle._loadPuzzle(puzzleData.params);
        puzzle.resizeCanvas();
        const gridObjects = puzzle.storage.objects[puzzle.grid.id];
        for (const layerId of puzzle.layers.keys()) {
            if (!(layerId in puzzleData.objects)) continue;
            const storage = LayerStorage.fromJSON(puzzleData.objects[layerId]);
            gridObjects[layerId] = storage;
            const bad = [
                ...storage.groups.getGroup("answer").values(),
                ...storage.groups.getGroup("ui").values(),
            ];

            for (const objectId of bad) {
                storage.objects.delete(objectId);
                storage.groups.deleteKey(objectId);
            }
        }
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
    const [exportPlay, setExportPlay] = useState(true);
    const { opened, close } = useModal("import-export");

    const { copied, copy, error: copyError } = useClipboard({ timeout: 3000 });

    const puzzleString = useMemo(() => {
        if (opened) {
            // Assume only one grid
            const currentObjects = puzzle.storage.objects[puzzle.grid.id];
            const objects: Record<Layer["id"], LayerStorageJSON> = {};
            for (const layerId of puzzle.layers.keys()) {
                // Ignore UI Information
                if (layerId === "OverlayLayer") continue;
                objects[layerId] = currentObjects[layerId].toJSON();
            }
            const params = puzzle._getParams();
            // TODO: Synchronize version numbers from one source.
            const string = compressJSON({
                objects,
                params,
                version: currentVersion,
            } satisfies PuzzleData);
            return `${window.location.origin}/${exportPlay ? "" : "edit"}?${string}`;
        }
    }, [puzzle, opened, exportPlay]);

    const noRefSet = () => {
        throw errorNotification({ error: null, message: "Ref not set in import/export textarea" });
    };

    const handleImport = () => {
        if (!textRef.current) return noRefSet();
        let text = textRef.current.value.trim();
        if (/^https?:\/\//.test(text)) {
            text = text.split("?")[1];
        }
        importPuzzle(puzzle, text);
        close();
    };

    const handlePaste = () => {
        navigator.clipboard
            .readText()
            .then((text) => {
                if (!textRef.current) return noRefSet();

                // I don't need to update the value in the DOM since the modal will be hidden, but I do it anyways
                textRef.current.value = text;
                // Process the import in a separate promise so failed imports are not confused as failed pastes
                void new Promise(() => handleImport());
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
                <Text size="sm" italic weight="bold" align="center" mb="md" color="red">
                    This only exports edit-mode URLs. Solve-mode URLs are in the works.
                </Text>

                <Textarea autosize readOnly minRows={1} maxRows={6} mb="md" value={puzzleString} />
                <Checkbox
                    disabled
                    checked={exportPlay}
                    onChange={(event) => setExportPlay(event.currentTarget.checked)}
                    label="Export solving URL (the only one supported, currently)"
                />
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
