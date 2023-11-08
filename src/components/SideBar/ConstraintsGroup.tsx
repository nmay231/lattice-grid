import React from "react";
import { BlocklyModalButton } from "../Blockly/BlocklyModal";
import { Group } from "./Group";

export const CodeGroup = React.memo(function CodeGroup() {
    return (
        <Group name="Constraints" expanded>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    margin: "10px",
                }}
            >
                <BlocklyModalButton>Show Constraints</BlocklyModalButton>
            </div>
        </Group>
    );
});
