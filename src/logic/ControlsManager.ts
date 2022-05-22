import { PointerEvent } from "react";
import { getLayers, selectLayer } from "../atoms/layers";
import { keypressString } from "../utils/stringUtils";
import {
    CleanedDOMEvent,
    ILayer,
    LayerEvent,
    PointerMoveOrDown,
} from "./layers/baseLayer";
import { PuzzleManager } from "./PuzzleManager";

export class ControlsManager {
    blurCanvasTimeoutId: number | undefined = undefined;
    tempStorage: Record<string, object> | null = null;
    puzzle: PuzzleManager;
    eventListeners;
    stopPropagation;

    constructor(puzzle: PuzzleManager) {
        this.puzzle = puzzle;

        // Note: these are not event listeners attached to the SVGCanvas
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.onPointerUpOutside = this.onPointerUpOutside.bind(this);
        this.onPageBlur = this.onPageBlur.bind(this);

        this.eventListeners = {
            onPointerDown: this.onPointerDown.bind(this),
            onPointerMove: this.onPointerMove.bind(this),
            onPointerUp: this.onPointerUp.bind(this),
            onPointerLeave: this.onPointerLeave.bind(this),
            onPointerEnter: this.onPointerEnter.bind(this),
            onContextMenu: this.onContextMenu.bind(this),
        };

        // Attached to elements that don't want to send events to the svgcanvas like forms
        this.stopPropagation = {
            onPointerDown: this._stopPropagation.bind(this),
            onPointerMove: this._stopPropagation.bind(this),
            onPointerUp: this._stopPropagation.bind(this),
            onPointerLeave: this._stopPropagation.bind(this),
            onPointerEnter: this._stopPropagation.bind(this),
            onKeyDown: this._stopPropagation.bind(this),
            onContextMenu: this._stopPropagation.bind(this),
        };
    }

    _stopPropagation(event: any) {
        event.stopPropagation();
    }

    cleanPointerEvent(
        type: "pointerDown" | "pointerMove",
        event: PointerEvent,
    ): PointerMoveOrDown {
        const { clientX, clientY, currentTarget } = event;
        const {
            left,
            top,
            width: realWidth,
            height: realHeight,
        } = currentTarget.getBoundingClientRect();
        const { minX, minY, width, height } =
            this.puzzle.grid.getCanvasRequirements();
        // These transformations convert dom coordinates to svg coords
        let x = minX + (clientX - left) * (height / realHeight),
            y = minY + (clientY - top) * (width / realWidth);

        // TODO: Should I actually remember which meta keys were held down on pointer down?
        const { altKey, ctrlKey, shiftKey } = event;
        return {
            type,
            cursor: { x, y },
            altKey,
            ctrlKey,
            shiftKey,
            points: [], // Technically pointless, but it's easier on typescipt
        };
    }

    applyLayerEvent(layer: ILayer, event: CleanedDOMEvent) {
        const { grid, storage, settings } = this.puzzle;
        const layerEvent: LayerEvent = {
            ...event,
            grid,
            storage,
            stored: storage.getStored({ grid, layer }),
            settings,
            tempStorage: this.tempStorage || {},
        };

        if (
            layerEvent.type === "pointerDown" ||
            layerEvent.type === "pointerMove"
        ) {
            const points = layer.gatherPoints(layerEvent);
            if (!points?.length) {
                return;
            }
            layerEvent.points = points;
        }

        const { discontinueInput, history } =
            layer.handleEvent(layerEvent) || {};

        if (
            layerEvent.type === "keyDown" ||
            discontinueInput === true ||
            // On pointer up, layer's have to explicitly request to not discontinue input
            (layerEvent.type === "pointerUp" && discontinueInput !== false)
        ) {
            this.resetControls();
        }

        storage.addToHistory(grid, layer, history);
        this.puzzle.renderChange({ type: "draw", layerIds: [layer.id] });
    }

    resetControls() {
        this.tempStorage = null;
    }

    selectLayer(...arg: Parameters<typeof selectLayer>) {
        const oldId = getLayers().currentLayerId;
        selectLayer(...arg);
        const newId = getLayers().currentLayerId;
        if (oldId !== newId) {
            // TODO: This will eventually just change out the overlay blits instead of this
            this.puzzle.renderChange({ type: "switchLayer" });
        }
    }

    onPointerDown(rawEvent: PointerEvent) {
        // TODO: allow for two fingers to zoom
        if (!rawEvent.isPrimary) {
            return;
        }
        const layer = this.puzzle.getCurrentLayer();
        this.tempStorage = {};
        const event = this.cleanPointerEvent("pointerDown", rawEvent);
        this.applyLayerEvent(layer, event);
    }

    onPointerMove(rawEvent: PointerEvent) {
        if (!rawEvent.isPrimary || !this.tempStorage) {
            return;
        }

        const layer = this.puzzle.getCurrentLayer();
        const event = this.cleanPointerEvent("pointerMove", rawEvent);
        this.applyLayerEvent(layer, event);
    }

    onPointerUp(rawEvent: PointerEvent) {
        if (!rawEvent.isPrimary || !this.tempStorage) {
            return;
        }

        const layer = this.puzzle.getCurrentLayer();
        this.applyLayerEvent(layer, { type: "pointerUp" });
    }

    onPointerLeave(rawEvent: PointerEvent) {
        if (!rawEvent.isPrimary || !this.tempStorage) {
            return;
        }

        clearTimeout(this.blurCanvasTimeoutId);
        const timeoutDelay = this.puzzle.settings.actionWindowMs;
        this.blurCanvasTimeoutId = setTimeout(() => {
            const layer = this.puzzle.getCurrentLayer();
            this.applyLayerEvent(layer, { type: "pointerUp" });
        }, timeoutDelay) as unknown as number;
    }

    onPointerEnter(event: PointerEvent) {
        if (!event.isPrimary || !this.tempStorage) {
            return;
        }

        clearTimeout(this.blurCanvasTimeoutId);
    }

    onContextMenu(event: MouseEvent) {
        event.preventDefault();
    }

    handleKeyDown(rawEvent: KeyboardEvent) {
        const keypress = keypressString(rawEvent);

        if (
            // This should be a very small whitelist for which key-strokes are allowed to be blocked
            ["tab", "ctrl-a", "ctrl-i"].indexOf(keypress) > -1 ||
            keypress.length === 1
        ) {
            rawEvent.preventDefault();
        }

        if (this.tempStorage) {
            // Ignore keyboard events if already handling pointer events
            return;
        }

        let layer = this.puzzle.getCurrentLayer();

        if (keypress === "Escape") {
            this.applyLayerEvent(layer, { type: "cancelAction" });
        } else if (keypress === "Delete") {
            this.applyLayerEvent(layer, { type: "delete", keypress });
        } else if (keypress === "Tab" || keypress === "shift-Tab") {
            // TODO: allow layers to have sublayers that you can tab through (e.g. for sudoku). This should be handled by a separate api than .handleEvent() though to prevent serious bugs and to allow UI indicators.
            this.selectLayer({ tab: keypress === "shift-Tab" ? -1 : 1 });
        } else if (keypress === "ctrl-z" || keypress === "ctrl-y") {
            // TODO: Eventually, I want layers to be able to switch the current layer (specifically SelectionLayer for sudoku ctrl/shift behavior)
            // Perhaps, I can use that mechanism for storage to switch the current layer when undoing/redoing
            const { storage, grid } = this.puzzle;
            const appliedActions =
                keypress === "ctrl-z"
                    ? storage.undoHistory(grid.id)
                    : storage.redoHistory(grid.id);

            if (appliedActions.length) {
                const newLayerId =
                    appliedActions[appliedActions.length - 1].layerId;
                this.selectLayer({ id: newLayerId });

                layer = this.puzzle.getCurrentLayer();
                this.applyLayerEvent(layer, {
                    type: "undoRedo",
                    actions: appliedActions,
                });
            }
        } else {
            this.applyLayerEvent(layer, { type: "keyDown", keypress });
        }
    }

    onPointerUpOutside(rawEvent: PointerEvent) {
        if (
            rawEvent.isPrimary &&
            (rawEvent.target as any)?.id === "canvas-container"
        ) {
            const layer = this.puzzle.getCurrentLayer();
            this.applyLayerEvent(layer, { type: "cancelAction" });
        }
    }

    onPageBlur(rawEvent: FocusEvent) {
        // TODO: Why am I asking if the rawEvent isPrimary?
        if (!(rawEvent as any).isPrimary || !this.tempStorage) {
            return;
        }

        const layer = this.puzzle.getCurrentLayer();
        this.applyLayerEvent(layer, { type: "pointerUp" });
        clearTimeout(this.blurCanvasTimeoutId);
    }
}
