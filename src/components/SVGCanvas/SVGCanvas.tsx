import { createStyles, ScrollArea } from "@mantine/core";
import React, { useEffect, useRef } from "react";
import { useProxy } from "valtio/utils";
import { PuzzleManager } from "../../PuzzleManager";
import { canvasSizeProxy, CANVAS_CONTAINER_ID } from "../../state/canvasSize";
import { usePuzzle } from "../../state/puzzle";
import { notify } from "../../utils/notifications";
import { sidebarProxy, smallPageWidth } from "../SideBar/sidebarProxy";

const Inner = React.memo(function Inner(arg: Pick<PuzzleManager, "layers" | "SVGGroups">) {
    const { layers: layersProxy, SVGGroups: SVGGroupProxy } = arg;
    const layers = useProxy(layersProxy);
    const { minX, minY, width, height } = useProxy(canvasSizeProxy);
    const SVGGroups = useProxy(SVGGroupProxy);

    return (
        <svg viewBox={`${minX} ${minY} ${width} ${height}`}>
            {layers.order.flatMap((id) => {
                // TODO: Allow question and answer to be reordered. Also fix this monstrosity.
                const question = SVGGroups[`${id}-question`].flatMap((group) => {
                    const prefix = `${id}-question-${group.id}`;
                    return [...group.elements.entries()].map(([id, element]) =>
                        React.createElement(group.type, {
                            ...element,
                            key: `${prefix}-${id}`,
                        }),
                    );
                });
                const answer = SVGGroups[`${id}-answer`].flatMap((group) => {
                    const prefix = `${id}-answer-${group.id}`;
                    return [...group.elements.entries()].map(([id, element]) =>
                        React.createElement(group.type, {
                            ...element,
                            key: `${prefix}-${id}`,
                        }),
                    );
                });
                return question.concat(answer);
            })}
        </svg>
    );
});

type Arg1 = { smallPageWidth: string; sidebarOpened: boolean };
const useStyles = createStyles((theme, { smallPageWidth, sidebarOpened }: Arg1) => ({
    scrollArea: {
        display: "flex",
        flexDirection: "column",
        height: "100svh",
        width: "100svw",
        overflow: "auto",
        [`@media (min-width: ${smallPageWidth})`]: {
            width: sidebarOpened ? "70svw" : "100svw",
            transition: "width 0.4s",
        },
    },
    outerContainer: {
        // Remember, if I change box-sizing back to content-box, I will have to update my zoom in/out code.
        // boxSizing: "border-box",
        margin: "0px auto",
        padding: "2em",
        touchAction: "none",
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorY: "none",
    },
    innerContainer: {
        "--canvas-zoom": 0.0,
        border: "1px dotted grey",
        margin: "0px",
        padding: "0px",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent", // Remove image highlight when drawing on mobile Chrome
    },
}));

// TODO: Add dependency injection so it can be used in color swatches, resize modal, etc.
export const SVGCanvas = React.memo(function SVGCanvas() {
    const { opened } = useProxy(sidebarProxy);
    const { classes } = useStyles({ smallPageWidth, sidebarOpened: opened });

    const { controls, layers, SVGGroups } = usePuzzle();
    const { width } = useProxy(canvasSizeProxy);

    const scrollArea = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const current = scrollArea.current;
        if (!current) {
            throw notify.error({ message: "Canvas element not found." });
        }

        const onWheel = controls.onWheel.bind(controls);
        current.addEventListener("wheel", onWheel, { passive: false });

        return () => {
            current.removeEventListener("wheel", onWheel);
        };
    }, [controls]);

    // TODO: I forgot that width should include the padding of the outerContainer (b/c box-sizing: border-box) and the border of the innerContainer. Right now, it only includes the width of the svg by itself.
    const zoom = "var(--canvas-zoom)";
    // Set the canvas width to the interpolation between the real size and the shrunk to 100%
    const canvasWidth = `calc(${zoom} * ${width}px + (1 - ${zoom}) * 100%)`;

    return (
        <ScrollArea type="always" className={classes.scrollArea} viewportRef={scrollArea}>
            <div
                id={CANVAS_CONTAINER_ID}
                className={classes.outerContainer}
                style={{ width: canvasWidth, maxWidth: `${width}px` }}
            >
                <div className={classes.innerContainer} {...controls.eventListeners}>
                    <Inner layers={layers} SVGGroups={SVGGroups} />
                </div>
            </div>
        </ScrollArea>
    );
});
