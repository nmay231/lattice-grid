import { Button, Drawer, Grid, Text } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePuzzle } from "../../state/puzzle";
import { ComputeManager } from "../../userComputation/ComputeManager";
import { blocklyToolbox } from "../../userComputation/codeBlocks";
import { addAliasCategoryToToolbox } from "../../userComputation/utils";
import { openModal, useFocusElementHandler, useModal } from "../../utils/focusManagement";
import { Blockly } from "../../utils/imports/blockly";
import { mobileControlsProxy } from "../MobileControls";
import { sidebarProxy } from "../SideBar/sidebarProxy";
import { codeGen } from "./customCodeGen";

export const BlocklyModalButton = ({ children }: { children: string }) => {
    const open = useCallback(() => {
        openModal("blockly");

        if (mobileControlsProxy.isSmallScreen) {
            sidebarProxy.opened = false;
        }
    }, []);
    const { ref } = useFocusElementHandler();

    // TODO: Technically, openModal handles calling unfocus from useFocusElementHandler. It's a bad habit to omit it in other button elements, but it's also bad to call unfocus and open out of order. I don't like that ambiguity...
    return (
        <Button ref={ref} tabIndex={0} onClick={open}>
            {children}
        </Button>
    );
};

export const BlocklyModal = React.memo(function BlocklyModal() {
    const { opened, close } = useModal("blockly");
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
            // TODO: Kept for future posterity
            if (!event) {
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
        <Drawer opened={opened} size="90%" onClose={close}>
            <Grid columns={7} style={{ width: "100%", height: "90svh" }}>
                <Grid.Col span={6}>
                    <div ref={blocklyDiv} style={{ width: "100%", height: "100%" }}></div>
                </Grid.Col>
                <Grid.Col span={1}>
                    <Text component="p" fs="italic" fw="bold" mb="sm">
                        This is a mockup, and does not actually run anything yet.
                    </Text>
                    <Button onClick={compileAndRun}>Run</Button>
                </Grid.Col>
            </Grid>
        </Drawer>
    );
});
