import { useEffect, useState } from "react";
import { useStore } from "react-redux";

import styles from "./App.module.css";
import { SVGCanvas } from "./components/SVGCanvas";
import { SideBar } from "./components/SideBar";
import { PuzzleManager } from "./logic/PuzzleManager";

export const App = () => {
    const [puzzle, setPuzzle] = useState(null);
    const store = useStore();

    useEffect(() => {
        setPuzzle(new PuzzleManager(store));
    }, [store]);

    return (
        <div className={styles.mainContainer}>
            <div className={styles.canvasContainer}>
                {puzzle && <SVGCanvas controls={puzzle.controls} />}
            </div>

            <div className={styles.divider}></div>
            <div className={styles.sideBar}>
                {puzzle && <SideBar puzzle={puzzle} />}
            </div>
        </div>
    );
};
