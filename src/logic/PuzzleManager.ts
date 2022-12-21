import { arrayMove } from "@dnd-kit/sortable";
import { proxy } from "valtio";
import { blitGroupsProxy, OVERLAY_LAYER_ID } from "../state/blits";
import { canvasSizeProxy } from "../state/canvasSize";
import {
    EditMode,
    Grid,
    Layer,
    LayerClass,
    LocalStorageData,
    NeedsUpdating,
    RenderChange,
    UnknownObject,
    ValtioRef,
} from "../types";
import { errorNotification } from "../utils/DOMUtils";
import { valtioRef } from "../utils/imports";
import { IndexedOrderedMap } from "../utils/OrderedMap";
import { formatAnything } from "../utils/stringUtils";
import { ControlsManager } from "./ControlsManager";
import { SquareGrid } from "./grids/SquareGrid";
import { availableLayers } from "./layers";
import { CellOutlineLayer } from "./layers/CellOutline";
import { SELECTION_ID } from "./layers/controls/selection";
import { OverlayLayer } from "./layers/Overlay";
import { StorageManager } from "./StorageManager";

export class PuzzleManager {
    layers = proxy(new IndexedOrderedMap<ValtioRef<Layer>>((layer) => !layer.ethereal));
    UILayer = availableLayers["OverlayLayer"].create(this) as OverlayLayer;
    CellOutlineLayer = availableLayers["CellOutlineLayer"].create(this) as CellOutlineLayer;

    grid: Grid = new SquareGrid();
    storage = new StorageManager();
    controls = new ControlsManager(this);
    settings = proxy({
        editMode: "question" as EditMode,
        // TODO: pageMode: "edit" | "play" | "compete"
        borderPadding: 60,
        cellSize: 60,
        // The time window allowed between parts of a single action, e.g. typing a two-digit number
        actionWindowMs: 600,
    });

    constructor() {
        this.loadPuzzle();
        this.resizeCanvas();
        this.renderChange({ type: "draw", layerIds: "all" });
    }

    resetLayers() {
        this.layers.clear();
        this.storage.addStorage({ grid: this.grid, layer: { id: SELECTION_ID } });

        // Guarantee that these layers will be present even if the saved puzzle fails to add them
        const requiredLayers = [CellOutlineLayer, OverlayLayer];
        for (const layer of requiredLayers) {
            this.addLayer(layer, null);
        }
    }

    loadPuzzle() {
        this.resetLayers();
        const local = localStorage.getItem("_currentPuzzle");
        if (!local) {
            this.freshPuzzle();
            return;
        }

        try {
            const data = JSON.parse(local);
            this._loadPuzzle(data);
            this.renderChange({ type: "draw", layerIds: "all" });
        } catch (error: NeedsUpdating) {
            errorNotification({
                error: error as Error,
                message: "Failed to load puzzle from local storage",
            });
            this.freshPuzzle();
        }
    }

    freshPuzzle() {
        this.resetLayers();
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
        const { minX, minY, width, height } = this.grid.getCanvasRequirements(this);
        canvasSizeProxy.minX = minX;
        canvasSizeProxy.minY = minY;
        canvasSizeProxy.width = width;
        canvasSizeProxy.height = height;
    }

    renderChange(change: RenderChange) {
        const { currentKey: currentLayerId } = this.layers;
        if (currentLayerId === null) {
            return;
        }

        if (change.type === "reorder") {
            // I don't need to do anything because render order is handled by layersAtom
            // TODO: Remove this change event? It would mainly be useful for future subscribing features.
        } else if (change.type === "delete") {
            delete blitGroupsProxy[change.layerId];
        } else if (change.type === "switchLayer") {
            const layer = this.layers.get(currentLayerId);

            blitGroupsProxy[`${OVERLAY_LAYER_ID}-question`] = valtioRef(
                layer.getOverlayBlits?.({ ...this }) || [],
            );
        } else if (change.type === "draw") {
            // Only render the overlay blits of the current layer
            blitGroupsProxy[`${OVERLAY_LAYER_ID}-question`] = valtioRef(
                this.layers.get(currentLayerId).getOverlayBlits?.({ ...this }) || [],
            );

            // TODO: Allowing layerIds === "all" is mostly used for resizing the grid. How to efficiently redraw layers that depend on the size of the grid. Are there even layers other than grids that need to rerender on resizes? If there are, should they have to explicitly subscribe to these events?
            const layerIds = new Set(
                change.layerIds === "all" ? this.layers.keys() : change.layerIds,
            );

            for (const layerId of layerIds) {
                for (const editMode of ["question", "answer"] as const) {
                    const layer = this.layers.get(layerId);
                    blitGroupsProxy[`${layer.id}-${editMode}`] = valtioRef(
                        layer.getBlits({
                            ...this,
                            settings: { ...this.settings, editMode },
                        }),
                    );
                }
            }
        } else {
            throw errorNotification({
                error: null,
                message: `Failed to render to canvas: ${formatAnything(change)}`,
            });
        }

        localStorage.setItem("_currentPuzzle", JSON.stringify(this._getParams()));
    }

    _getParams() {
        // TODO: change localStorage key and what's actually stored/how it's stored
        const data: LocalStorageData = {
            layers: this.layers.values().map(({ id, type, rawSettings }) => ({
                id,
                type: type as NeedsUpdating,
                rawSettings,
            })),
            grid: this.grid.getParams(),
        };
        return data;
    }

    addLayer(
        layerClass: LayerClass<any>,
        id: Layer["id"] | null,
        settings?: UnknownObject,
    ): Layer["id"] {
        const layer = new layerClass(layerClass, this);
        if (id) layer.id = id;
        // Add the layer to the end, but before the UILayer
        this.layers.set(layer.id, valtioRef(layer), OVERLAY_LAYER_ID);

        this.storage.addStorage({ grid: this.grid, layer });
        this.changeLayerSettings(layer.id, settings || layerClass.defaultSettings);

        return layer.id;
    }

    removeLayer(id: Layer["id"]) {
        if (this.layers.delete(id)) {
            this.storage.removeStorage({ grid: this.grid, layer: { id } });
            this.renderChange({ type: "delete", layerId: id });
        }
    }

    changeLayerSettings(layerId: Layer["id"], newSettings: any) {
        const layer = this.layers.get(layerId);
        const { history } = layer.newSettings({ ...this, newSettings });

        if (history?.length) {
            this.storage.addToHistory({ puzzle: this, layerId: layer.id, actions: history });
        }
    }

    shuffleLayerOnto(beingMoved: Layer["id"], target: Layer["id"]) {
        const layers = this.layers;
        const from = layers.order.indexOf(beingMoved);
        const to = layers.order.indexOf(target);
        if (from === -1 || to === -1) {
            throw errorNotification({
                error: null,
                message: `shuffleLayerOnto: One of ${beingMoved} => ${target} not in ${layers.keys()}`,
            });
        }

        layers.order.splice(0, layers.order.length, ...arrayMove(layers.order, from, to));
        this.renderChange({ type: "reorder" });
    }

    selectLayer(arg: { id: string } | { tab: -1 | 1 }): void {
        // TODO: Realize that all of this might be obsolete with focus-based layer selection
        const layers = this.layers;
        const layerId = layers.currentKey;

        if ("id" in arg) {
            if (!layers.select(arg.id)) {
                throw errorNotification({
                    error: null,
                    message: "selectLayer: trying to select a non-existent or ethereal layer",
                });
            }
        } else if ("tab" in arg && layerId !== null) {
            if (arg.tab === 1) {
                const first = layers.keys()[0];
                const success = layers.select(layers.getNextSelectableKey(layerId) || first);
                // Wrap to the top if needed
                if (!success) layers.select(layers.getNextSelectableKey(first) || layerId);
            } else {
                const last = this.UILayer.id;
                const success = layers.select(layers.getPrevSelectableKey(layerId) || last);
                // Wrap to the bottom if needed
                if (!success) layers.select(layers.getPrevSelectableKey(last) || layerId);
            }
        } else {
            return;
        }

        if (layerId !== layers.currentKey) {
            // TODO: This will eventually just change out the overlay blits instead of this
            this.renderChange({ type: "switchLayer" });
        }
    }
}
