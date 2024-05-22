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
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { exportPuzzleData } from "../../encoding/exportPuzzle";
import { importPuzzleData } from "../../encoding/importPuzzle";
import { usePuzzle } from "../../state/puzzle";
import { Layer } from "../../types";
import { openModal, useFocusElementHandler, useModal } from "../../utils/focusManagement";
import { notify } from "../../utils/notifications";
import { mobileControlsProxy } from "../MobileControls";
import { sidebarProxy } from "../SideBar/sidebarProxy";

const layerCanBeAnswerChecked = (layer: Layer) => {
    return (
        !layer.klass.ethereal &&
        layer.klass.type !== "CenterMarksLayer" &&
        layer.klass.type !== "TopBottomMarksLayer" &&
        layer.klass.type !== "ToggleCharactersLayer"
    );
};

export const ImportExportButton = () => {
    const open = useCallback(() => {
        openModal("import-export");

        if (mobileControlsProxy.isSmallScreen) {
            sidebarProxy.opened = false;
        }
    }, []);
    const { ref } = useFocusElementHandler();

    return (
        <Button ref={ref} tabIndex={0} onClick={open}>
            Import / Export
        </Button>
    );
};

export const ImportExportModal = React.memo(function ImportExportModal() {
    const puzzle = usePuzzle();
    const [importAttempted, setImportAttempted] = useState(false);
    const textRef = useRef<HTMLTextAreaElement>(null);
    const [exportPlay, setExportPlay] = useState(true);
    const { opened, close } = useModal("import-export");

    const { copied, copy, error: copyError } = useClipboard({ timeout: 3000 });
    const [answerCheck, setAnswerCheck] = useState<Layer["id"][]>([]);

    useEffect(() => {
        setAnswerCheck(
            puzzle.layers
                .entries()
                .filter(([, layer]) => layerCanBeAnswerChecked(layer))
                .map(([id]) => id),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened]);

    const puzzleString = useMemo(() => {
        if (opened) {
            const string = exportPuzzleData(puzzle, answerCheck);
            return `${window.location.origin}/${exportPlay ? "" : "edit"}?${string}`;
        }
    }, [opened, puzzle, answerCheck, exportPlay]);

    const noRefSet = () => {
        throw notify.error({ message: "Ref not set in import/export textarea" });
    };

    const handleImport = () => {
        if (!textRef.current) return noRefSet();
        let text = textRef.current.value.trim();
        if (/^https?:\/\//.test(text)) {
            text = text.split("?")[1];
        }
        importPuzzleData(puzzle, text);
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
                notify.error({
                    error,
                    title: "Failed to paste",
                    message:
                        "You have prevented us from pasting using this button. You can still manually paste into the text field above and click Load.",
                    timeout: 5000,
                });
            });
    };

    return (
        <Modal opened={opened} title="Import / Export Puzzle" onClose={close} size="lg">
            <Box p="sm">
                <Textarea
                    data-testid="exported-url"
                    autosize
                    readOnly
                    minRows={1}
                    maxRows={6}
                    mb="md"
                    value={puzzleString}
                />

                <Text size="sm">Which layers are answer checked?</Text>
                {puzzle.layers
                    .entries()
                    .filter(([, layer]) => layerCanBeAnswerChecked(layer))
                    .map(([id, layer]) => {
                        return (
                            <Checkbox
                                key={id}
                                label={layer.displayName}
                                checked={answerCheck.includes(id)}
                                onChange={() => {
                                    if (answerCheck.includes(id)) {
                                        setAnswerCheck(answerCheck.filter((id_) => id_ !== id));
                                    } else {
                                        setAnswerCheck([...answerCheck, id]);
                                    }
                                }}
                            />
                        );
                    })}

                <Text size="sm" fs="italic" fw="bold" ta="center" mt="md" mb="md" c="red">
                    Can only export solving URLs for now. Feature complete edit-mode URLs are WIP.
                </Text>
                <Checkbox
                    disabled
                    checked={exportPlay}
                    onChange={(event) => setExportPlay(event.currentTarget.checked)}
                    label="Export solving URL"
                />
                <Center>
                    <Button
                        onClick={() => {
                            if (puzzleString) copy(puzzleString);
                        }}
                        color={copyError ? "red" : copied ? "teal" : "blue"}
                    >
                        {copyError ? "Cannot copy!" : copied ? "Copied!" : "Export & Copy"}
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
                    <Group gap="sm">
                        {importAttempted ? (
                            <Button onClick={handleImport}>Import</Button>
                        ) : (
                            <Button onClick={handlePaste} disabled={importAttempted}>
                                Paste & Import
                            </Button>
                        )}
                    </Group>
                </Center>
            </Box>
        </Modal>
    );
});
