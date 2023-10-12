import { ActionIcon, Burger, Tooltip } from "@mantine/core";
import { IoMdSettings } from "react-icons/io";
import { useProxy } from "valtio/utils";
import { useFocusElementHandler } from "../../../utils/focusManagement";
import { sidebarProxy } from "../sidebarProxy";
import styles from "./UtilityBar.module.css";

export const UtilityBar = () => {
    const sidebar = useProxy(sidebarProxy);
    const { ref: openToggleRef } = useFocusElementHandler();

    return (
        <div className={styles.container}>
            {sidebar.opened && (
                <Tooltip label="Toggle Sidebar" events={{ hover: true, focus: true, touch: true }}>
                    <Burger
                        ref={openToggleRef}
                        opened={true}
                        size="md"
                        mr="auto"
                        tabIndex={-1}
                        onClick={() => (sidebar.opened = !sidebar.opened)}
                    />
                </Tooltip>
            )}
            <Tooltip label="Settings (Todo)" events={{ hover: true, focus: true, touch: true }}>
                <ActionIcon
                    size="lg"
                    className={styles.icon}
                    variant="filled"
                    color="gray"
                    // tabIndex={-1}
                >
                    <IoMdSettings />
                </ActionIcon>
            </Tooltip>
        </div>
    );
};
