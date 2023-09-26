import { ActionIcon, Box, SimpleGrid, Tooltip, createStyles } from "@mantine/core";
import { IoMdArrowRoundDown, IoMdArrowRoundUp } from "react-icons/io";
import { useProxy } from "valtio/utils";
import { useFocusElementHandler } from "../../utils/focusManagement";
import { sidebarProxy, smallPageWidth } from "../SideBar/sidebarProxy";
import { mobileControlsProxy } from "./mobileControlsProxy";

type Arg1 = { height: string; sidebarOpened: boolean };
const useStyles = createStyles((theme, { height, sidebarOpened }: Arg1) => ({
    container: {
        width: "100svw",
        height: "calc(40svh - 3px)",
        transition: "width 400ms",
        borderTop: "3px solid rgb(54, 50, 50)",
        [`@media (min-width: ${smallPageWidth})`]: {
            width: sidebarOpened ? "70svw" : "100svw",
        },
    },
    buttons: {
        height: `calc(${height} - 3px)`,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "end",
        padding: "6px",
        borderBottom: "3px solid rgb(54, 50, 50)",
    },
    icon: {
        margin: "8px",
    },
    offsetIcon: {
        top: "-60px",
        zIndex: 1,
    },
}));

export const MobileControls = () => {
    const { ref: openToggleRef } = useFocusElementHandler();
    const state = useProxy(mobileControlsProxy);
    const { opened: sidebarOpened } = useProxy(sidebarProxy);
    const { cx, classes } = useStyles({ height: "3rem", sidebarOpened });

    return (
        <Box className={classes.container}>
            <div className={classes.buttons}>
                <Tooltip
                    label="Toggle Mobile Controls"
                    events={{ hover: true, focus: true, touch: true }}
                >
                    <ActionIcon
                        ref={openToggleRef}
                        size="lg"
                        className={cx(classes.icon, !state.opened && classes.offsetIcon)}
                        variant="filled"
                        color="blue"
                        tabIndex={-1}
                        onClick={() => (state.opened = !state.opened)}
                    >
                        {state.opened ? <IoMdArrowRoundDown /> : <IoMdArrowRoundUp />}
                    </ActionIcon>
                </Tooltip>
            </div>
            <SimpleGrid cols={3} spacing={16} p="1rem" m="auto" w="auto">
                <div style={{ width: "4rem", height: "4rem", backgroundColor: "red" }}>1</div>
                <div style={{ width: "4rem", height: "4rem", backgroundColor: "red" }}>2</div>
                <div style={{ width: "4rem", height: "4rem", backgroundColor: "red" }}>3</div>
                <div style={{ width: "4rem", height: "4rem", backgroundColor: "red" }}>4</div>
                <div style={{ width: "4rem", height: "4rem", backgroundColor: "red" }}>5</div>
                <div style={{ width: "4rem", height: "4rem", backgroundColor: "red" }}>6</div>
                <div style={{ width: "4rem", height: "4rem", backgroundColor: "red" }}>7</div>
                <div style={{ width: "4rem", height: "4rem", backgroundColor: "red" }}>8</div>
                <div style={{ width: "4rem", height: "4rem", backgroundColor: "red" }}>9</div>
                <div style={{ width: "4rem", height: "4rem", backgroundColor: "red" }}>Del</div>
                <div style={{ width: "4rem", height: "4rem", backgroundColor: "red" }}>0</div>
                <div style={{ width: "4rem", height: "4rem", backgroundColor: "red" }}>Back</div>
            </SimpleGrid>
        </Box>
    );
};
