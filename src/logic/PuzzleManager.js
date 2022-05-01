import { setBlitGroups } from "../atoms/blits";
import { setCanvasSize } from "../atoms/canvasSize";
import { addLayer, getLayers, removeLayer, setLayers } from "../atoms/layers";
import { initialSettings } from "../atoms/settings";
import { ControlsManager } from "./ControlsManager";
import { SquareGrid } from "./grids/SquareGrid";
import { availableLayers } from "./layers";
import { StorageManager } from "./StorageManager";

export class PuzzleManager {
    layers = {};

    constructor(store) {
        this.store = store;
        // TODO: consider adding a .setSettings that will call setAtomSettings
        this.settings = initialSettings;

        this.grid = new SquareGrid(this.settings, { width: 1, height: 1 });
        this.storage = new StorageManager();
        this.controls = new ControlsManager(this);

        this.loadPuzzle();
        this.resizeCanvas();
        this.redrawScreen();
    }

    loadPuzzle() {
        this.layers = {};
        setLayers([]);
        try {
            const data = JSON.parse(localStorage.getItem("_currentPuzzle"));
            this._loadPuzzle(data);
            this.redrawScreen();
        } catch (err) {
            // TODO: Toast message to user saying something went wrong.
            console.error(err);
            this.freshPuzzle();
        }
    }

    freshPuzzle() {
        this.layers = {};
        setLayers([]);
        this._loadPuzzle({
            layers: [
                { layerClass: "Cell Outline" },
                { layerClass: "Selections" },
                { layerClass: "Number" },
            ],
            grid: { width: 10, height: 10 },
        });
        this.redrawScreen();
    }

    _loadPuzzle(data) {
        const { width, height } = data.grid;
        this.grid.width = width;
        this.grid.height = height;

        for (let { layerClass, rawSettings } of data.layers) {
            this.addLayer(availableLayers[layerClass], rawSettings);
        }
    }

    resizeCanvas() {
        const requirements = this.grid.getCanvasRequirements();
        setCanvasSize(requirements);
    }

    redrawScreen(changes = []) {
        /* changes are a list of things being added or removed. It contains information like which layer the changes belong to, which points are relevant (position), if they are hidden or invalid, etc. Do NOT use it now. In fact, it might not even be necessary. */
        const groups = {};
        const renderOrder = [];

        const currentLayerIds = this.getCurrentLayer().renderIds_TEMP || [];

        const fakeLayers = getLayers().layers;
        for (let fakeLayer of fakeLayers) {
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
                if (
                    group.renderOnlyWhenFocused &&
                    !currentLayerIds.includes(layer.id)
                ) {
                    continue;
                }
                group.id += layer.id;
                renderOrder.push(group.id);
                groups[group.id] = group;
            }
        }
        setBlitGroups({ groups, renderOrder });

        // TODO: change localStorage key and what's actually stored/how it's stored
        const data = {
            layers: [],
            grid: { width: this.grid.width, height: this.grid.height },
        };
        for (let fakeLayer of fakeLayers) {
            const layer = this.layers[fakeLayer.id];
            data.layers.push({
                layerClass: Object.getPrototypeOf(layer).constructor.id,
                rawSettings: layer.rawSettings,
            });
        }
        localStorage.setItem("_currentPuzzle", JSON.stringify(data));
    }

    addLayer(layerClass, settings) {
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
        this.storage.addStorage({ grid: this.grid, layer });
        this.changeLayerSettings(
            layer.id,
            settings || layerClass.defaultSettings,
        );

        addLayer({
            id: layer.id,
            hidden: layer.hidden,
            layerType: layerClass.id,
        });
        return layer.id;
    }

    removeLayer(id) {
        if (id in this.layers) {
            delete this.layers[id];
            removeLayer(id);
            this.redrawScreen();
        }
    }

    changeLayerSettings(layerId, newSettings) {
        // TODO: Should I even have the "Selections" layer be with the normal layers or should it always be attached to the puzzle or grid?
        const Selections = this.layers["Selections"];
        const layer = this.layers[layerId];
        const { history } =
            layer.newSettings?.({
                newSettings,
                grid: this.grid,
                storage: this.storage,
                // TODO: If anything, I should prevent the issue where CellOutline is added before Selections therefore requiring the following optional chain. That's why I thought pre-instantiating it would be a good idea.
                attachSelectionsHandler:
                    Selections?.attachHandler?.bind?.(Selections),
            }) || [];

        if (history?.length) {
            this.controls.handleLayerActions(layer, {
                history,
                discontinueInput: "noChange",
            });
        }
    }

    // TODO: Might be unnecessary
    getCurrentLayer() {
        return this.layers[getLayers().currentLayerId];
    }
}

export const POINT_TYPES = {
    CELL: "cells",
    EDGE: "edges",
    CORNER: "corners",
};
