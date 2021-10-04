import { addLayer, removeLayer, resizeCanvas } from "../redux/puzzle";
import { ControlsManager } from "./ControlsManager";
import { StorageManager } from "./StorageManager";
import { MasterBlitter } from "./blitters";
import { SquareGrid } from "./grids/SquareGrid";
import { availableLayers } from "./layers";

export class PuzzleManager {
    settings;
    layers = {};
    storage;
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
        this.storage = new StorageManager(this);
        // TODO: This is temporary since the layers of the puzzle are recovered from localStorage
        for (let layer of [
            availableLayers["Cell Outline"],
            availableLayers["Selections"],
        ]) {
            this.addLayer(layer);
        }
        this.resizeCanvas();

        this.blitter = new MasterBlitter(this.grid, this.storage);
        this.blitter.blitToCanvas(this.layers, this.settings, {});

        this.controls = new ControlsManager(this);
    }

    resizeCanvas() {
        const requirements = this.grid.getCanvasRequirements();
        this.store.dispatch(resizeCanvas(requirements));
    }

    subscribeToStore() {
        // TODO: This is not fully comprehensive
        const { settings } = this.store.getState();
        if (this.settings !== settings) {
            this.settings = settings;
            this.grid.settings = settings;
            this.initializeGrid();
            this.redrawScreen();
        }
    }

    // TODO
    redrawScreen() {
        this.blitter.blitToCanvas(this.layers, this.settings, {});
    }

    addLayer(layerClass) {
        if (layerClass.unique && layerClass.id in this.layers) {
            throw Error("Trying to add a duplicate layer!");
        }
        const layer = new layerClass();
        layer.id = layerClass.id;

        let idNumber = 2;
        while (layer.id in this.layers) {
            layer.id = layerClass.id + ` (${idNumber})`;
            idNumber++;
        }
        this.layers[layer.id] = layer;
        this.storage.addLayer(layer);

        // TODO: I temporarily want to show every layer regardless.
        if (true || !(layer.hidden && layer.unique)) {
            const { id } = layer;
            this.store.dispatch(addLayer({ id, hidden: false }));
        }
    }

    removeLayer(id) {
        if (id in this.layers) {
            delete this.layers[id];
            this.store.dispatch(removeLayer(id));
        }
    }
}

export const POINT_TYPES = {
    CELL: "cells",
    EDGE: "edges",
    CORNER: "corners",
};
