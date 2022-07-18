import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { blitsAtom } from "../../atoms/blits";
import { canvasSizeAtom } from "../../atoms/canvasSize";
import { layersAtom } from "../../atoms/layers";
import { usePuzzle } from "../../atoms/puzzle";
import { Line } from "./Line";
import { Polygon } from "./Polygon";
import styling from "./SVGCanvas.module.css";
import { Text } from "./Text";

const blitters = {
    polygon: Polygon,
    line: Line,
    text: Text,
} as const;

export const SVGCanvas = () => {
    const controls = usePuzzle().controls;
    const blitGroups = useAtomValue(blitsAtom);
    const layers = useAtomValue(layersAtom).layers;
    const { minX, minY, width, height, zoom } = useAtomValue(canvasSizeAtom);

    const scrollArea = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const current = scrollArea.current;
        if (!current) throw Error("wut?");
        current.addEventListener("wheel", controls.onWheel, {
            passive: false,
        });

        return () => {
            current.removeEventListener("wheel", controls.onWheel);
        };
    }, [controls]);

    // TODO: I forgot that width should include the padding of the outerContainer (b/c box-sizing: border-box) and the border of the innerContainer. Right now, it only includes the width of the svg by itself.
    const fullScreen = `${Math.round(100 * (1 - zoom))}%`;
    const realSize = `${Math.round(zoom * width)}px`;
    // Set the canvas width to the interpolation between fullScreen and realSize
    const canvasWidth = `calc(${fullScreen} + ${realSize})`;

    return (
        <div className={styling.scrollArea} ref={scrollArea}>
            <div
                className={styling.outerContainer}
                style={{ width: canvasWidth, maxWidth: `${width}px` }}
            >
                <div
                    className={styling.innerContainer}
                    {...controls.eventListeners}
                >
                    <svg viewBox={`${minX} ${minY} ${width} ${height}`}>
                        {layers.flatMap(({ id }) =>
                            blitGroups[id].map((group) => {
                                const Blitter = blitters[group.blitter];
                                return (
                                    <Blitter
                                        blits={group.blits}
                                        // I was hoping typescript would be smarter...
                                        style={group.style as any}
                                        key={id + group.id}
                                    />
                                );
                            }),
                        )}
                    </svg>
                </div>
            </div>
        </div>
    );
};
