import { useEffect, useRef } from "react";
import style from "./KeepingTabs.module.css";

// TODO: This is REEEEEAL sketch. I don't expect it to work on all devices or browsers, especially mobile (I'm worried the keyboard might pop up). There are also accessibility concerns (then again, how would you make this accessible in the first place?). So, we'll see if this makes it to the final result...
export const KeepingTabs = ({ interpretKeyDown }) => {
    const ref = useRef();
    useEffect(() => {
        if (interpretKeyDown) {
            ref.current.focus();
        }
    }, [interpretKeyDown]);

    const becomeTheCenterOfAttention = (event) => {
        if (interpretKeyDown) {
            event.target.focus();
        }
    };

    const handleKeyDown = (event) => {
        if (!interpretKeyDown) {
            return;
        }
        const { shiftKey, ctrlKey, altKey, key, code } = event;
        interpretKeyDown({
            shiftKey,
            ctrlKey,
            altKey,
            key,
            code,
        });

        // This should be a very small whitelist for what input is allowed to be blocked
        if (
            parseInt(key) >= 0 ||
            (!ctrlKey && !altKey && key.length === 1) ||
            (!shiftKey && !altKey && (key === "a" || key === "i"))
        ) {
            event.preventDefault();
        }
    };

    return (
        <div className={style.keepingTabs}>
            <input />
            <input
                ref={ref}
                onBlur={becomeTheCenterOfAttention}
                onKeyDown={handleKeyDown}
            />
            <input />
        </div>
    );
};
