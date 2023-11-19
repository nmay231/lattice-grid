import { arrayMove } from "@dnd-kit/sortable";
import { isEqual } from "lodash";
import { proxy } from "valtio";
import { ControlsManager } from "./ControlsManager";
import { StorageManager } from "./StorageManager";
import { SquareGrid } from "./grids/SquareGrid";
import { availableLayers } from "./layers";
import { CellOutlineLayer } from "./layers/CellOutline";
import { NumberLayer } from "./layers/Number";
import { OverlayLayer } from "./layers/Overlay";
import { SELECTION_ID } from "./layers/controls/selection";
import { canvasSizeProxy } from "./state/canvasSize";
import {
    EditMode,
    Grid,
    Layer,
    LayerClass,
    LocalStorageData,
    NeedsUpdating,
    ObjectId,
    PageMode,
    RenderChange,
    SVGGroup,
    UnknownObject,
    ValtioRef,
} from "./types";
import { IndexedOrderedMap } from "./utils/OrderedMap";
import { valtioRef } from "./utils/imports/valtio";
import { notify } from "./utils/notifications";
import { LatestTimeout } from "./utils/primitiveWrappers";
import { stringifyAnything } from "./utils/string";

export class PuzzleManager {
    layers = proxy(new IndexedOrderedMap<ValtioRef<Layer>>((layer) => !layer.klass.ethereal));
    UILayer = availableLayers["OverlayLayer"].create(this);
    CellOutlineLayer = availableLayers["CellOutlineLayer"].create(this);
    SVGGroups = proxy({} as Record<Layer["id"], ValtioRef<SVGGroup[]>>);

    grid: Grid = new SquareGrid();
    // TODO: stratify storage by the different grids. I guess it's the same problem of multiple grids.
    storage = new StorageManager();
    controls = new ControlsManager(this);
    answers = new Map<Layer["id"], Record<ObjectId, UnknownObject>>();

    settings = proxy({
        editMode: "question" as EditMode,
        pageMode: "edit" as PageMode,
        debugging: false,
        borderPadding: 60,
        cellSize: 60,
    });

    startUp() {
        this.loadPuzzle();
        this.resizeCanvas();
        this.renderChange({ type: "draw", layerIds: "all" });
    }

    resetLayers() {
        this.layers.clear();
        this.storage = new StorageManager();
        this.storage.addStorage(SELECTION_ID);

        // Guarantee that these layers will be present even if the saved puzzle fails to add them
        this.addLayer(OverlayLayer, null);
        this.addLayer(CellOutlineLayer, null);
    }

    loadPuzzle() {
        const local = localStorage.getItem("_currentPuzzle");
        if (!local) {
            this.freshPuzzle();
            return;
        }

        try {
            this.resetLayers();
            const data = JSON.parse(local);
            this._loadPuzzle(data as NeedsUpdating); // TODO: zod verification?
            this.renderChange({ type: "draw", layerIds: "all" });
        } catch (error: NeedsUpdating) {
            notify.error({
                error: error as Error,
                message: "Failed to load puzzle from local storage",
            });
            this.freshPuzzle();
        }
    }

    freshPuzzle() {
        this.resetLayers();
        this.addLayer(NumberLayer, null);
        this.grid.setParams({ type: "square", width: 10, height: 10, minX: 0, minY: 0 });
        this.resizeCanvas();
        this.renderChange({ type: "draw", layerIds: "all" });
    }

    _loadPuzzle(data: LocalStorageData) {
        for (const { id, type: layerClass, rawSettings } of data.layers) {
            this.addLayer(availableLayers[layerClass], id, rawSettings);
        }
        this.grid.setParams(data.grid);
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

        if (change.type === "delete") {
            delete this.SVGGroups[change.layerId];
        } else if (change.type === "switchLayer") {
            const layer = this.layers.get(currentLayerId);

            this.SVGGroups[`${this.UILayer.id}-question`] = valtioRef(
                layer.getOverlaySVG?.({ ...this }) || [],
            );
        } else if (change.type === "draw") {
            // Only render the overlay SVG of the current layer
            this.SVGGroups[`${this.UILayer.id}-question`] = valtioRef(
                this.layers.get(currentLayerId).getOverlaySVG?.({ ...this }) || [],
            );

            // TODO: Allowing layerIds === "all" is mostly used for resizing the grid. How to efficiently redraw layers that depend on the size of the grid. Are there even layers other than grids that need to rerender on resizes? If there are, should they have to explicitly subscribe to these events?
            const layerIds = new Set(
                change.layerIds === "all" ? this.layers.keys() : change.layerIds,
            );

            for (const layerId of layerIds) {
                for (const editMode of ["question", "answer"] satisfies EditMode[]) {
                    const layer = this.layers.get(layerId);
                    this.SVGGroups[`${layer.id}-${editMode}`] = valtioRef(
                        layer.getSVG({
                            ...this,
                            settings: { ...this.settings, editMode },
                        }),
                    );
                }
            }

            // Quick and dirty answer check
            if (this.settings.pageMode === "play" && this.answers.size) {
                // TODO: This assumes that all objects can be checked to be equal using recursive equality. Some objects might have hidden state that is not relevant to answer checking
                let correct = true;
                for (const [layerId, expected] of this.answers.entries()) {
                    const actual = Object.fromEntries(
                        this.storage.getObjects(layerId).entries("answer"),
                    );

                    if (!isEqual(expected, actual)) {
                        correct = false;
                        break;
                    }
                }

                if (correct) {
                    notify.info({
                        title: "Yay! You solved it",
                        message: "your answer matches the setter's answer",
                        timeout: 0,
                    });
                    // Clear to reset checking and only display one notification
                    this.answers = new Map();
                }
            }
        } else {
            throw notify.error({
                message: `Failed to render to canvas: ${stringifyAnything(change)}`,
                timeout: 4000,
            });
        }

        if (this.settings.pageMode === "edit") {
            localStorage.setItem("_currentPuzzle", JSON.stringify(this._getParams()));
        }
    }

    _getParams() {
        // TODO: change localStorage key and what's actually stored/how it's stored
        const data: LocalStorageData = {
            layers: this.layers
                .values()
                .filter(({ id }) => id !== "CellOutlineLayer" && id !== "OverlayLayer")
                .map(({ id, klass: { type }, settings }) => {
                    const rawSettings: UnknownObject = {};
                    for (const [key, description] of Object.entries(
                        availableLayers[type as keyof typeof availableLayers].settingsDescription,
                    )) {
                        if (!description.derived) {
                            rawSettings[key] = settings[key as never];
                        }
                    }
                    return {
                        id,
                        type: type as NeedsUpdating,
                        rawSettings,
                    };
                }),
            grid: this.grid.getParams(),
        };
        return data;
    }

    addLayer(
        layerClass: LayerClass<any>,
        id: Layer["id"] | null,
        settings?: UnknownObject,
    ): Layer["id"] {
        const layer = layerClass.create(this);
        if (id) layer.id = id;

        // Add the layer to the end, but before the UILayer
        this.layers.set(layer.id, valtioRef(layer), this.layers.getPrevKey(this.UILayer.id));
        this.storage.addStorage(layer.id);

        const { grid, settings: puzzleSettings, storage } = this;

        // TODO: Why do I have to call updateSettings twice again? I should have layers be complete on initialization, not after updateSettings({oldSettings: undefined}).
        const { filters } = layer.updateSettings({
            grid,
            puzzleSettings,
            storage,
            oldSettings: undefined,
        });
        if (filters) {
            this.storage.addStorageFilters(filters, layer.id);
        }

        if (settings) {
            let oldSettings = undefined as undefined | UnknownObject;
            for (const [key, value] of Object.entries(settings)) {
                if (layer.klass.isValidSetting(key, value)) {
                    oldSettings = oldSettings ?? { ...layer.settings };
                    layer.settings[key] = value;
                }
            }

            if (oldSettings) {
                const { history, filters, removeFilters } = layer.updateSettings({
                    grid: this.grid,
                    puzzleSettings: this.settings,
                    storage: this.storage,
                    oldSettings,
                });

                if (removeFilters) {
                    this.storage.removeStorageFilters(removeFilters);
                }
                if (filters) {
                    this.storage.addStorageFilters(filters, layer.id);
                }

                // TODO: History is deprecated because filters will now manage removing invalid objects
                if (history?.length) {
                    this.storage.addToHistory({
                        puzzle: this,
                        layerId: layer.id,
                        actions: history,
                    });
                }
            }
        }

        // TODO: I might need to not selectLayer in .addLayer() anymore. (I think I only need it on initial add, but I'm not certain).
        this.selectLayer(layer.id);

        return layer.id;
    }

    removeLayer(id: Layer["id"]) {
        if (this.layers.currentKey === id) {
            // We try to select the next layer without wrapping to the other end
            let nextId = this.layers.getNextSelectableKey(this.layers.currentKey);

            // If that fails, try selecting the previous layer
            if (nextId === null) {
                nextId = this.layers.getPrevSelectableKey(this.layers.currentKey);
            }

            // If THAT fails, then no layer is selectable anyways
            if (nextId !== null) {
                this.selectLayer(nextId);
            }
        }
        if (this.layers.delete(id)) {
            this.storage.removeStorage(id);
            this.renderChange({ type: "delete", layerId: id });
        }
    }

    changeLayerSetting(layerId: Layer["id"], key: string, value: unknown) {
        const layer = this.layers.get(layerId);
        if (layer.klass.isValidSetting(key, value)) {
            const oldSettings = { ...layer.settings };
            layer.settings[key as never] = value; // Sometimes I hate typescript

            const { grid, settings, storage } = this;
            const { history, filters, removeFilters } = layer.updateSettings({
                grid,
                puzzleSettings: settings,
                storage,
                oldSettings,
            });

            if (removeFilters) {
                this.storage.removeStorageFilters(removeFilters);
            }
            if (filters) {
                this.storage.addStorageFilters(filters, layer.id);
            }

            if (history?.length) {
                this.storage.addToHistory({ puzzle: this, layerId: layer.id, actions: history });
            }
        }
    }

    shuffleLayerOnto(beingMoved: Layer["id"], target: Layer["id"]) {
        const layers = this.layers;
        const from = layers.order.indexOf(beingMoved);
        const to = layers.order.indexOf(target);
        if (from === -1 || to === -1) {
            throw notify.error({
                message: `shuffleLayerOnto: One of ${beingMoved} => ${target} not in ${layers.keys()}`,
                timeout: 4000,
            });
        }

        layers.order.splice(0, layers.order.length, ...arrayMove(layers.order, from, to));
    }

    focusCurrentLayer() {
        // Must be in a timeout to allow the DOM to be updated.
        this._layerSelectTimeout.after(10, () => {
            const elm = document.querySelector<HTMLElement>(
                `[data-layerid="${this.layers.currentKey}"]`,
            );
            if (!elm) {
                throw notify.error({
                    message: `focusCurrentLayer: Unable to focus the current LayerItem ${this.layers.currentKey}`,
                });
            }
            elm.focus();
        });
    }

    _layerSelectTimeout = new LatestTimeout();
    selectLayer(layerId: Layer["id"]): void {
        // TODO: This check is only necessary because puzzle load blindly calls puzzle.selectLayer on every layer
        if (!this.layers.selectable(this.layers.get(layerId))) {
            return;
        }

        const oldLayerId = this.layers.currentKey;
        if (!this.layers.select(layerId)) {
            throw notify.error({ message: "selectLayer: trying to select a non-existent layer" });
        }

        if (oldLayerId !== layerId) {
            this.renderChange({ type: "switchLayer" });
            this.focusCurrentLayer();
        }
    }
}
