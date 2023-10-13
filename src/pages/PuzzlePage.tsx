import { usePageLeave } from "@mantine/hooks";
import { clsx } from "clsx";
import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProxy } from "valtio/utils";
import { ControlsManager } from "../ControlsManager";
import { BlocklyModal } from "../components/Blockly/BlocklyModal";
import { DebugPointers } from "../components/DebugPointers";
import { ImportExportModal } from "../components/ImportExportModal";
import { importPuzzle } from "../components/ImportExportModal/importPuzzle";
import {
    MobileControlsActual,
    MobileControlsMetaControls,
    mobileControlsProxy,
} from "../components/MobileControls";
import { SVGCanvas } from "../components/SVGCanvas/SVGCanvas";
import { SideBar, UtilityBar } from "../components/SideBar";
import { ResizeModal } from "../components/SideBar/MainGroup/ResizeModal";
import { sidebarProxy } from "../components/SideBar/sidebarProxy";
import { usePuzzle } from "../state/puzzle";
import { NeedsUpdating, PageMode } from "../types";
import { useGlobalFocusListeners } from "../utils/focusManagement";
import styles from "./PuzzlePage.module.css";

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

export const PuzzlePage = ({ pageMode }: { pageMode: PageMode }) => {
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

    return (
        <div
            className={clsx(
                styles.mainContainer,
                !sidebar.opened && styles.mainContainerSidebarClosed,
            )}
        >
            <div className={clsx(styles.sidebar)}>
                <UtilityBar />
                <SideBar />
            </div>
            <div
                className={clsx(
                    styles.mainContent,
                    !mobileControls.opened && styles.mainContentNoMobileControls,
                )}
            >
                <div
                    style={{
                        marginTop: mobileControls.opened ? "0%" : "-100%",
                    }}
                >
                    <MobileControlsMetaControls />
                </div>
                <SVGCanvas />
                <div
                    style={{
                        marginBottom: mobileControls.opened ? "0%" : "-100%",
                    }}
                >
                    <MobileControlsActual />
                </div>
            </div>

            <DebugPointers />

            <ResizeModal />
            <BlocklyModal />
            <ImportExportModal />
        </div>
    );
};
