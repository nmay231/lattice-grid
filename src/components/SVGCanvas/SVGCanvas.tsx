import { createStyles, ScrollArea } from "@mantine/core";
import { useEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { blitGroupsProxy } from "../../state/blits";
import { canvasSizeProxy } from "../../state/canvasSize";
import { usePuzzle } from "../../state/puzzle";
import { BlitGroup, Layer, NeedsUpdating, StorageMode } from "../../types";
import { errorNotification } from "../../utils/DOMUtils";
import { sidebarProxy } from "../SideBar/SideBar";
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

const useStyles = createStyles((theme, { sidebarOpened }: { sidebarOpened: boolean }) => ({
    scrollArea: {
        display: "flex",
        flexDirection: "column",
        height: "100svh",
        width: sidebarOpened ? "70svw" : "100svw",
        transition: "width 0.4s",
        overflow: "auto",
    },
    outerContainer: {
        // Remember, if I change box-sizing back to content-box, I will have to update my zoom in/out code.
        boxSizing: "border-box",
        margin: "0px auto",
        padding: "2em",
        touchAction: "none",
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorY: "none",
    },
    innerContainer: {
        border: "1px dotted grey",
        margin: "0px",
        padding: "0px",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent", // Remove image highlight when drawing on mobile Chrome
    },
}));

export const SVGCanvas = () => {
    const { opened } = useSnapshot(sidebarProxy);
    const { classes } = useStyles({ sidebarOpened: opened });

    const { controls, layers } = usePuzzle();
    const blitGroupsSnap = useSnapshot(blitGroupsProxy);
    const snap = useSnapshot(layers);
    const { minX, minY, width, height, zoom } = useSnapshot(canvasSizeProxy);

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
    const fullScreen = `${Math.round(100 * (1 - zoom))}%`;
    const realSize = `${Math.round(zoom * width)}px`;
    // Set the canvas width to the interpolation between fullScreen and realSize
    const canvasWidth = `calc(${fullScreen} + ${realSize})`;

    return (
        <ScrollArea type="always" className={classes.scrollArea} ref={scrollArea}>
            <div
                className={classes.outerContainer}
                style={{ width: canvasWidth, maxWidth: `${width}px` }}
            >
                <div className={classes.innerContainer} {...controls.eventListeners}>
                    <svg viewBox={`${minX} ${minY} ${width} ${height}`}>
                        {snap.order.flatMap((id) => {
                            // TODO: Allow question and answer to be reordered. Also fix this monstrosity.
                            const question = blitList({
                                groups: blitGroupsSnap[`${id}-question`] || [],
                                layerId: id,
                                storageMode: "question",
                            });
                            const answer = blitList({
                                groups: blitGroupsSnap[`${id}-answer`] || [],
                                layerId: id,
                                storageMode: "answer",
                            });
                            return question.concat(answer);
                        })}
                    </svg>
                </div>
            </div>
        </ScrollArea>
    );
};
