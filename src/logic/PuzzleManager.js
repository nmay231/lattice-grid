/* TODO: Convert what's possible to typescript later. It's too annoying to do that now when I just need to iterate quickly. */
import { CellOutlineLayer, SelectionLayer } from "./layers";
import { MasterBlitter } from "./blitters";
import { SquareGrid } from "./grids/SquareGrid";

export class PuzzleManager {
    settings;
    // TODO: Also store default render layers 1-9 so that if a user reorders some layers, new layers still are inserted in a reasonable spot according to their defaultRenderOrder
    currentLayer;
    layers = [new CellOutlineLayer(), new SelectionLayer()];
    canvas;
    ctx;
    grid;
    blitter;
    eventListeners;

    // TODO: This should not just change to handle multiPoint objects, but also for selecting existing objects
    currentPoint = null;

    constructor(canvas) {
        this.settings = new Settings();
        this.grid = new SquareGrid(this.settings, { width: 10, height: 10 });

        // TODO: Account for window width/height when getting these values
        const { width, height } = this.grid.getCanvasRequirements();
        canvas.width = width;
        canvas.height = height;

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.blitter = new MasterBlitter(this.ctx, this.grid);
        this.initializeGrid();
        this.blitter.blitToCanvas(this.layers, this.settings, {});

        this.eventListeners = {
            onPointerDown: this.onPointerDown.bind(this),
            // onPointerUp: this.onPointerUp.bind(this),
            // onPointerMove: this.onPointerMove.bind(this),
        };

        // TODO
        this.currentLayer = this.layers[0];
    }

    initializeGrid() {
        for (let layer of this.layers) {
            this.grid.addLayer(layer);
        }
        // TODO: temporary
        const points = ["2,5", "5,5", "5,6", "6,6", "6,7", "9,9", "9,6", "8,6"];
        for (let point of points) {
            this.grid.cycleState({
                layer: this.layers[0],
                point,
            });
        }
    }

    onPointerDown(event) {
        const {
            buttons,
            target: canvas,
            clientX,
            clientY,
            // TODO: I think that unless a layer specifically needs modifier keys, they should be used to pass user input onto the next layer
            // ctrlKey,
            // altKey,
            // shiftKey,
        } = event;
        const { offsetLeft, offsetTop } = canvas;
        let x = clientX - offsetLeft,
            y = clientY - offsetTop;

        const { controls, pointTypes } = this.currentLayer;

        if (controls === "onePoint") {
            const point = this.grid.nearest({
                to: { x, y },
                intersection: "polygon",
                pointTypes,
            });
            if (point === null) {
                return;
            }

            this.grid.cycleState({
                layer: this.currentLayer,
                point,
            });
            this.redrawScreen();
        }

        const options = [
            { intersection: "polygon", pointTypes: ["cell"] },
            { intersection: "ellipse", pointTypes: ["cell"] },
            { intersection: "polygon", pointTypes: ["corner"] },
            { intersection: "ellipse", pointTypes: ["corner"] },
            // { intersection: "polygon", pointTypes: ["edge"] },
            // { intersection: "ellipse", pointTypes: ["edge"] },
        ];
        if (buttons)
            console.log(
                ...options.map(
                    ({ intersection, pointTypes }) =>
                        intersection +
                        ":" +
                        pointTypes +
                        ":" +
                        this.grid.nearest({
                            to: { x, y },
                            intersection,
                            pointTypes,
                        })
                )
            );

        event.preventDefault();
    }
    // onPointerUp(event) {
    //     console.log(event);
    // }
    // onPointerMove(event) {
    //     const {button, clientX, clientY} = event;
    // }

    // TODO
    redrawScreen() {
        this.blitter.blitToCanvas(this.layers, this.settings, {});
    }
}

/* The main reason this class is necessary is to automatically change defaults stored in localStorage for that seamless experience */
export class Settings {
    cellSize = 50;
    // TODO: rename to borderPadding
    // TODO: use this to add 0.5 to every value to account for silly canvas adjustments
    border = 15;
}

export const POINT_TYPES = {
    CELL: "cell",
    EDGE: "edge",
    CORNER: "corner",
};
