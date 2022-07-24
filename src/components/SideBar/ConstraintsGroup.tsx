import { ToggleBlocklyModal } from "../Blockly/BlocklyModal";
import { Group } from "./Group";

export const CodeGroup = () => {
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
                <ToggleBlocklyModal>Show Constraints</ToggleBlocklyModal>
            </div>
        </Group>
    );
};
