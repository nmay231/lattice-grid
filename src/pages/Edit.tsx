import { usePageLeave } from "@mantine/hooks";
import { useEffect } from "react";
import { BlocklyModal } from "../components/Blockly/BlocklyModal";
import { ImportExportModal } from "../components/ImportExportModal";
import { SideBar } from "../components/SideBar";
import { ResizeModal } from "../components/SideBar/MainGroup/ResizeModal";
import { SVGCanvas } from "../components/SVGCanvas";
import { usePuzzle } from "../state/puzzle";
import { NeedsUpdating } from "../types";
import styles from "./Puzzle.module.css";

export const EditPage = () => {
    const puzzle = usePuzzle();
    usePageLeave(puzzle.controls.onPageBlur.bind(puzzle.controls));

    useEffect(() => {
        const handleKeyDown = puzzle.controls.handleKeyDown.bind(puzzle.controls);
        document.body.addEventListener("keydown", handleKeyDown as NeedsUpdating);

        return () => {
            document.body.removeEventListener("keydown", handleKeyDown as NeedsUpdating);
        };
    }, [puzzle]);

    // TODO: This won't be necessary with mantine.onClickOutside
    const onOutside = puzzle.controls.onPointerUpOutside.bind(puzzle.controls);
    return (
        <div className={styles.mainContainer}>
            <div className={styles.sideBar}>
                <SideBar />
            </div>
            <div id="canvas-container" className={styles.canvasContainer} onPointerUp={onOutside}>
                <SVGCanvas />
                <ResizeModal />
            </div>
            <BlocklyModal />
            <ImportExportModal />
        </div>
    );
};
