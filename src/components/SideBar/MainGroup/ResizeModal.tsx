import { Button, Modal, Paper } from "@mantine/core";
import { atom, useAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { canvasSizeAtom } from "../../../atoms/canvasSize";
import { usePuzzle } from "../../../atoms/puzzle";
import { ReactComponent as SquareGridIcon } from "./SquareGridIcon.svg";

export const resizeModalAtom = atom(false);

export const ResizeModal = () => {
    const puzzle = usePuzzle();
    const buttons = useMemo(() => puzzle.grid.getCanvasResizers(), [puzzle]);
    const [show, setShow] = useAtom(resizeModalAtom);
    const [canvasSize, setCanvasSize] = useAtom(canvasSizeAtom);

    useEffect(() => {
        if (show && canvasSize.zoom !== 0) {
            setCanvasSize({ ...canvasSize, zoom: 0 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasSize, show]);

    const resizer = (resize: (a: number) => void, amount: number) => () => {
        resize(amount);
        puzzle.resizeCanvas();
        puzzle.renderChange({ type: "draw", layerIds: "all" });
    };

    return (
        <Modal
            {...puzzle.controls.stopPropagation}
            opened={show}
            onClose={() => setShow(!show)}
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
