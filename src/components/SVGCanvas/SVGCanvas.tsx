import { useAtomValue } from "jotai";
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
    const { minX, minY, width, height } = useAtomValue(canvasSizeAtom);

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
    );
};
