import { usePageLeave } from "@mantine/hooks";
import { clsx } from "clsx";
import { useCallback, useEffect } from "react";
import { useProxy } from "valtio/utils";
import { ControlsManager } from "../ControlsManager";
import type { PuzzleManager } from "../PuzzleManager";
import { DebugPointers } from "../components/DebugPointers";
import { ImportExportModal } from "../components/ImportExportModal";
import {
    MobileControlsActual,
    MobileControlsMetaControls,
    mobileControlsProxy,
} from "../components/MobileControls";
import { useResizeObserver } from "../components/MobileControls/mobileControlsProxy";
import { SVGCanvas } from "../components/SVGCanvas/SVGCanvas";
import { SideBar, UtilityBar } from "../components/SideBar";
import { ResizeModal } from "../components/SideBar/MainGroup/ResizeModal";
import { sidebarProxy } from "../components/SideBar/sidebarProxy";
import { ModalEditPuzzleList } from "../components/modals/ModalEditPuzzleList";
import { NeedsUpdating } from "../types";
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
export const PuzzlePage = ({ puzzle }: { puzzle: PuzzleManager }) => {
    usePageLeave(puzzle.controls.onPageBlur.bind(puzzle.controls));
    useGlobalEventListeners(puzzle.controls);
    useResizeObserver();

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
                <SideBar puzzle={puzzle} />
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
                    <MobileControlsMetaControls puzzle={puzzle} />
                </div>
                <SVGCanvas puzzle={puzzle} />
                <div
                    style={{
                        marginBottom: mobileControls.opened ? "0%" : "-100%",
                    }}
                >
                    <MobileControlsActual puzzle={puzzle} />
                </div>
            </div>

            <DebugPointers puzzle={puzzle} />

            <ResizeModal puzzle={puzzle} />
            <ImportExportModal puzzle={puzzle} />
            <ModalEditPuzzleList puzzle={puzzle} />
        </div>
    );
};
