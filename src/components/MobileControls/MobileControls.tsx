import { ActionIcon, ActionIconProps, Box, Select, Tooltip, createStyles } from "@mantine/core";
import {
    IoMdArrowDropleft,
    IoMdArrowDropright,
    IoMdArrowRoundDown,
    IoMdArrowRoundUp,
    IoMdRedo,
    IoMdUndo,
} from "react-icons/io";
import { useProxy } from "valtio/utils";
import { usePuzzle } from "../../state/puzzle";
import { useFocusElementHandler } from "../../utils/focusManagement";
import { LayerControlSettings } from "../SideBar/ControlsGroup/LayerControlSettings";
import { PuzzleModeToggle } from "../SideBar/MainGroup/PuzzleModeToggle";
import { smallPageWidth } from "../SideBar/sidebarProxy";
import { mobileControlsProxy } from "./mobileControlsProxy";

const useStyles = createStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        // width: "100svw",
        // height: "fit-content",
        position: "relative",
        bottom: 0,
        transition: "width 400ms",
        // margin: "auto -10svw",
        borderTop: "3px solid rgb(54, 50, 50)",
        // [`@media (min-width: ${smallPageWidth})`]: {
        //     width: sidebarOpened ? "70svw" : "100svw",
        //     // margin: "unset",
        // },
    },
    buttons: {
        width: "100%",
        borderBottom: "3px solid rgb(54, 50, 50)",
        display: "grid",
        gridTemplateAreas: `"edit-mode toggle-button"
                            "layer-picker layer-picker"`,
        alignContent: "center",
        justifyContent: "center",
    },
    row: {
        display: "flex",
        alignItems: "center",
    },
    editRow: {
        gridArea: "edit-mode",
    },
    layerPickerRow: {
        gridArea: "layer-picker",
    },
    toggleButtonRow: {
        gridArea: "toggle-button",
    },
    icon: {
        margin: "8px 3px",
        [`@media (min-width: ${smallPageWidth})`]: {
            margin: "8px",
        },
    },
    offsetIcon: {
        top: "-60px",
        zIndex: 1,
    },
});

export const MobileControls = () => {
    const puzzle = usePuzzle();
    const layersProxy = puzzle.layers;
    const currentLayerId = useProxy(layersProxy).currentKey;

    const state = useProxy(mobileControlsProxy);
    const { cx, classes } = useStyles();

    const { ref: layerDropdownRef, unfocus } = useFocusElementHandler();

    // Look at this beauty... Can't wait to refactor
    return (
        <Box className={classes.container}>
            <div className={classes.buttons}>
                <div className={cx(classes.row, classes.editRow)}>
                    <PuzzleModeToggle />
                    <IconButton
                        ml="sm"
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
                </div>
                <div className={cx(classes.row, classes.layerPickerRow)}>
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
                        <IoMdArrowDropleft />
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
                        <IoMdArrowDropright />
                    </IconButton>
                </div>
                <div className={cx(classes.row, classes.toggleButtonRow)}>
                    <IconButton
                        label="Toggle Mobile Controls"
                        className={cx(classes.icon, !state.opened && classes.offsetIcon)}
                        onClick={() => (state.opened = !state.opened)}
                    >
                        {state.opened ? <IoMdArrowRoundDown /> : <IoMdArrowRoundUp />}
                    </IconButton>
                </div>
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
