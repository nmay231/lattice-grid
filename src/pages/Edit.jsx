import { useEffect } from "react";
import { useSelector } from "react-redux";
import { ModalManager } from "../components/ModalManager";
import { usePuzzle } from "../components/PuzzleContext/PuzzleContext";
import { SideBar } from "../components/SideBar";
import { SVGCanvas } from "../components/SVGCanvas";
import styles from "./Puzzle.module.css";

export const EditPage = () => {
    const isOpen = useSelector((state) => state.modal.isOpen);
    const puzzle = usePuzzle();

    useEffect(() => {
        const body = document.querySelector("body");
        const handleKeyDown = puzzle.controls.handleKeyDown;
        if (handleKeyDown && !isOpen) {
            body.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            body.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, puzzle]);

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
            {isOpen && <ModalManager />}
        </div>
    );
};
