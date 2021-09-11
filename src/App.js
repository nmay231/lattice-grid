import { useEffect, useState, useRef } from "react";
import { PuzzleManager } from "./logic/PuzzleManager";

export const App = () => {
    const canvas = useRef();
    const [puzzle, setPuzzle] = useState(null);

    useEffect(() => {
        setPuzzle(new PuzzleManager(canvas.current));
    }, []);

    return (
        <div id="main-container">
            <canvas ref={canvas}></canvas>
        </div>
    );
};
