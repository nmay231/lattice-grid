import { Button, Modal, Paper } from "@mantine/core";
import { useEffect, useMemo } from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { proxy, useSnapshot } from "valtio";
import { canvasSizeProxy } from "../../../state/canvasSize";
import { usePuzzle } from "../../../state/puzzle";
import { ReactComponent as SquareGridIcon } from "./SquareGridIcon.svg";

export const modalProxy = proxy({ modal: null as "resize-grid" | null });

export const ResizeModal = () => {
    const puzzle = usePuzzle();
    const buttons = useMemo(() => puzzle.grid.getCanvasResizers(), [puzzle]);
    const modalSnap = useSnapshot(modalProxy);
    const canvasSizeSnap = useSnapshot(canvasSizeProxy);

    useEffect(() => {
        if (modalSnap.modal === "resize-grid" && canvasSizeProxy.zoom !== 0) {
            canvasSizeProxy.zoom = 0;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasSizeSnap.zoom, modalSnap.modal]);

    // TODO: Give the user feedback that holding shift/ctrl scales by 5. Dependent on global focus management
    const resizer = (resize: (a: number) => void, amount: number) => (event: React.MouseEvent) => {
        const scale = event.ctrlKey || event.metaKey || event.shiftKey ? 5 : 1;
        resize(scale * amount);
        puzzle.resizeCanvas();
        puzzle.renderChange({ type: "draw", layerIds: "all" });
    };

    return (
        <Modal
            {...puzzle.controls.stopPropagation}
            opened={modalSnap.modal === "resize-grid"}
            onClose={() => {
                modalProxy.modal = null;
            }}
            style={{ position: "absolute" }}
            styles={{ overlay: { position: "absolute !important" as any } }}
            withinPortal={false}
            centered
        >
            <Paper p="lg" m="auto" style={{ display: "flex" }}>
                <div style={{ position: "relative", margin: "auto" }}>
                    <SquareGridIcon width="10em" style={{ marginBottom: "2em" }} />

                    <div style={{ position: "absolute", left: 0, top: 0 }}>
                        {buttons.map(({ name, resize, x, y, rotate }) => (
                            <div
                                key={name}
                                style={{
                                    position: "absolute",
                                    left: `${x}em`,
                                    top: `${y}em`,
                                    transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                }}
                            >
                                <Button
                                    m="xs"
                                    size="xs"
                                    p="xs"
                                    color="green"
                                    onClick={resizer(resize, 1)}
                                >
                                    <IoIosArrowUp />
                                </Button>
                                <Button
                                    size="xs"
                                    p="xs"
                                    color="orange"
                                    onClick={resizer(resize, -1)}
                                >
                                    <IoIosArrowDown />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </Paper>
        </Modal>
    );
};
