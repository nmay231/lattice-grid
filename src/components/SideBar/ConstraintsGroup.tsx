import { OpenBlocklyModal } from "../Blockly/BlocklyModal";
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
                <OpenBlocklyModal>Show Constraints</OpenBlocklyModal>
            </div>
        </Group>
    );
};
