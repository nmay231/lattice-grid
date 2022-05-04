import { useMemo } from "react";
import { PuzzleManager } from "../../../logic/PuzzleManager";
import { usePuzzle } from "../../PuzzleContext";

export const ResizeGridButton = () => {
    const puzzle = usePuzzle() as any as PuzzleManager;

    // TODO: For placing the button on an overlay over the grid:
    // buttonX = (x + settings.borderPadding) * (svg.height / grid.height) + target.left

    const buttons = useMemo(() => puzzle.grid.getCanvasResizers(), [puzzle]);
    const redraw = () => {
        puzzle.resizeCanvas();
        puzzle.redrawScreen();
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
            }}
        >
            {buttons.map(({ name, resize }) => (
                <div key={name}>
                    <label htmlFor={name}>{name}:</label>
                    <button
                        id={name}
                        onClick={() => {
                            resize(-1);
                            redraw();
                        }}
                    >
                        Shrink
                    </button>
                    <button
                        id={name}
                        onClick={() => {
                            resize(1);
                            redraw();
                        }}
                    >
                        Grow
                    </button>
                </div>
            ))}
        </div>
    );
};