import React from "react";
import { useSelector } from "react-redux";
import { Line } from "./Line";
import { Polygon } from "./Polygon";
import styling from "./SVGCanvas.module.css";
import { Text } from "./Text";

const blitters = {
    polygon: Polygon,
    line: Line,
    text: Text,
};

export const SVGCanvas = ({ controls }) => {
    const blitGroups = useSelector((state) => state.blits.groups);

    const minX = useSelector((state) => state.puzzle.minX);
    const minY = useSelector((state) => state.puzzle.minY);
    const width = useSelector((state) => state.puzzle.width);
    const height = useSelector((state) => state.puzzle.height);

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
                {blitGroups.map(
                    ({ blitter: blitterKey, blits, style }, index) => {
                        const Blitter = blitters[blitterKey];
                        // TODO: Change this from index
                        return (
                            <Blitter blits={blits} style={style} key={index} />
                        );
                    }
                )}
            </svg>
        </div>
    );
};
