import { useEffect, useState } from "react";
import { useSelector, useStore } from "react-redux";
import { ModalManager } from "../components/ModalManager";
import { SideBar } from "../components/SideBar";
import { SVGCanvas } from "../components/SVGCanvas";
import { PuzzleManager } from "../logic/PuzzleManager";
import styles from "./Puzzle.module.css";

export const EditPage = () => {
    const [puzzle, setPuzzle] = useState(null);
    const isOpen = useSelector((state) => state.modal.isOpen);
    const store = useStore();

    useEffect(() => {
        setPuzzle(new PuzzleManager(store));
    }, [store]);

    useEffect(() => {
        const body = document.querySelector("body");
        const handleKeyDown = puzzle?.controls?.handleKeyDown;
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
                onPointerUp={puzzle?.controls?.onPointerUpOutside}
            >
                {puzzle && <SVGCanvas controls={puzzle.controls} />}
            </div>

            <div className={styles.divider}></div>
            <div className={styles.sideBar}>
                {puzzle && <SideBar puzzle={puzzle} />}
            </div>
            {isOpen && <ModalManager />}
        </div>
    );
};
