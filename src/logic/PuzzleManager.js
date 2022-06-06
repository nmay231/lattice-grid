import { ILayer, RenderChange } from "../../globals";
import { getBlitGroups, OVERLAY_LAYER_ID, setBlitGroups } from "../atoms/blits";
import { setCanvasSize } from "../atoms/canvasSize";
import { addLayer, getLayers, removeLayer, setLayers } from "../atoms/layers";
import { initialSettings } from "../atoms/settings";
import { ControlsManager } from "./ControlsManager";
import { SquareGrid } from "./grids/SquareGrid";
import { availableLayers } from "./layers";
import { CellOutlineLayer } from "./layers/CellOutline";
import { OverlayLayer } from "./layers/Overlay";
import { SelectionLayer } from "./layers/Selection";
import { StorageManager } from "./StorageManager";

export class PuzzleManager {
    layers: Record<string, ILayer> = {};

    constructor() {
        // TODO: consider adding a .setSettings that will call setAtomSettings
        this.settings = initialSettings;

        this.grid = new SquareGrid(this.settings, { width: 1, height: 1 });
        this.storage = new StorageManager();
        this.controls = new ControlsManager(this);

        this.loadPuzzle();
        this.resizeCanvas();
        this.renderChange({ type: "draw", layerIds: "all" });
    }

    _resetLayers() {
        setLayers([]);
        this.layers = {};

        // Guarantee that these layers will be present even if the saved puzzle tries to add them
        const requiredLayers = [CellOutlineLayer, SelectionLayer, OverlayLayer];
        for (let layer of requiredLayers) {
            this.addLayer(layer);
        }
    }

    loadPuzzle() {
        this._resetLayers();
        try {
            const data = JSON.parse(localStorage.getItem("_currentPuzzle"));
            this._loadPuzzle(data);
            this.renderChange({ type: "draw", layerIds: "all" });
        } catch (err) {
            // TODO: Toast message to user saying something went wrong.
            console.error(err);
            this.freshPuzzle();
        }
    }

    freshPuzzle() {
        this._resetLayers();
        this._loadPuzzle({
            layers: [
                { layerClass: "Cell Outline" },
                { layerClass: "Selections" },
                { layerClass: "Number" },
                { layerClass: OVERLAY_LAYER_ID },
            ],
            grid: { width: 10, height: 10 },
        });
        this.renderChange({ type: "draw", layerIds: "all" });
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

    renderChange(change: RenderChange) {
        if (change.type === "reorder") {
            // I don't need to do anything because render order is handled by layersAtom
            // TODO: Remove this change event?
        } else if (change.type === "delete") {
            const blitGroups = { ...getBlitGroups() };
            delete blitGroups[change.layerId];
            setBlitGroups(blitGroups);
        } else if (change.type === "switchLayer") {
            const blitGroups = { ...getBlitGroups() };
            const layer = this.getCurrentLayer();

            blitGroups[OVERLAY_LAYER_ID] =
                layer.getOverlayBlits?.({
                    grid: this.grid,
                    storage: this.storage,
                    settings: this.settings,
                }) || [];
            setBlitGroups(blitGroups);
        } else if (change.type === "draw") {
            const blitGroups = { ...getBlitGroups() };

            const { layers, currentLayerId } = getLayers();

            // Only render the overlay blits of the current layer
            blitGroups[OVERLAY_LAYER_ID] =
                this.layers[currentLayerId].getOverlayBlits?.({
                    grid: this.grid,
                    storage: this.storage,
                    settings: this.settings,
                }) || [];

            // TODO: Allowing layerIds === "all" is mostly used for resizing the grid. How to efficiently redraw layers that depend on the size of the grid. Are there even layers other than grids that need to rerender on resizes? If there are, should they have to explicitly subscribe to these events?
            const layerIds = new Set(
                change.layerIds === "all"
                    ? layers.map(({ id }) => id)
                    : change.layerIds,
            );

            for (let layerId of layerIds) {
                const layer = this.layers[layerId];
                blitGroups[layer.id] =
                    layer.getBlits?.({
                        grid: this.grid,
                        storage: this.storage,
                        stored: this.storage.getStored({
                            grid: this.grid,
                            layer,
                        }),
                        settings: this.settings,
                    }) || [];
            }

            setBlitGroups(blitGroups);
        } else {
            throw Error(`sadface ${JSON.stringify(change)}`);
        }

        this._saveToLocalStorage();
    }

    _saveToLocalStorage() {
        // TODO: change localStorage key and what's actually stored/how it's stored
        const data = {
            layers: [],
            grid: { width: this.grid.width, height: this.grid.height },
        };
        for (let fakeLayer of getLayers().layers) {
            const layer = this.layers[fakeLayer.id];
            data.layers.push({
                layerClass: Object.getPrototypeOf(layer).id,
                rawSettings: layer.rawSettings,
            });
        }
        localStorage.setItem("_currentPuzzle", JSON.stringify(data));
    }

    addLayer(layerClass: ILayer, settings?: object): string {
        if (layerClass.unique && layerClass.id in this.layers) {
            this.changeLayerSettings(layerClass.id, settings);
            return;
        }

        const layer = Object.create(layerClass);
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
            ethereal: layer.ethereal,
            layerType: layerClass.id,
        });
        return layer.id;
    }

    removeLayer(id) {
        if (id in this.layers) {
            delete this.layers[id];
            removeLayer(id);
            this.renderChange({ type: "delete", layerId: id });
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
            }) || {};

        if (history?.length) {
            this.storage.addToHistory(this.grid, layer, history);
            this.renderChange({ type: "draw", layerIds: [layer.id] });
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
