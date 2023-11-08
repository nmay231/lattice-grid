import { Center, SegmentedControl } from "@mantine/core";
import React from "react";
import { GridOrObject } from "../../layers/traits/gridOrObjectFirst";
import { useFocusElementHandler } from "../../utils/focusManagement";
import styles from "./ToggleGridObject.module.css";

type ToggleGridObjectFirstProps = {
    value: GridOrObject;
    onChange: (arg: GridOrObject) => void;
};
export const ToggleGridObjectFirst = React.memo(function ToggleGridObjectFirst({
    value,
    onChange,
}: ToggleGridObjectFirstProps) {
    const { ref, unfocus } = useFocusElementHandler();

    // TODO: The animation is not as smooth because the form element is completely rerendered messing with Mantine's transitions or whatever they're using.
    return (
        <Center>
            <span>
                Select
                <SegmentedControl
                    ref={ref}
                    className={styles.toggleGridObjectControl}
                    data={
                        [
                            { label: "Grid", value: "grid" },
                            { label: "Object", value: "object" },
                        ] satisfies Array<{ label: string; value: GridOrObject }>
                    }
                    value={value}
                    onChange={(value: GridOrObject) => {
                        onChange(value);
                        unfocus();
                    }}
                />
                first
            </span>
        </Center>
    );
});
