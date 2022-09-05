import { getBlitGroups, OVERLAY_LAYER_ID, setBlitGroups } from "../atoms/blits";
import { setCanvasSize } from "../atoms/canvasSize";
import { addLayer, getLayers, removeLayer, setLayers } from "../atoms/layers";
import { getSettings } from "../atoms/settings";
import { Grid, Layer, LayerClass, LocalStorageData, RenderChange, UnknownObject } from "../types";
import { errorNotification } from "../utils/DOMUtils";
import { ControlsManager } from "./ControlsManager";
import { SquareGrid } from "./grids/SquareGrid";
import { availableLayers } from "./layers";
import { CellOutlineLayer } from "./layers/CellOutline";
import { OverlayLayer } from "./layers/Overlay";
import { SelectionLayer } from "./layers/Selection";
import { StorageManager } from "./StorageManager";

export class PuzzleManager {
    layers: Record<string, Layer> = {};

    grid: Grid = new SquareGrid();
    storage = new StorageManager();
    controls = new ControlsManager(this);

    constructor() {
        this.loadPuzzle();
        this.resizeCanvas();
        this.renderChange({ type: "draw", layerIds: "all" });
    }

    _resetLayers() {
        setLayers([]);
        this.layers = {};

        // Guarantee that these layers will be present even if the saved puzzle fails to add them
        const requiredLayers = [CellOutlineLayer, SelectionLayer, OverlayLayer];
        for (const layer of requiredLayers) {
            this.addLayer(layer);
        }
    }

    loadPuzzle() {
        this._resetLayers();
        try {
            const data = JSON.parse(localStorage.getItem("_currentPuzzle") || "{}");
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
                { type: "CellOutlineLayer" },
                { type: "SelectionLayer" },
                { type: "NumberLayer" },
                { type: "OverlayLayer" },
            ],
            grid: { type: "square", width: 10, height: 10, minX: 0, minY: 0 },
        });
        this.renderChange({ type: "draw", layerIds: "all" });
    }

    _loadPuzzle(data: LocalStorageData) {
        this.grid.setParams(data.grid);
        for (const { type: layerClass, rawSettings } of data.layers) {
            this.addLayer(availableLayers[layerClass], rawSettings);
        }
    }

    resizeCanvas() {
        const requirements = this.grid.getCanvasRequirements();
        setCanvasSize({ ...requirements, zoom: 0 });
    }

    renderChange(change: RenderChange) {
        const { layers, currentLayerId } = getLayers();
        const settings = getSettings();
        if (currentLayerId === null) {
            return;
        }

        if (change.type === "reorder") {
            // I don't need to do anything because render order is handled by layersAtom
            // TODO: Remove this change event?
        } else if (change.type === "delete") {
            const blitGroups = { ...getBlitGroups() };
            delete blitGroups[change.layerId];
            setBlitGroups(blitGroups);
        } else if (change.type === "switchLayer") {
            const blitGroups = { ...getBlitGroups() };
            const layer = this.layers[currentLayerId];

            blitGroups[OVERLAY_LAYER_ID] =
                layer.getOverlayBlits?.({
                    grid: this.grid,
                    storage: this.storage,
                    settings,
                }) || [];
            setBlitGroups(blitGroups);
        } else if (change.type === "draw") {
            const blitGroups = { ...getBlitGroups() };

            // Only render the overlay blits of the current layer
            blitGroups[OVERLAY_LAYER_ID] =
                this.layers[currentLayerId].getOverlayBlits?.({
                    grid: this.grid,
                    storage: this.storage,
                    settings,
                }) || [];

            // TODO: Allowing layerIds === "all" is mostly used for resizing the grid. How to efficiently redraw layers that depend on the size of the grid. Are there even layers other than grids that need to rerender on resizes? If there are, should they have to explicitly subscribe to these events?
            const layerIds = new Set(
                change.layerIds === "all" ? layers.map(({ id }) => id) : change.layerIds,
            );

            for (const layerId of layerIds) {
                const layer = this.layers[layerId];
                blitGroups[layer.id] = layer.getBlits({
                    grid: this.grid,
                    storage: this.storage,
                    settings,
                });
            }

            setBlitGroups(blitGroups);
        } else {
            errorNotification({ message: `Failed to render to canvas: ${JSON.stringify(change)}` });
        }

        localStorage.setItem("_currentPuzzle", JSON.stringify(this._getParams()));
    }

    _getParams() {
        // TODO: change localStorage key and what's actually stored/how it's stored
        const data: LocalStorageData = { layers: [], grid: this.grid.getParams() };
        for (const fakeLayer of getLayers().layers) {
            const layer = this.layers[fakeLayer.id];
            data.layers.push({
                type: layer.type,
                rawSettings: layer.rawSettings,
            });
        }
        return data;
    }

    addLayer(layerClass: LayerClass<any>, settings?: UnknownObject): string {
        if (layerClass.unique && layerClass.type in this.layers) {
            this.changeLayerSettings(layerClass.type, settings);
            return layerClass.type;
        }

        const layer = new layerClass(layerClass, this);

        this.layers[layer.id] = layer;
        this.storage.addStorage({ grid: this.grid, layer });
        this.changeLayerSettings(layer.id, settings || layerClass.defaultSettings);

        const { id, type, displayName, ethereal } = layer;
        addLayer({ id, type, displayName, ethereal });
        return layer.id;
    }

    removeLayer(id: string) {
        if (id in this.layers) {
            delete this.layers[id];
            this.storage.removeStorage({ grid: this.grid, layer: { id } });
            removeLayer(id);
            this.renderChange({ type: "delete", layerId: id });
        }
    }

    changeLayerSettings(layerId: string, newSettings: any) {
        // TODO: Should I even have the "Selection" layer be with the normal layers or should it always be attached to the puzzle or grid?
        const Selection = this.layers["Selection"] as SelectionLayer;
        const layer = this.layers[layerId];
        const { history } = layer.newSettings({
            newSettings,
            grid: this.grid,
            storage: this.storage,
            // TODO: If anything, I should prevent the issue where CellOutline is added before Selection therefore requiring the following optional chain. That's why I thought pre-instantiating it would be a good idea.
            attachSelectionHandler: Selection?.attachHandler?.bind?.(Selection),
            settings: getSettings(),
        });

        if (history?.length) {
            this.storage.addToHistory(this.grid, layer, history);
        }
    }
}
