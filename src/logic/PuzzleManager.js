/* TODO: Convert what's possible to typescript later. It's too annoying to do that now when I just need to iterate quickly. */
import { MasterBlitter } from "./blitters";
import { SquareGrid } from "./grids/SquareGrid";
import { CellOutlineLayer, SelectionLayer } from "./layers";

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
    store; // Redux store
    unsubscribeToStore;

    // TODO: This should not just change to handle multiPoint objects, but also for selecting existing objects
    currentPoint = null;

    constructor(canvas, store) {
        this.store = store;
        this.unsubscribeToStore = this.store.subscribe(
            this.subscribeToStore.bind(this)
        );
        this.settings = store.getState().settings;

        this.grid = new SquareGrid(this.settings, { width: 10, height: 10 });
        for (let layer of this.layers) {
            this.grid.addLayer(layer);
        }
        // this.canvas = canvas;
        // this.initializeGrid();

        // this.ctx = canvas.getContext("2d");
        this.blitter = new MasterBlitter(this.ctx, this.grid);
        this.blitter.blitToCanvas(this.layers, this.settings, {});

        this.eventListeners = {
            onPointerDown: this.onPointerDown.bind(this),
            // onPointerUp: this.onPointerUp.bind(this),
            // onPointerMove: this.onPointerMove.bind(this),
        };

        // TODO
        this.currentLayer = this.layers[0];
    }

    subscribeToStore() {
        // TODO: This is not fully comprehensive
        const settings = this.store.getState().settings;
        const { cellSize, border } = this.settings;
        this.settings = settings;
        this.grid.settings = settings;
        if (cellSize !== settings.cellSize || border !== settings.border) {
            this.initializeGrid();
            this.redrawScreen();
        }
    }

    initializeGrid() {
        const { width, height } = this.grid.getCanvasRequirements();
        this.canvas.width = width;
        this.canvas.height = height;
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
            { intersection: "polygon", pointTypes: ["cells"] },
            { intersection: "ellipse", pointTypes: ["cells"] },
            { intersection: "polygon", pointTypes: ["corners"] },
            { intersection: "ellipse", pointTypes: ["corners"] },
            // { intersection: "polygon", pointTypes: ["edges"] },
            // { intersection: "ellipse", pointTypes: ["edges"] },
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

export const POINT_TYPES = {
    CELL: "cells",
    EDGE: "edges",
    CORNER: "corners",
};
