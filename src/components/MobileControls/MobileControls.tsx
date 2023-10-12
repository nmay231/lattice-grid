import { ActionIcon, ActionIconProps, Box, Burger, Center, Select, Tooltip } from "@mantine/core";
import { IoMdArrowDropleft, IoMdArrowDropright, IoMdRedo, IoMdUndo } from "react-icons/io";
import { useProxy } from "valtio/utils";
import { usePuzzle, useSettings } from "../../state/puzzle";
import { useFocusElementHandler } from "../../utils/focusManagement";
import { LayerControlSettings } from "../SideBar/ControlsGroup/LayerControlSettings";
import { PuzzleModeToggle } from "../SideBar/MainGroup/PuzzleModeToggle";
import { sidebarProxy } from "../SideBar/sidebarProxy";
import styles from "./mobileControls.module.css";
import { mobileControlsProxy } from "./mobileControlsProxy";

export const MobileControlsMetaControls = () => {
    const puzzle = usePuzzle();
    const layersProxy = puzzle.layers;
    const currentLayerId = useProxy(layersProxy).currentKey;
    const sidebar = useProxy(sidebarProxy);
    const mobileControls = useProxy(mobileControlsProxy);
    const { pageMode } = useSettings();

    const { ref: layerDropdownRef, unfocus } = useFocusElementHandler();
    const { ref: openToggleRef } = useFocusElementHandler();

    // Look at this beauty... Can't wait to refactor
    return (
        <div>
            <div className={styles.row}>
                <Box
                    className={styles.offsetIcon}
                    pos={mobileControls.enabled && pageMode === "edit" ? "relative" : "absolute"}
                    left="0px"
                    top={mobileControls.enabled && pageMode === "edit" ? "0px" : "8px"}
                >
                    {!sidebar.opened ? (
                        <Tooltip
                            label="Toggle Sidebar"
                            events={{ hover: true, focus: true, touch: true }}
                        >
                            <Burger
                                ref={openToggleRef}
                                opened={false}
                                size="md"
                                tabIndex={-1}
                                onClick={() => (sidebar.opened = !sidebar.opened)}
                            />
                        </Tooltip>
                    ) : (
                        // TODO: Size manually copied from the width of the burger
                        <Box w="29px" h="29px"></Box>
                    )}
                </Box>
                <div className={styles.row}>
                    {pageMode === "edit" && <PuzzleModeToggle />}
                    <IconButton
                        ml="sm"
                        label="Undo"
                        className={styles.icon}
                        onClick={() => {
                            puzzle.controls.handleKeyPress("ctrl-z");
                        }}
                    >
                        <IoMdUndo />
                    </IconButton>
                    <IconButton
                        label="Redo"
                        className={styles.icon}
                        onClick={() => {
                            puzzle.controls.handleKeyPress("ctrl-y");
                        }}
                    >
                        <IoMdRedo />
                    </IconButton>
                </div>
            </div>

            <div className={styles.row}>
                <IconButton
                    label="Previous Layer"
                    className={styles.icon}
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
                    className={styles.icon}
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
        </div>
    );
};

type Arg2 = ActionIconProps & { label: string; onClick: () => void };
const IconButton = ({ label, onClick, ...rest }: Arg2) => {
    const { ref, unfocus } = useFocusElementHandler();
    return (
        <Tooltip label={label} events={{ focus: true, hover: true, touch: true }}>
            <ActionIcon
                component="button"
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

export const MobileControlsActual = () => {
    return (
        <Center>
            <LayerControlSettings />
        </Center>
    );
};
