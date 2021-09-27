/* TODO: Convert what's possible to typescript later. It's too annoying to do that now when I just need to iterate quickly. */
import { resizeCanvas } from "../redux/actions";
import { ControlsManager } from "./ControlsManager";
import { MasterBlitter } from "./blitters";
import { SquareGrid } from "./grids/SquareGrid";
import { CellOutlineLayer, SelectionLayer } from "./layers";

export class PuzzleManager {
    settings;
    // TODO: Also store default render layers 1-9 so that if a user reorders some layers, new layers still are inserted in a reasonable spot according to their defaultRenderOrder
    layers = [new CellOutlineLayer(), new SelectionLayer()];
    grid;
    blitter;
    eventListeners;
    store; // Redux store
    unsubscribeToStore;

    // TODO: This should not just change to handle multiPoint objects, but also for selecting existing objects
    currentPoint = null;

    constructor(store) {
        this.store = store;
        this.unsubscribeToStore = this.store.subscribe(
            this.subscribeToStore.bind(this)
        );
        this.settings = store.getState().settings;

        this.grid = new SquareGrid(this.settings, { width: 10, height: 10 });
        for (let layer of this.layers) {
            this.grid.addLayer(layer);
        }
        this.resizeCanvas();

        this.blitter = new MasterBlitter(this.grid);
        this.blitter.blitToCanvas(this.layers, this.settings, {});

        this.controls = new ControlsManager(this);
    }

    resizeCanvas() {
        const requirements = this.grid.getCanvasRequirements();
        this.store.dispatch(resizeCanvas(requirements));
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
