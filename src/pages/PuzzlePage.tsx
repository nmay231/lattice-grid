import { createStyles } from "@mantine/core";
import { usePageLeave } from "@mantine/hooks";
import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ControlsManager } from "../ControlsManager";
import { BlocklyModal } from "../components/Blockly/BlocklyModal";
import { DebugPointers } from "../components/DebugPointers";
import { ImportExportModal } from "../components/ImportExportModal";
import { importPuzzle } from "../components/ImportExportModal/importPuzzle";
import { SVGCanvas } from "../components/SVGCanvas";
import { SideBar } from "../components/SideBar";
import { ResizeModal } from "../components/SideBar/MainGroup/ResizeModal";
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

const useStyles = createStyles({
    container: {
        width: "100svw",
        height: "100svh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
    },
});

export const PuzzlePage = ({ pageMode }: { pageMode: PageMode }) => {
    const { classes } = useStyles();
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
        <div className={classes.container}>
            <SideBar />
            <SVGCanvas />
            <DebugPointers />

            {/* TODO: Originally, the resize modal was designed to be inside the area of the svg canvas. Should I fix that, or leave it be and remove the useless code... */}
            <ResizeModal />
            <BlocklyModal />
            <ImportExportModal />
        </div>
    );
};
