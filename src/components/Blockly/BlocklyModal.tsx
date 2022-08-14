import { Button, Drawer, Grid, Text } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { useAtom, useSetAtom } from "jotai";
import React, { useEffect, useRef, useState } from "react";
import { modifiableAtom } from "../../atoms/modifiableAtom";
import { usePuzzle } from "../../atoms/puzzle";
import { blocklyToolbox } from "../../logic/userComputation/codeBlocks";
import { ComputeManager } from "../../logic/userComputation/ComputeManager";
import { addAliasCategoryToToolbox } from "../../logic/userComputation/utils";
import { Blockly } from "../../utils/Blockly";
import { codeGen } from "./customCodeGen";

const { atom: modalAtom, getValue, setValue } = modifiableAtom(false);
export const blocklyModalIsOpen = getValue;
export const setBlocklyModalOpen = setValue;

export const BlocklyModal: React.FC = () => {
    const [opened, setOpened] = useAtom(modalAtom);
    const [rendered, setRendered] = useState(false);
    const [blocks, setBlocks] = useLocalStorage<any>({
        key: "blockly",
        defaultValue: {},
    });
    const blocklyDiv = useRef<HTMLDivElement>(null);
    const puzzle = usePuzzle();

    useEffect(() => {
        if (!opened) {
            setRendered(false);
            return;
        }
        // The div must be rendered in the DOM before Blockly can inject the workspace
        if (!rendered || !blocklyDiv.current) {
            setRendered(true);
            return;
        }

        const workspace = Blockly.inject(blocklyDiv.current, {
            toolbox: blocklyToolbox,
            collapse: false,
            sounds: false,
            zoom: { wheel: true },
        } as any);

        workspace.addChangeListener((event: any) => {
            if (false) {
                console.log(event.type);
                if (["move"].includes(event.type)) console.log(event);
            }
        });

        workspace.registerToolboxCategoryCallback("ALIASES", addAliasCategoryToToolbox);

        try {
            Blockly.serialization.workspaces.load(blocks, workspace);
        } catch {
            console.error("failed to load blocks from localStorage");
        }

        return () => {
            const serialized = Blockly.serialization.workspaces.save(workspace);
            // TODO: This only saves data when the drawer/modal is closed. I will have to save it on every change (debounced of course)
            // Use: workspace.addChangeListener, also see how hard it would be to
            setBlocks(serialized);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened, rendered, blocks]);

    // TODO: The raw error handling should be handled internally, but the error messages themselves be shown by this modal (or at least somewhere in client code)
    const compileAndRun = () => {
        const topBlocks = Blockly.getMainWorkspace()
            .getTopBlocks(true)
            .filter((block) => block.type === "RootBlock");
        if (!topBlocks.length) {
            console.error("no root blocks");
            return;
        } else if (topBlocks.length > 1) {
            console.error("only one root block allowed");
            return;
        }

        const codeString = codeGen.blockToCode(topBlocks[0]) as string;

        const compute = new ComputeManager(puzzle);
        try {
            compute.compile(codeString);
            console.log("Errors:", ...compute.compilerErrors);
            console.log(`${Object.keys(compute.codeBlocks).length} blocks compiled`);
            compute.runOnce();
            console.log("ran");
        } catch (e) {
            console.error("failed to compile with error", e, codeString);
        }
    };

    return (
        <Drawer opened={opened} size="90%" onClose={() => setOpened(false)}>
            <Grid columns={7} style={{ width: "100%", height: "90vh" }}>
                <Grid.Col span={6}>
                    <div ref={blocklyDiv} style={{ width: "100%", height: "100%" }}></div>
                </Grid.Col>
                <Grid.Col span={1}>
                    <Text component="p" italic weight="bold" mb="sm">
                        This is a mockup, and does not actually run anything yet.
                    </Text>
                    <Button onClick={compileAndRun}>Run</Button>
                </Grid.Col>
            </Grid>
        </Drawer>
    );
};

export const ToggleBlocklyModal: React.FC<{ children: string }> = ({ children }) => {
    const setOpened = useSetAtom(modalAtom);

    return <Button onClick={() => setOpened((opened) => !opened)}>{children}</Button>;
};
