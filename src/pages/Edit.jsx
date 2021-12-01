import { useEffect, useState } from "react";
import { useStore } from "react-redux";
import { KeepingTabs } from "../components/KeepingTabs";
import { SideBar } from "../components/SideBar";
import { SVGCanvas } from "../components/SVGCanvas";
import { PuzzleManager } from "../logic/PuzzleManager";
import styles from "./Puzzle.module.css";

export const EditPage = () => {
    const [puzzle, setPuzzle] = useState(null);
    const store = useStore();

    useEffect(() => {
        setPuzzle(new PuzzleManager(store));
    }, [store]);

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
                {puzzle && (
                    <KeepingTabs
                        interpretKeyDown={puzzle.controls.interpretKeyDown}
                    />
                )}
            </div>
        </div>
    );
};
