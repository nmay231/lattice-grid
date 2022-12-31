import { useState } from "react";
import { useFocusGroup } from "../../utils/focusManagement";
import { OpenBlocklyModal } from "../Blockly/BlocklyModal";
import { Group } from "./Group";

export const CodeGroup = () => {
    const { ref } = useFocusGroup("other");
    const [state, setState] = useState([..."12345"]);

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
                {/*  */}
                {/* Temporary list of inputs to test global focus management */}
                <button tabIndex={-1}>tabIndex=-1</button>
                {/* TODO: allow individual elements to only refocus after their action is complete */}
                <button tabIndex={0}>tabIndex=0</button>
                Press delete to test removing the currently focused element.
                <div id="other" ref={ref}>
                    {/* TODO: Hack Mantine's useFocusTrap so it doesn't focus the first element right away */}
                    <div data-autofocus></div>
                    {state.map((x) => (
                        <input
                            key={x}
                            placeholder={x}
                            onKeyDown={(e) => {
                                if (e.key === "Delete") {
                                    console.log("deleted");
                                    setState(state.filter((y) => y !== x));
                                }
                            }}
                        />
                    ))}
                </div>
            </div>
        </Group>
    );
};
