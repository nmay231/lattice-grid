import { createStyles } from "@mantine/core";
import { usePageLeave } from "@mantine/hooks";
import { useEffect } from "react";
import { BlocklyModal } from "../components/Blockly/BlocklyModal";
import { ImportExportModal } from "../components/ImportExportModal";
import { SideBar } from "../components/SideBar";
import { ResizeModal } from "../components/SideBar/MainGroup/ResizeModal";
import { SVGCanvas } from "../components/SVGCanvas";
import { usePuzzle } from "../state/puzzle";
import { NeedsUpdating } from "../types";
import { attachGlobalFocusListeners } from "../utils/focusManagement";

const useStyles = createStyles((theme, { canvasWidth }: { canvasWidth: string }) => ({
    // TODO: handle mobile screens
    mainContainer: {
        width: "100vw",
        height: "100vh",
        display: "flex",
    },
    canvasContainer: {
        width: canvasWidth,
        height: "100%",
        display: "flex",
        overflow: "hidden",
        position: "relative",
    },
    sideBar: {
        width: `calc(100% - ${canvasWidth})`,
        height: "100%",
        margin: "0px",
        overflowX: "hidden",
        overflowY: "scroll",
        borderRight: "3px solid rgb(54, 50, 50)",

        // TODO: Remove once I switch to Mantine Scrollbar
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": {
            display: "none",
        },
    },
}));

export const EditPage = () => {
    const { classes } = useStyles({ canvasWidth: "70%" });
    const puzzle = usePuzzle();
    usePageLeave(puzzle.controls.onPageBlur.bind(puzzle.controls));

    useEffect(() => {
        const handleKeyDown = puzzle.controls.handleKeyDown.bind(puzzle.controls);
        document.body.addEventListener("keydown", handleKeyDown as NeedsUpdating);

        return () => {
            document.body.removeEventListener("keydown", handleKeyDown as NeedsUpdating);
        };
    }, [puzzle]);

    useEffect(() => {
        const { unsubscribe } = attachGlobalFocusListeners({
            pageFocusOut: () => puzzle.controls.handlePageFocusOut(),
        });
        return unsubscribe;
    }, [puzzle.controls]);

    return (
        <div className={classes.mainContainer}>
            <div className={classes.sideBar}>
                <SideBar />
            </div>
            <div className={classes.canvasContainer}>
                <SVGCanvas />
                <ResizeModal />
            </div>
            <BlocklyModal />
            <ImportExportModal />
        </div>
    );
};
