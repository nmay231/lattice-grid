import { Drawer } from "@mantine/core";
import * as Blockly from "blockly";
import { atom, useAtom, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import "./blocklyUI";

const modalAtom = atom(false);

export const BlocklyModal: React.FC = () => {
    const [opened, setOpened] = useAtom(modalAtom);
    const [rendered, setRendered] = useState(false);
    const [blocks, setBlocks] = useState<Record<string, any>>({});
    const blocklyDiv = useRef<HTMLDivElement>(null);

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
                        { kind: "block", type: "objects_of_layer" },
                        { kind: "block", type: "if_else" },
                        { kind: "block", type: "for_each" },
                        { kind: "block", type: "mark_incomplete" },
                        { kind: "block", type: "user_alias" },
                        { kind: "block", type: "root_block" },
                    ],
                },
            ],
        };

        const workspace = Blockly.inject(blocklyDiv.current, {
            toolbox,
            scrollbars: false,
        } as any);

        Blockly.serialization.workspaces.load(blocks, workspace);

        return () => {
            setBlocks(Blockly.serialization.workspaces.save(workspace));
        };
    }, [opened, rendered, blocks]);

    return (
        <Drawer
            opened={opened}
            size="90%"
            onClose={() => {
                setOpened(false);
            }}
        >
            {opened && (
                <div
                    id="workspace"
                    ref={blocklyDiv}
                    style={{ height: "90vh", width: "100%" }}
                ></div>
            )}
        </Drawer>
    );
};

export const ToggleBlocklyModal: React.FC = () => {
    const setOpened = useSetAtom(modalAtom);

    return (
        <button onClick={() => setOpened((opened) => !opened)}>
            Toggle Blockly
        </button>
    );
};
