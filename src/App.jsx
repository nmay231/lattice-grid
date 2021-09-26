import { useEffect, useState, useRef } from "react";
import { useStore, useDispatch } from "react-redux";

import styles from "./App.module.css";
import { SVGCanvas } from "./components/SVGCanvas";
import { SideBar } from "./components/SideBar";
import { PuzzleManager } from "./logic/PuzzleManager";
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
                <SVGCanvas />
                {/* <canvas
                    className={styles.canvas}
                    ref={canvas}
                    {...puzzle?.eventListeners}
                ></canvas> */}
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
