import { ScrollArea } from "@mantine/core";
import { clsx } from "clsx";
import React, { useEffect, useRef } from "react";
import { useProxy } from "valtio/utils";
import { PuzzleManager } from "../../PuzzleManager";
import layerStyles from "../../layers/layers.module.css";
import { CANVAS_CONTAINER_ID, canvasSizeProxy } from "../../state/canvasSize";
import { usePuzzle } from "../../state/puzzle";
import { notify } from "../../utils/notifications";
import styles from "./SVGCanvas.module.css";

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
                    const mainKey = `${id}-question-${group.id}`;
                    const className = `${group.className ?? ""} ${layerStyles.question}`;
                    return (
                        <g className={className} key={mainKey}>
                            {[...group.elements.entries()].map(([id, element]) =>
                                React.createElement(group.type, {
                                    ...element,
                                    key: `${mainKey}-${id}`,
                                }),
                            )}
                        </g>
                    );
                });
                const answer = SVGGroups[`${id}-answer`].flatMap((group) => {
                    const mainKey = `${id}-answer-${group.id}`;
                    const className = `${group.className ?? ""} ${layerStyles.answer}`;
                    return (
                        <g className={className} key={mainKey}>
                            {[...group.elements.entries()].map(([id, element]) =>
                                React.createElement(group.type, {
                                    ...element,
                                    key: `${mainKey}-${id}`,
                                }),
                            )}
                        </g>
                    );
                });
                return question.concat(answer);
            })}
        </svg>
    );
});

// TODO: Add dependency injection so it can be used in color swatches, resize modal, etc.
export const SVGCanvas = React.memo(function SVGCanvas() {
    const { controls, layers, SVGGroups, settings } = usePuzzle();
    const { width } = useProxy(canvasSizeProxy);
    const { editMode } = useProxy(settings);

    const scrollArea = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const current = scrollArea.current;
        if (!current) {
            throw notify.error({ message: "Canvas element not found.", timeout: 4000 });
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
        <ScrollArea
            type="always"
            offsetScrollbars // Fixes glitchy resizing when toggling mobile controls
            className={styles.scrollArea}
            viewportRef={scrollArea}
        >
            <div
                id={CANVAS_CONTAINER_ID}
                className={styles.outerContainer}
                style={{ width: canvasWidth, maxWidth: `${width}px` }}
            >
                <div
                    className={clsx(styles.innerContainer, layerStyles[`mode-${editMode}`])}
                    {...controls.eventListeners}
                >
                    <Inner layers={layers} SVGGroups={SVGGroups} />
                </div>
            </div>
        </ScrollArea>
    );
});
