import { arrayMove } from "@dnd-kit/sortable";
import { isEqual } from "lodash";
import { proxy } from "valtio";
import { ControlsManager } from "./ControlsManager";
import { StorageManager } from "./StorageManager";
import { extractLayersData, importPuzzleData } from "./encoding/importPuzzle";
import { EncodedLayer } from "./encoding/puzzleEncoder";
import {
    editPuzzleEncoder,
    sessionsEncoder,
    type CleanedSessionMetadata,
} from "./encoding/sessionsEncoder";
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
    NeedsUpdating,
    ObjectDescription,
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
import { base64, stringifyAnything } from "./utils/string";

/** Date.getTime() returns time in miliseconds, but that overflows int32. */
const timestampFromDate = (date: Date): number => {
    // eslint-disable-next-line unicorn/prefer-math-trunc -- In this case, we do want to convert to int32 since it will happen during serialization anyways
    return (date.getTime() / 1000) | 0;
};

// TODO: Rename to PuzzleContext
export class PuzzleManager {
    // TODO
    sessionMetadata: CleanedSessionMetadata = null!;
    private constructor() {}
    static createEditPuzzle(): PuzzleManager {
        const [sessionMetadata, currentEditPuzzle] = this.loadSessionMetadata();

        const puzzle = new PuzzleManager();
        puzzle.sessionMetadata = proxy(sessionMetadata);

        try {
            // loadSessionMetadata ensures there's at least one valid puzzle
            // TODO: I think want latgrid to always load the "newest" puzzle and to load an older one, I just change the metadata to make it the newest one and then edit it. This works for now, though; I'll just do both things.
            puzzle._loadEditPuzzle(currentEditPuzzle);
        } catch {
            // TODO: Report errors that are not already reported
            puzzle.resetPuzzle();
        }
        puzzle.resizeCanvas();
        puzzle.renderChange({ type: "draw", layerIds: "all" });

        return puzzle;
    }

    static createSolvePuzzle(puzzleString: string): PuzzleManager {
        const [sessionMetadata] = this.loadSessionMetadata();
        const puzzle = new PuzzleManager();
        puzzle.sessionMetadata = proxy(sessionMetadata);

        importPuzzleData(puzzle, puzzleString);
        puzzle.settings.pageMode = "play";
        puzzle.settings.editMode = "answer";

        return puzzle;
    }

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

    resetLayers() {
        this.layers.clear();
        this.storage = new StorageManager();
        this.storage.addStorage(SELECTION_ID);

        // Guarantee that these layers will be present even if the saved puzzle fails to add them
        this.addLayer(OverlayLayer, null);
        this.addLayer(CellOutlineLayer, null);
    }

    static loadSessionMetadata(): [CleanedSessionMetadata, number] {
        let needToSave = false;
        let metadata;

        const metadataString = localStorage.getItem("sessionMetadataV1");
        if (metadataString) {
            try {
                metadata = sessionsEncoder.decode(base64.parse(metadataString));
            } catch {
                notify.error("Corrupted data in session metadata localStorage");
                needToSave = true;
            }
        }

        const solvingPuzzles: CleanedSessionMetadata["solvingPuzzles"] = [];
        if (metadata?.solvingPuzzles?.length) {
            for (const puzzle of metadata.solvingPuzzles) {
                const { author, firstSolved, searchParams, title } = puzzle;
                if (author && firstSolved && searchParams && title) {
                    solvingPuzzles.push({ author, firstSolved, searchParams, title });
                } else {
                    // TODO: handle invalid data without dropping it
                    notify.error(`A solving puzzle had invalid data: ${stringifyAnything(puzzle)}`);
                    needToSave = true;
                }
            }
        }

        let timestamp = metadata?.myPuzzles?.[0]?.id;
        const now = new Date();
        const nowUTC = now.toUTCString();

        const myPuzzles: CleanedSessionMetadata["myPuzzles"] = [];
        if (!timestamp || !metadata) {
            timestamp = timestampFromDate(now);
            myPuzzles.push({
                author: metadata?.myAuthorName?.trim() || "anonymous",
                title: "Untitled",
                id: timestamp,
                created: nowUTC,
                edited: nowUTC,
            });
            needToSave = true;
        } else {
            for (const puzzle of metadata.myPuzzles!) {
                const { author, created, edited, id, svgPreviewString, title } = puzzle;
                if (author && created && edited && id && title) {
                    myPuzzles.push({ author, created, edited, id, svgPreviewString, title });
                } else {
                    // TODO: handle invalid data without dropping it
                    // TODO: Also, these are terrible errors messages rn...
                    notify.error(
                        `An editing puzzle had invalid data: ${stringifyAnything(puzzle)}`,
                    );
                    needToSave = true;
                }
            }
        }

        const { joinedOn, myAuthorName } = metadata ?? {};
        if (!joinedOn || !myAuthorName) {
            needToSave = true;
        }
        const result: CleanedSessionMetadata = {
            joinedOn: joinedOn ?? nowUTC,
            myAuthorName: myAuthorName ?? "anonymous",
            myPuzzles,
            solvingPuzzles,
        };

        if (needToSave) {
            this.writeMetadata(result);
        }

        return [result, timestamp];
    }

    static writeMetadata(metadata: CleanedSessionMetadata) {
        localStorage.setItem(
            "sessionMetadataV1",
            base64.stringify(sessionsEncoder.encode(metadata)),
        );
    }

    writeMetadata() {
        PuzzleManager.writeMetadata(this.sessionMetadata);
    }

    // TODO: Flesh out the details of what belongs in the external-facing vs internal private method for loading a puzzle
    loadEditPuzzle(timestamp: number) {
        let index = -1;
        for (const puzzle of this.sessionMetadata.myPuzzles) {
            if (puzzle.id === timestamp) {
                index = this.sessionMetadata.myPuzzles.indexOf(puzzle);
                break;
            }
        }

        // TODO: How to handle the error case?
        if (index !== -1) {
            const [switchingTo] = this.sessionMetadata.myPuzzles.splice(index, 1);
            this.sessionMetadata.myPuzzles.splice(0, 0, switchingTo);
            this._loadEditPuzzle(timestamp);
        }

        this.renderChange({ type: "draw", layerIds: "all" });
    }

    _loadEditPuzzle(timestamp: number) {
        const puzzleString = localStorage.getItem(`user-edit:${timestamp}`);

        if (puzzleString === null) {
            // TODO: This is only acceptable for the very first puzzle, so in all other cases I need to handle this better than I do now.
            throw new Error(`localStorage puzzle id=${timestamp} is null`);
        }
        const currentPuzzle = editPuzzleEncoder.decode(base64.parse(puzzleString));

        if (
            !currentPuzzle?.layers ||
            !currentPuzzle.grid?.square ||
            !currentPuzzle.editMode ||
            currentPuzzle.currentLayerIndex === undefined
        ) {
            throw notify.error(
                `Missing data in puzzle information: ${stringifyAnything(currentPuzzle)}`,
            );
        }
        const gridParams = { ...currentPuzzle.grid.square, type: "square" as const };
        const data = extractLayersData(currentPuzzle.layers, gridParams);

        if ("internalMessage" in data) {
            throw notify.error({
                title: `Error: ${data.title}`,
                // TODO: Put data.context into a expandable section of the notification
                message: `${data.internalMessage}; ${stringifyAnything(data.context)}`,
            });
        } else if (data.nonfatalErrors.length > 0) {
            notify.error({
                title: "Had some errors when loading data from localStorage",
                message: `errors: ${stringifyAnything(data.nonfatalErrors)}`,
            });
        }

        this.resetLayers();
        this.grid.setParams({ ...gridParams, minX: 0, minY: 0 });

        let toFocus: Layer["id"] = "Expected at least one layer...";
        for (let index = 0; index < data.layers.length; index++) {
            const layer = data.layers[index];
            const layerId = this.addLayer(availableLayers[layer.type], null, layer.settings);
            this.storage.objects[layerId] = layer.objects;

            if (index === currentPuzzle.currentLayerIndex) {
                toFocus = layerId;
            }
        }
        this.layers.select(toFocus);
        this.focusCurrentLayer();

        // TODO: Change editMode to an enum, maybe...
        this.settings.editMode =
            currentPuzzle.editMode === ("answer" satisfies EditMode) ? "answer" : "question";
    }

    freshPuzzle() {
        this.resetPuzzle();

        const now = new Date();
        const nowUTC = now.toUTCString();
        const timestamp = timestampFromDate(now);

        this.sessionMetadata.myPuzzles.splice(0, 0, {
            id: timestamp,
            author: this.sessionMetadata.myAuthorName.trim() || "anonymous",
            title: "Untitled",
            created: nowUTC,
            edited: nowUTC,
        });

        this.writeMetadata();

        // this._loadEditPuzzle(timestamp);
        this.renderChange({ type: "draw", layerIds: "all" });
    }

    deletePuzzle(timestamp: number) {
        if (timestamp === this.sessionMetadata.myPuzzles[0].id) {
            throw notify.error(
                `Trying to delete current puzzle=${timestamp} (not supported just yet)`,
            );
        }

        let index = -1;
        for (const puzzle of this.sessionMetadata.myPuzzles) {
            if (puzzle.id === timestamp) {
                index = this.sessionMetadata.myPuzzles.indexOf(puzzle);
                break;
            }
        }
        this.sessionMetadata.myPuzzles.splice(index, 1);

        // TODO: You know, this isn't technically correct since I never remove puzzle itself from localStorage, but I kinda like it since it becomes more like /tmp. But I do need to eventually delete old puzzles otherwise the browser might delete ALL localStorage if it feels like it needs to (especially with mobile devices low on storage). A form of garbage collection deleting old puzzles could be cool. Or maybe I keep most metadata but just flip a "hidden" switch so I continue to know how old it is and even "recover from trash" if wanted.
        this.writeMetadata();
    }

    resetPuzzle() {
        this.resetLayers();
        this.addLayer(NumberLayer, null);
        this.grid.setParams({ width: 10, height: 10, minX: 0, minY: 0 });
    }

    resizeCanvas() {
        const { minX, minY, width, height } = this.grid.getCanvasRequirements(this);
        canvasSizeProxy.minX = minX;
        canvasSizeProxy.minY = minY;
        canvasSizeProxy.width = width;
        canvasSizeProxy.height = height;
    }

    /** Basically, delete objects outside the grid when the resize modal is closed */
    finalizeResizedCanvas() {
        const layers = this.layers.entries().filter(([, layer]) => {
            const type = layer.klass.type as keyof typeof availableLayers;
            return type !== "CellOutlineLayer" && type !== "OverlayLayer";
        });

        const grid = this.grid;
        const pt = grid.getPointTransformer(this.settings);
        const keepInGrid = (desc: ObjectDescription): null | { obj: null | UnknownObject } => {
            // TODO: PointType is hardcoded to "cells" for now, since it is only a description atm anyways
            const [pointMap] = pt.fromPoints("cells", desc.points);
            const filter = [...pointMap.values()].some((point) => grid.pointOutOfBounds(point));
            return filter ? { obj: null } : null;
        };
        const transforms = Object.fromEntries(layers.map(([layerId]) => [layerId, keepInGrid]));

        this.storage.applyGlobalTransformations({ layers: Object.fromEntries(layers), transforms });
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
            if (this.settings.pageMode === "play" && this.answers.size > 0) {
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
            const { grid, settings, storage } = this;

            const layers: EncodedLayer[] = [];
            const layerToIndex: Record<Layer["id"], number> = {};
            let index = 0;
            for (const [id, layer] of this.layers.entries()) {
                if (
                    (
                        [
                            "CellOutlineLayer",
                            "DebugSelectPointsLayer",
                            "OverlayLayer",
                            "ToggleCharactersLayer",
                        ] satisfies Array<keyof typeof availableLayers>
                    ).includes(layer.id)
                ) {
                    continue;
                }

                layerToIndex[id] = index;
                index++;

                // const answerCheck = layer.id in this.answers;
                layers.push(
                    layer.encode({
                        grid: grid as NeedsUpdating,
                        settings,
                        storage,
                        answerCheck: true,
                    }),
                );
            }

            const { width, height } = this.grid.getParams();

            const bytes = editPuzzleEncoder.encode({
                grid: { square: { width, height } },
                layers,
                editMode: this.settings.editMode,
                // answerCheck: Object.keys(this.answers).map(id => ({layerIndex: layerToIndex[id]})),
                currentLayerIndex: layerToIndex[this.layers.currentKey!],
                historyV1: [],
            });
            // TODO: I'm sure a race condition somewhere will run this code when metadata has changed but not the puzzle data or something like that.
            const puzzleId = this.sessionMetadata.myPuzzles[0].id;
            localStorage.setItem(`user-edit:${puzzleId}`, base64.stringify(bytes));

            // TODO: Not perfect since "cancelAction" (clicking out of grid) actions can force render changes to ui. Maybe this belongs in the history.applyActions() areas?
            if (change.type === "delete" || (change.type === "draw" && change.layerIds !== "all")) {
                this.sessionMetadata.myPuzzles[0].edited = new Date().toUTCString();
                this.writeMetadata();
            }
        }
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
            this.storage.addStorageFilters(this, filters, layer.id);
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
                const { filters, removeFilters } = layer.updateSettings({
                    grid: this.grid,
                    puzzleSettings: this.settings,
                    storage: this.storage,
                    oldSettings,
                });

                if (removeFilters) {
                    this.storage.removeStorageFilters(removeFilters);
                }
                if (filters) {
                    this.storage.addStorageFilters(this, filters, layer.id);
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
            const { filters, removeFilters } = layer.updateSettings({
                grid,
                puzzleSettings: settings,
                storage,
                oldSettings,
            });

            if (removeFilters) {
                this.storage.removeStorageFilters(removeFilters);
            }
            if (filters) {
                this.storage.addStorageFilters(this, filters, layer.id);
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
