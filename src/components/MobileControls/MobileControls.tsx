import { ActionIcon, ActionIconProps, Box, Select, Tooltip, createStyles } from "@mantine/core";
import {
    IoMdArrowRoundBack,
    IoMdArrowRoundDown,
    IoMdArrowRoundForward,
    IoMdArrowRoundUp,
    IoMdRedo,
    IoMdUndo,
} from "react-icons/io";
import { useProxy } from "valtio/utils";
import { usePuzzle } from "../../state/puzzle";
import { useFocusElementHandler } from "../../utils/focusManagement";
import { LayerControlSettings } from "../SideBar/ControlsGroup/LayerControlSettings";
import { PuzzleModeToggle } from "../SideBar/MainGroup/PuzzleModeToggle";
import { sidebarProxy, smallPageWidth } from "../SideBar/sidebarProxy";
import { mobileControlsProxy } from "./mobileControlsProxy";

type Arg1 = { sidebarOpened: boolean };
const useStyles = createStyles((theme, { sidebarOpened }: Arg1) => ({
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
        // height: `calc(${height} - 3px)`,
        height: "fit-content",
        width: "100%",
        display: "flex",
        flexWrap: "wrap",
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
    const puzzle = usePuzzle();
    const layersProxy = puzzle.layers;
    const currentLayerId = useProxy(layersProxy).currentKey;

    const state = useProxy(mobileControlsProxy);
    const { opened: sidebarOpened } = useProxy(sidebarProxy);
    const { cx, classes } = useStyles({ sidebarOpened });

    const { ref: layerDropdownRef, unfocus } = useFocusElementHandler();

    // Look at this beauty... Can't wait to refactor
    return (
        <Box className={classes.container}>
            <div className={classes.buttons}>
                <PuzzleModeToggle />
                <IconButton
                    label="Previous Layer"
                    className={classes.icon}
                    onClick={() => {
                        const id = puzzle.layers.currentKey;
                        if (!id) return;
                        let prev = puzzle.layers.getPrevSelectableKey(id);
                        if (!prev) prev = puzzle.layers.getLastSelectableKey();
                        if (!prev) return;
                        puzzle.selectLayer(prev);
                    }}
                >
                    <IoMdArrowRoundBack />
                </IconButton>
                <Select
                    ref={layerDropdownRef}
                    allowDeselect={false}
                    value={currentLayerId}
                    onChange={(id) => {
                        if (id) puzzle.selectLayer(id);
                    }}
                    onDropdownClose={() => {
                        // Actually needs some time, otherwise a layer can't be selected...
                        setTimeout(() => unfocus(), 50);
                    }}
                    data={puzzle.layers
                        .entries()
                        .filter(([, layer]) => puzzle.layers.selectable(layer))
                        .map(([id, layer]) => ({
                            label: layer.displayName,
                            value: id,
                        }))}
                />
                <IconButton
                    label="Next Layer"
                    className={classes.icon}
                    onClick={() => {
                        const id = puzzle.layers.currentKey;
                        if (!id) return;
                        let next = puzzle.layers.getNextSelectableKey(id);
                        if (!next) next = puzzle.layers.getFirstSelectableKey();
                        if (!next) return;
                        puzzle.selectLayer(next);
                    }}
                >
                    <IoMdArrowRoundForward />
                </IconButton>
                <IconButton
                    label="Undo"
                    className={classes.icon}
                    onClick={() => {
                        puzzle.controls.handleKeyPress("ctrl-z");
                    }}
                >
                    <IoMdUndo />
                </IconButton>
                <IconButton
                    label="Redo"
                    className={classes.icon}
                    onClick={() => {
                        puzzle.controls.handleKeyPress("ctrl-y");
                    }}
                >
                    <IoMdRedo />
                </IconButton>
                <IconButton
                    label="Toggle Mobile Controls"
                    className={cx(classes.icon, !state.opened && classes.offsetIcon)}
                    onClick={() => (state.opened = !state.opened)}
                >
                    {state.opened ? <IoMdArrowRoundDown /> : <IoMdArrowRoundUp />}
                </IconButton>
            </div>
            <LayerControlSettings />
        </Box>
    );
};
type Arg2 = ActionIconProps & { label: string; onClick: () => void };
const IconButton = ({ label, onClick, ...rest }: Arg2) => {
    const { ref, unfocus } = useFocusElementHandler();
    return (
        <Tooltip label={label} events={{ focus: true, hover: true, touch: true }}>
            <ActionIcon
                ref={ref}
                size="lg"
                variant="filled"
                color="blue"
                onClick={() => {
                    onClick();
                    unfocus();
                }}
                {...rest}
            />
        </Tooltip>
    );
};
