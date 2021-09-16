import { useEffect, useState, useRef } from "react";
import { PuzzleManager } from "./logic/PuzzleManager";
import styles from "./App.module.css";

export const App = () => {
    const canvas = useRef();
    const [puzzle, setPuzzle] = useState(null);

    useEffect(() => {
        setPuzzle(new PuzzleManager(canvas.current));
    }, []);

    return (
        <div id="main-container" className={styles["main-container"]}>
            <canvas className={styles.canvas} ref={canvas}></canvas>
        </div>
    );
};
