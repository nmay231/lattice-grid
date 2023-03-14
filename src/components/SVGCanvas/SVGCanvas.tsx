import { createStyles, ScrollArea } from "@mantine/core";
import React, { useEffect, useRef } from "react";
import { useProxy } from "valtio/utils";
import { PuzzleManager } from "../../PuzzleManager";
import { blitGroupsProxy } from "../../state/blits";
import { canvasSizeProxy, CANVAS_CONTAINER_ID } from "../../state/canvasSize";
import { usePuzzle } from "../../state/puzzle";
import { BlitGroup, Layer, NeedsUpdating, StorageMode } from "../../types";
import { errorNotification } from "../../utils/DOMUtils";
import { sidebarProxy, smallPageWidth } from "../SideBar/sidebarProxy";
import { Line } from "./Line";
import { Polygon } from "./Polygon";
import { Text } from "./Text";

const blitters = {
    polygon: Polygon,
    line: Line,
    text: Text,
} as const;

const blitList = ({
    groups,
    layerId,
    storageMode,
}: {
    groups: BlitGroup[];
    layerId: Layer["id"];
    storageMode: StorageMode;
}) => {
    return groups.map((group) => {
        const Blitter = blitters[group.blitter];
        return (
            <Blitter
                // I was hoping typescript would be smarter...
                blits={group.blits as NeedsUpdating}
                style={group.style as NeedsUpdating}
                key={`${layerId}-${storageMode}-${group.id}`}
            />
        );
    });
};

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

const Inner = React.memo(function Inner({ layers: layersProxy }: Pick<PuzzleManager, "layers">) {
    const layers = useProxy(layersProxy);
    const { minX, minY, width, height } = useProxy(canvasSizeProxy);
    const blitGroups = useProxy(blitGroupsProxy);

    return (
        <svg viewBox={`${minX} ${minY} ${width} ${height}`}>
            {layers.order.flatMap((id) => {
                // TODO: Allow question and answer to be reordered. Also fix this monstrosity.
                const question = blitList({
                    groups: blitGroups[`${id}-question`] || [],
                    layerId: id,
                    storageMode: "question",
                });
                const answer = blitList({
                    groups: blitGroups[`${id}-answer`] || [],
                    layerId: id,
                    storageMode: "answer",
                });
                return question.concat(answer);
            })}
        </svg>
    );
});

export const SVGCanvas = React.memo(function SVGCanvas() {
    const { opened } = useProxy(sidebarProxy);
    const { classes } = useStyles({ smallPageWidth, sidebarOpened: opened });

    const { controls, layers } = usePuzzle();
    const { width } = useProxy(canvasSizeProxy);

    const scrollArea = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const current = scrollArea.current;
        if (!current) {
            throw errorNotification({ error: null, message: "Canvas element not found." });
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
                    <Inner layers={layers} />
                </div>
            </div>
        </ScrollArea>
    );
});
