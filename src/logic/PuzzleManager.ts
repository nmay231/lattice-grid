import { proxy } from "valtio";
import { getBlitGroups, OVERLAY_LAYER_ID, setBlitGroups } from "../atoms/blits";
import { setCanvasSize } from "../atoms/canvasSize";
import { Layers } from "../atoms/layers";
import { getSettings } from "../atoms/settings";
import {
    EditMode,
    Grid,
    Layer,
    LayerClass,
    LocalStorageData,
    NeedsUpdating,
    RenderChange,
    UnknownObject,
} from "../types";
import { errorNotification } from "../utils/DOMUtils";
import { formatAnything } from "../utils/stringUtils";
import { ControlsManager } from "./ControlsManager";
import { SquareGrid } from "./grids/SquareGrid";
import { availableLayers } from "./layers";
import { CellOutlineLayer } from "./layers/CellOutline";
import { SELECTION_ID } from "./layers/controls/selection";
import { OverlayLayer } from "./layers/Overlay";
import { StorageManager } from "./StorageManager";

export class PuzzleManager {
    layers: {
        OverlayLayer: OverlayLayer;
        CellOutlineLayer: CellOutlineLayer;
        [K: string]: Layer;
    };

    grid: Grid = new SquareGrid();
    storage = new StorageManager();
    controls = new ControlsManager(this);
    settings = proxy({
        editMode: "question" as EditMode,
        // TODO: pageMode: "setting" | "settingTest?" | "solving" | "competition"
    });

    constructor() {
        this.layers = this._requiredLayers();
        this.loadPuzzle();
        this.resizeCanvas();
        this.renderChange({ type: "draw", layerIds: "all" });
    }

    _requiredLayers(): typeof this["layers"] {
        return {
            OverlayLayer: availableLayers["OverlayLayer"].create(this) as OverlayLayer,
            CellOutlineLayer: availableLayers["CellOutlineLayer"].create(this) as CellOutlineLayer,
        };
    }

    _resetLayers() {
        Layers.reset();
        this.layers = this._requiredLayers();
        this.storage.addStorage({ grid: this.grid, layer: { id: SELECTION_ID } });

        // Guarantee that these layers will be present even if the saved puzzle fails to add them
        const requiredLayers = [CellOutlineLayer, OverlayLayer];
        for (const layer of requiredLayers) {
            this.addLayer(layer, null);
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
            layers: (["CellOutlineLayer", "NumberLayer", "OverlayLayer"] as const).map((id) => ({
                id,
                type: id,
            })),
            grid: { type: "square", width: 10, height: 10, minX: 0, minY: 0 },
        });
        this.renderChange({ type: "draw", layerIds: "all" });
    }

    _loadPuzzle(data: LocalStorageData) {
        this.grid.setParams(data.grid);
        for (const { id, type: layerClass, rawSettings } of data.layers) {
            this.addLayer(availableLayers[layerClass], id, rawSettings);
        }
    }

    resizeCanvas() {
        const requirements = this.grid.getCanvasRequirements();
        setCanvasSize({ ...requirements, zoom: 0 });
    }

    renderChange(change: RenderChange) {
        const { order, currentLayerId } = Layers.state;
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
            const layerIds = new Set(change.layerIds === "all" ? order : change.layerIds);

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
            throw errorNotification({
                message: `Failed to render to canvas: ${formatAnything(change)}`,
            });
        }

        localStorage.setItem("_currentPuzzle", JSON.stringify(this._getParams()));
    }

    _getParams() {
        // TODO: change localStorage key and what's actually stored/how it's stored
        const data: LocalStorageData = { layers: [], grid: this.grid.getParams() };
        for (const id of Layers.state.order) {
            const layer = this.layers[id];
            data.layers.push({
                id: layer.id,
                type: layer.type as NeedsUpdating,
                rawSettings: layer.rawSettings,
            });
        }
        return data;
    }

    addLayer(
        layerClass: LayerClass<any>,
        id: Layer["id"] | null,
        settings?: UnknownObject,
    ): Layer["id"] {
        const layer = new layerClass(layerClass, this);
        if (id) layer.id = id;
        this.layers[layer.id] = layer;

        // TODO: Should this ever retain storage for certain unique layers?
        this.storage.addStorage({ grid: this.grid, layer });
        this.changeLayerSettings(layer.id, settings || layerClass.defaultSettings);

        if (!(layer.unique && layer.id in Layers.state.layers)) {
            const { id, type, displayName, ethereal } = layer;
            Layers.addLayer({ id, type, displayName, ethereal });
        }
        return layer.id;
    }

    removeLayer(id: Layer["id"]) {
        if (id in this.layers) {
            delete this.layers[id];
            this.storage.removeStorage({ grid: this.grid, layer: { id } });
            Layers.removeLayer(id);
            this.renderChange({ type: "delete", layerId: id });
        }
    }

    changeLayerSettings(layerId: Layer["id"], newSettings: any) {
        const layer = this.layers[layerId];
        const { history } = layer.newSettings({
            newSettings,
            grid: this.grid,
            storage: this.storage,
            settings: getSettings(),
        });

        if (history?.length) {
            this.storage.addToHistory(this.grid, layer, history);
        }
    }
}
