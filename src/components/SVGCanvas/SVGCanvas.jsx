import React from "react";
import { useSelector } from "react-redux";
import { usePuzzle } from "../PuzzleContext/PuzzleContext";
import { Line } from "./Line";
import { Polygon } from "./Polygon";
import styling from "./SVGCanvas.module.css";
import { Text } from "./Text";

const blitters = {
    polygon: Polygon,
    line: Line,
    text: Text,
};

export const SVGCanvas = () => {
    const controls = usePuzzle().controls;
    const blitGroups = useSelector((state) => state.blits.groups);
    const renderOrder = useSelector((state) => state.blits.renderOrder);

    const minX = useSelector((state) => state.puzzle.minX);
    const minY = useSelector((state) => state.puzzle.minY);
    const width = useSelector((state) => state.puzzle.width);
    const height = useSelector((state) => state.puzzle.height);

    // TODO: As neat as staying in a square is, I'll probably need to switch to using a scrollbar since users can have multiple grids and I shouldn't break users expectations...
    return (
        <div
            className={styling.svgContainer}
            style={{
                width: `min(80vw, ${width}/${height}*100vh)`,
                height: `min(100vh, ${height}/${width}*80vw)`,
            }}
        >
            <svg
                {...controls.eventListeners}
                className={styling.svg}
                viewBox={`${minX} ${minY} ${width} ${height}`}
            >
                {renderOrder.map((id) => {
                    const {
                        blitter: blitterKey,
                        blits,
                        style,
                    } = blitGroups[id];
                    const Blitter = blitters[blitterKey];
                    return <Blitter blits={blits} style={style} key={id} />;
                })}
            </svg>
        </div>
    );
};
