import { useState } from "react";
import { usePuzzle } from "../../../state/puzzle";
import { useFocusElementHandler, useFocusGroup } from "../../../utils/focusManagement";

export const DummyFocusGroup = () => {
    const puzzle = usePuzzle();
    const { ref } = useFocusGroup({ puzzle, group: "debug" });
    const { ref: buttonRef, unfocus } = useFocusElementHandler();
    const [state, setState] = useState([..."12345"]);

    // List of inputs to test global focus management
    return (
        <>
            <div>
                <button tabIndex={-1} onClick={() => console.log(-1)}>
                    tabIndex=-1
                </button>
                <button
                    ref={buttonRef}
                    tabIndex={0}
                    onClick={() => {
                        unfocus();
                        console.log(0);
                    }}
                >
                    tabIndex=0
                </button>
            </div>
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
        </>
    );
};
