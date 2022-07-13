import { usePageLeave } from "@mantine/hooks";
import { useEffect } from "react";
import { usePuzzle } from "../atoms/puzzle";
import { BlocklyModal } from "../components/Blockly/BlocklyModal";
import { SideBar } from "../components/SideBar";
import { SVGCanvas } from "../components/SVGCanvas";
import styles from "./Puzzle.module.css";

export const EditPage = () => {
    const puzzle = usePuzzle();
    usePageLeave(puzzle.controls.onPageBlur);

    useEffect(() => {
        const handleKeyDown = puzzle.controls.handleKeyDown;
        document.body.addEventListener("keydown", handleKeyDown as any);

        return () => {
            document.body.removeEventListener("keydown", handleKeyDown as any);
        };
    }, [puzzle]);

    return (
        <div className={styles.mainContainer}>
            <div className={styles.sideBar}>
                <SideBar />
            </div>
            <div
                id="canvas-container"
                className={styles.canvasContainer}
                onPointerUp={puzzle.controls.onPointerUpOutside}
            >
                <SVGCanvas />
            </div>
            <BlocklyModal />
        </div>
    );
};
