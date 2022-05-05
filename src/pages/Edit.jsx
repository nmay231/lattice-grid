import { useEffect } from "react";
import { usePuzzle } from "../atoms/puzzle";
import { SideBar } from "../components/SideBar";
import { SVGCanvas } from "../components/SVGCanvas";
import styles from "./Puzzle.module.css";

export const EditPage = () => {
    const puzzle = usePuzzle();

    useEffect(() => {
        const handleKeyDown = puzzle.controls.handleKeyDown;
        const onPageBlur = puzzle.controls.onPageBlur;
        if (handleKeyDown) {
            document.body.addEventListener("keydown", handleKeyDown);
            document.body.addEventListener("pointerleave", onPageBlur);
        }

        return () => {
            document.body.removeEventListener("keydown", handleKeyDown);
            document.body.removeEventListener("pointerleave", onPageBlur);
        };
    }, [puzzle]);

    return (
        <div className={styles.mainContainer}>
            <div
                id="canvas-container"
                className={styles.canvasContainer}
                onPointerUp={puzzle.controls.onPointerUpOutside}
            >
                <SVGCanvas />
            </div>

            <div className={styles.divider}></div>
            <div className={styles.sideBar}>
                <SideBar />
            </div>
        </div>
    );
};
