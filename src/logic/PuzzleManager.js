import { getBlitGroups, setBlitGroups } from "../atoms/blits";
import { setCanvasSize } from "../atoms/canvasSize";
import { addLayer, getLayers, removeLayer, setLayers } from "../atoms/layers";
import { initialSettings } from "../atoms/settings";
import { ControlsManager } from "./ControlsManager";
import { SquareGrid } from "./grids/SquareGrid";
import { availableLayers } from "./layers";
import { StorageManager } from "./StorageManager";

type RenderChange =
    | { type: "draw", layerIds: string[] | "all" }
    | { type: "delete", layerId: string }
    | { type: "reorder" };

export class PuzzleManager {
    layers = {};

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

    loadPuzzle() {
        this.layers = {};
        setLayers([]);
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
        } else if (change.type === "draw") {
            // TODO: Temporary solution for renderOnlyWhenFocused
            const currentLayerIds = this.getCurrentLayer().renderIds_TEMP || [];
            const allBlitGroups = { ...getBlitGroups() };

            // TODO: This is mostly used for resizing the grid. How to efficiently redraw layers that depend on the size of the grid. Are there even layers other than grids that need to rerender on resizes? If there are, should they have to explicitly subscribe to these events?
            if (change.layerIds === "all") {
                change.layerIds = getLayers().layers.map(({ id }) => id);
            }

            // TODO: This will be unnecessary once changeLayer events are implemented cause SelectionLayer can use that instead
            const layerIds = new Set([
                ...change.layerIds,
                ...change.layerIds.flatMap(
                    (id) => this.layers[id].renderIds_TEMP || [],
                ),
            ]);

            for (let layerId of layerIds) {
                const layer = this.layers[layerId];
                let layerBlitGroups = layer.getBlits({
                    grid: this.grid,
                    stored: this.storage.getStored({ grid: this.grid, layer }),
                    settings: this.settings,
                });

                layerBlitGroups = layerBlitGroups.filter(
                    (group) =>
                        !group.renderOnlyWhenFocused ||
                        currentLayerIds.includes(layer.id),
                );

                allBlitGroups[layer.id] = layerBlitGroups;
            }

            setBlitGroups(allBlitGroups);
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
                layerClass: Object.getPrototypeOf(layer).constructor.id,
                rawSettings: layer.rawSettings,
            });
        }
        localStorage.setItem("_currentPuzzle", JSON.stringify(data));
    }

    addLayer(layerClass, settings): string {
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
