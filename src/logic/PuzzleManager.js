import { setBlitGroups } from "../redux/blits";
import {
    addLayer,
    newPuzzle,
    removeLayer,
    resizeCanvas,
} from "../redux/puzzle";
import { ControlsManager } from "./ControlsManager";
import { SquareGrid } from "./grids/SquareGrid";
import { availableLayers } from "./layers";
import { StorageManager } from "./StorageManager";

export class PuzzleManager {
    settings;
    layers = {};
    storage;
    grid;
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
        this.controls = new ControlsManager(this);

        this.loadPuzzle();
        this.resizeCanvas();
        this.redrawScreen();
    }

    loadPuzzle() {
        this.store.dispatch(newPuzzle());
        // TODO: This is temporary since the layers of the puzzle are recovered from localStorage
        for (let layer of [
            availableLayers["Cell Outline"],
            availableLayers["Selections"],
            availableLayers["Number"],
        ]) {
            this.addLayer(layer);
        }
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

    redrawScreen(changes = []) {
        /* changes are a list of things being added or removed. It contains information like which layer the changes belong to, which points are relevant (position), if they are hidden or invalid, etc. Do NOT use it now. In fact, it might not even be necessary. */
        const groups = {};
        const renderOrder = [];

        for (let fakeLayer of this.store.getState().puzzle.layers) {
            const layer = this.layers[fakeLayer.id];
            let layerBlitGroups = layer.getBlits({
                grid: this.grid,
                stored: this.storage.getStored({ grid: this.grid, layer }),
                settings: this.settings,
                changes,
            });
            for (let group of layerBlitGroups) {
                if (!group.id) {
                    throw Error(`Expected blit group id of layer=${layer.id}`);
                }
                group.id += layer.id;
                renderOrder.push(group.id);
                groups[group.id] = group;
            }
        }
        this.store.dispatch(setBlitGroups({ groups, renderOrder }));
    }

    // TODO: This assumes the layer is a blittingLayer. How do I handle controlling- and storingLayers?
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

        // TODO: Selections only works on onePoint layers using only cells. It could probably allow for more types
        if (
            layer.controllingLayer === "Selections" &&
            layer.pointTypes.toString() === POINT_TYPES.CELL &&
            layer.controls === "onePoint"
        ) {
            layer.controllingLayer = this.layers["Selections"];
        }

        this.layers[layer.id] = layer;
        this.storage.addStorage({ grid: this.grid, layer });

        // TODO: I temporarily want to show every layer regardless.
        if (true || !(layer.hidden && layer.unique)) {
            const { id } = layer;
            this.store.dispatch(addLayer({ id, hidden: false }));
        }

        this.redrawScreen();
    }

    removeLayer(id) {
        if (id in this.layers) {
            delete this.layers[id];
            this.store.dispatch(removeLayer(id));
            this.redrawScreen();
        }
    }

    // TODO
    getCurrentLayer(type) {
        let key;
        if (type === "storing") {
            key = "storingLayer";
        } else if (type === "controlling") {
            key = "controllingLayer";
        } else {
            throw Error(`Unknown current layer type: ${type}`);
        }

        const { layers, selectedLayer } = this.store.getState().puzzle;
        let layer = this.layers[layers[selectedLayer].id];
        while (layer[key] && layer[key] !== "custom") {
            layer = layer[key];
        }
        return layer;
    }
}

export const POINT_TYPES = {
    CELL: "cells",
    EDGE: "edges",
    CORNER: "corners",
};
