import { ToggleBlocklyModal } from "../Blockly/BlocklyModal";
import { Group } from "./Group";

export const CodeGroup = () => {
    return (
        <Group name="Constraints" expanded>
            <ToggleBlocklyModal />
        </Group>
    );
};
