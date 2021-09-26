import { useEffect, useState, useRef } from "react";
import { PuzzleManager } from "./logic/PuzzleManager";
import styles from "./App.module.css";
import { SideBar } from "./components/SideBar";
import { useStore, useDispatch } from "react-redux";
import { setBorderPadding } from "./redux/actions";

export const App = () => {
    const canvas = useRef();
    const [puzzle, setPuzzle] = useState(null);
    const store = useStore();
    const dispatch = useDispatch();

    useEffect(() => {
        setPuzzle(new PuzzleManager(canvas.current, store));
    }, [store]);

    return (
        <div className={styles.mainContainer}>
            <div className={styles.canvasContainer}>
                <canvas
                    className={styles.canvas}
                    ref={canvas}
                    /* Is this a security vulnerability? I don't know. I don't case right now */
                    {...puzzle?.eventListeners}
                ></canvas>
            </div>

            <div className={styles.divider}></div>
            <div className={styles.sideBar}>
                {puzzle && <SideBar puzzle={puzzle} />}
                <button onClick={() => dispatch(setBorderPadding(50))}>
                    Change padding
                </button>
            </div>
        </div>
    );
};
