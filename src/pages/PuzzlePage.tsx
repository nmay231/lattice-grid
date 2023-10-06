import { createStyles } from "@mantine/core";
import { usePageLeave } from "@mantine/hooks";
import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProxy } from "valtio/utils";
import { ControlsManager } from "../ControlsManager";
import { importPuzzle } from "../components/ImportExportModal/importPuzzle";
import {
    MobileControlsActual,
    MobileControlsMetaControls,
    mobileControlsProxy,
} from "../components/MobileControls";
import { SVGCanvasNew } from "../components/SVGCanvas/SVGCanvas";
import { SideBarMain, SideBarUtilityBar } from "../components/SideBar/SideBar";
import { sidebarProxy } from "../components/SideBar/sidebarProxy";
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
    mainContainer: {
        width: "100svw",
        height: "100svh",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows:
            "[page-top] 0px [invisible-top] auto [sidebar-top] auto [meta-controls-bottom] 1fr [controls-top] auto [invisible-bottom] 0px [page-bottom]",
        gridTemplateColumns:
            "[page-left] 0px [invisible-left] minmax(30svw, auto) [sidebar-right] 1fr [page-right]",
        gap: "10px",
        backgroundColor: "purple",
        "& > *": {
            backgroundColor: "white",
        },
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

    const mobileControls = useProxy(mobileControlsProxy);
    const sidebar = useProxy(sidebarProxy);
    const sidebarRight = sidebar.opened ? "sidebar-right" : "invisible-left";
    const metaControlsBottom = mobileControls.opened ? "meta-controls-bottom" : "invisible-top";
    const controlsTop = mobileControls.opened ? "controls-top" : "invisible-bottom";

    return (
        <div className={classes.mainContainer}>
            <SideBarUtilityBar gridArea={`page-top / page-left / sidebar-top / ${sidebarRight}`} />
            <SideBarMain gridArea={`sidebar-top / page-left / page-bottom / ${sidebarRight}`} />
            <SVGCanvasNew
                gridArea={`${metaControlsBottom} / ${sidebarRight} / ${controlsTop} / page-right`}
            />
            <MobileControlsMetaControls
                gridArea={`page-top / ${sidebarRight} / ${metaControlsBottom} / page-right`}
            />
            <MobileControlsActual
                gridArea={`${controlsTop} / ${sidebarRight} / page-bottom / page-right`}
            />
            {/* <div
                style={{ gridArea: "page-top / page-left / meta-controls-bottom / sidebar-right" }}
            >
                SideBarUtilityBar
            </div>
            <div
                style={{
                    gridArea: "meta-controls-bottom / page-left / page-bottom / sidebar-right",
                }}
            >
                SideBarMain
            </div>
            <div
                style={{
                    gridArea: "meta-controls-bottom / sidebar-right / controls-top / page-right",
                }}
            >
                SVGCanvasNew
            </div>
            <div
                style={{ gridArea: "page-top / sidebar-right / meta-controls-bottom / page-right" }}
            >
                MobileControlsMetaControls
            </div>
            <div style={{ gridArea: "controls-top / sidebar-right / page-bottom / page-right" }}>
                MobileControlsActual
            </div> */}

            {/* <div
                className={cx(
                    classes.canvasContainer,
                    mobileControlsOpened && classes.canvasContainerOpened,
                )}
            ></div> */}
            {/* {mobileControlsEnabled &&  */}
            {/* } */}
            {/* <DebugPointers /> */}

            {/* TODO: Originally, the resize modal was designed to be inside the area of the svg canvas. Should I fix that, or leave it be and remove the useless code... */}
            {/* <ResizeModal />
            <BlocklyModal />
            <ImportExportModal /> */}
        </div>
    );
};
