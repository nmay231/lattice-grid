import { Drawer } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { atom, useAtom, useSetAtom } from "jotai";
import React, { useEffect, useRef, useState } from "react";
import { usePuzzle } from "../../atoms/puzzle";
import { ComputeManager } from "../../logic/userComputation/ComputeManager";
import { addAliasCategoryToToolbox } from "../../logic/userComputation/utils";
import { Blockly } from "../../utils/Blockly";
import "./blocklyUI";
import { codeGen } from "./customCodeGen";

const modalAtom = atom(true);

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

        const toolbox = {
            kind: "categoryToolbox",
            contents: [
                {
                    kind: "category",
                    name: "statements",
                    contents: [
                        // -{ kind: "block", type: "ObjectsOfLayer" },
                        { kind: "block", type: "IfElse" },
                        { kind: "block", type: "ForEach" },
                        { kind: "block", type: "MarkInvalid" },
                        { kind: "block", type: "DefineAlias" },
                        { kind: "block", type: "RootBlock" },
                    ],
                },
                {
                    kind: "category",
                    name: "user aliases",
                    custom: "ALIASES",
                },
            ],
        };

        const workspace = Blockly.inject(blocklyDiv.current, {
            toolbox,
            scrollbars: false,
        } as any);

        Blockly.serialization.workspaces.load(blocks, workspace);
        workspace.registerToolboxCategoryCallback(
            "ALIASES",
            addAliasCategoryToToolbox,
        );

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

        const s = codeGen.blockToCode(topBlocks[0]) as string;
        let json: any;

        const compute = new ComputeManager(puzzle);
        try {
            compute.compile(json);
            console.log("Errors:", ...compute.ctx.compilerErrors);
            console.log(
                `${Object.keys(compute.ctx.codeBlocks).length} blocks compiled`,
            );
            compute.runOnce();
            console.log("ran");
        } catch (e) {
            console.error("failed to compile with error", e, s);
        }
    };

    return (
        <Drawer opened={opened} size="90%" onClose={() => setOpened(false)}>
            <div
                style={{
                    display: "grid",
                    overflow: "hidden",
                    padding: "10px",
                    columnGap: "10px",
                    width: "100%",
                    height: "90vh",
                }}
            >
                <div style={{ gridArea: "1 / 1 / span 1 / span 6" }}>
                    <div
                        ref={blocklyDiv}
                        style={{ width: "100%", height: "100%" }}
                    ></div>
                </div>
                <div style={{ gridArea: "1 / 7 / 2 / span 1" }}>
                    <button onClick={compileAndRun}>Compile and run</button>
                </div>
            </div>
        </Drawer>
    );
};

export const ToggleBlocklyModal: React.FC<{ children: string }> = ({
    children,
}) => {
    const setOpened = useSetAtom(modalAtom);

    return (
        <button onClick={() => setOpened((opened) => !opened)}>
            {children}
        </button>
    );
};
