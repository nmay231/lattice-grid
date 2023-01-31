import { createStyles } from "@mantine/core";
import { usePageLeave } from "@mantine/hooks";
import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BlocklyModal } from "../components/Blockly/BlocklyModal";
import { ImportExportModal } from "../components/ImportExportModal";
import { importPuzzle } from "../components/ImportExportModal/ImportExportModal";
import { SideBar } from "../components/SideBar";
import { ResizeModal } from "../components/SideBar/MainGroup/ResizeModal";
import { SVGCanvas } from "../components/SVGCanvas";
import { ControlsManager } from "../ControlsManager";
import { usePuzzle } from "../state/puzzle";
import { NeedsUpdating, PageMode } from "../types";
import { useGlobalFocusListeners } from "../utils/focusManagement";

const useGlobalEventListeners = (controls: ControlsManager) => {
    // Element focus management
    const pageFocusOut = useCallback(() => controls.handlePageFocusOut(), [controls]);
    useGlobalFocusListeners({ pageFocusOut });

    // Key binds
    useEffect(() => {
        const handleKeyDown = controls.handleKeyDown.bind(controls);
        document.body.addEventListener("keydown", handleKeyDown as NeedsUpdating);

        return () => {
            document.body.removeEventListener("keydown", handleKeyDown as NeedsUpdating);
        };
    }, [controls]);
};

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

export const PuzzlePage = ({ pageMode }: { pageMode: PageMode }) => {
    const { classes } = useStyles({ canvasWidth: "70%" });
    const puzzle = usePuzzle();
    const navigate = useNavigate();
    const { search: params } = useLocation();

    usePageLeave(puzzle.controls.onPageBlur.bind(puzzle.controls));
    useGlobalEventListeners(puzzle.controls);

    useEffect(() => {
        puzzle.settings.pageMode = pageMode;
        if (params) {
            window.setTimeout(() => {
                puzzle.settings.editMode = "answer";
                importPuzzle(puzzle, params.slice(1));
            }, 50);
        } else {
            navigate("/edit", { replace: true });
            puzzle.startUp();
        }
    }, [puzzle, pageMode, navigate, params]);

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
