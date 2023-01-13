import { clamp } from "lodash";
import { PuzzleManager } from "./PuzzleManager";
import { canvasSizeProxy } from "./state/canvasSize";
import {
    CleanedDOMEvent,
    Layer,
    LayerEvent,
    LayerProps,
    PointerMoveOrDown,
    UnknownObject,
} from "./types";
import { errorNotification } from "./utils/DOMUtils";
import { focusProxy, _focusState } from "./utils/focusManagement";
import { LatestTimeout } from "./utils/LatestTimeout";
import { keypressString } from "./utils/stringUtils";

export class ControlsManager {
    blurCanvasTimeout = new LatestTimeout();
    tempStorage: Record<string, UnknownObject> | null = null;

    // Canvas event listeners
    eventListeners = {
        onPointerDown: this.onPointerDown.bind(this),
        onPointerMove: this.onPointerMove.bind(this),
        onPointerUp: this.onPointerUp.bind(this),
        onPointerLeave: this.onPointerLeave.bind(this),
        onPointerEnter: this.onPointerEnter.bind(this),
        onContextMenu: this.onContextMenu.bind(this),
    };

    constructor(public puzzle: PuzzleManager) {}

    getCurrentLayer() {
        const id = this.puzzle.layers.currentKey;
        return id ? this.puzzle.layers.get(id) : null;
    }

    cleanPointerEvent(
        type: "pointerDown" | "pointerMove",
        event: React.PointerEvent,
    ): PointerMoveOrDown {
        const { clientX, clientY, currentTarget } = event;
        const {
            left,
            top,
            width: realWidth,
            height: realHeight,
        } = currentTarget.getBoundingClientRect();
        const { minX, minY, width, height } = this.puzzle.grid.getCanvasRequirements(this.puzzle);
        // These transformations convert dom coordinates to svg coords
        const x = minX + (clientX - left) * (height / realHeight),
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

    applyLayerEvent(layer: Layer, event: CleanedDOMEvent) {
        const layerEvent: LayerEvent<LayerProps> = {
            ...this.puzzle,
            ...event,
            tempStorage: this.tempStorage || {},
        };

        if (layerEvent.type === "pointerDown" || layerEvent.type === "pointerMove") {
            const points = layer.gatherPoints(layerEvent);
            if (!points?.length) {
                return;
            }
            layerEvent.points = points;
        }

        const { discontinueInput, history } = layer.handleEvent(layerEvent) || {};

        if (
            layerEvent.type === "keyDown" ||
            discontinueInput === true ||
            // On pointer up, layer's have to explicitly request to not discontinue input
            (layerEvent.type === "pointerUp" && discontinueInput !== false)
        ) {
            this.resetControls();
        }

        this.puzzle.storage.addToHistory({
            puzzle: this.puzzle,
            layerId: layer.id,
            actions: history,
        });

        this.puzzle.renderChange({ type: "draw", layerIds: [layer.id] });
    }

    resetControls() {
        this.tempStorage = null;
    }

    onPointerDown(rawEvent: React.PointerEvent) {
        this._drawingOnCanvas = true;
        const layer = this.getCurrentLayer();
        // TODO: allow for two fingers to zoom
        if (!rawEvent.isPrimary || !layer) return;

        this.tempStorage = {};
        const event = this.cleanPointerEvent("pointerDown", rawEvent);
        this.applyLayerEvent(layer, event);
    }

    onPointerMove(rawEvent: React.PointerEvent) {
        const layer = this.getCurrentLayer();
        if (!rawEvent.isPrimary || !layer || !this.tempStorage) return;

        const event = this.cleanPointerEvent("pointerMove", rawEvent);
        this.applyLayerEvent(layer, event);
    }

    onPointerUp(rawEvent: React.PointerEvent) {
        const layer = this.getCurrentLayer();
        if (!rawEvent.isPrimary || !layer || !this.tempStorage) return;

        this.applyLayerEvent(layer, { type: "pointerUp" });
    }

    onPointerLeave(rawEvent: React.PointerEvent) {
        if (!rawEvent.isPrimary || !this.tempStorage) {
            return;
        }

        this.blurCanvasTimeout.after(this.puzzle.settings.actionWindowMs, () => {
            const layer = this.getCurrentLayer();
            if (!layer) return;
            this.applyLayerEvent(layer, { type: "pointerUp" });
        });
    }

    onPointerEnter(event: React.PointerEvent) {
        if (!event.isPrimary || !this.tempStorage) {
            return;
        }

        this.blurCanvasTimeout.clear();
    }

    onContextMenu(event: React.MouseEvent) {
        event.preventDefault();
    }

    handleKeyDown(rawEvent: React.KeyboardEvent) {
        // TODO: Using _focusState.groupIsFocused is reaching into private state. It's needed to allow elements using useFocusElementHandler to accept keyDown events without layers interpreting them.
        if (focusProxy.group !== "layerList" || !_focusState.groupIsFocused) {
            return; // Layer actions should only be handled when the layer list is focused.
        }

        const keypress = keypressString(rawEvent);

        // This should be a very small whitelist for which key-strokes are allowed to be blocked
        if (["ctrl-a", "ctrl-i"].indexOf(keypress) > -1 || keypress.length === 1) {
            rawEvent.preventDefault();
        }

        if (this.tempStorage) {
            // Ignore keyboard events if already handling pointer events
            return;
        }

        let layer = this.getCurrentLayer();
        if (!layer) return;

        if (keypress === "Escape") {
            this.applyLayerEvent(layer, { type: "cancelAction" });
        } else if (keypress === "Delete") {
            this.applyLayerEvent(layer, { type: "delete", keypress });
        } else if (keypress === "ctrl-z" || keypress === "ctrl-y") {
            const { storage } = this.puzzle;
            const appliedActions =
                keypress === "ctrl-z"
                    ? storage.undoHistory(this.puzzle)
                    : storage.redoHistory(this.puzzle);

            if (appliedActions.length) {
                const newLayerId = appliedActions[appliedActions.length - 1].layerId;
                this.puzzle.selectLayer(newLayerId);

                layer = this.getCurrentLayer();
                if (layer)
                    this.applyLayerEvent(layer, {
                        type: "undoRedo",
                        actions: appliedActions,
                    });
            }
        } else {
            this.applyLayerEvent(layer, { type: "keyDown", keypress });
        }
    }

    // This assumes that handlePageFocusOut is called in a timeout and that the timeout runs after onPointerDown does.
    _drawingOnCanvas = false;
    handlePageFocusOut() {
        const layer = this.getCurrentLayer();
        if (!layer || this._drawingOnCanvas) {
            this._drawingOnCanvas = false;
            return;
        }
        this.applyLayerEvent(layer, { type: "cancelAction" });
    }

    // TODO: What are the differences between document.body focusout and page blur? Do I need both, or at least for both to cooperate?
    onPageBlur() {
        const layer = this.getCurrentLayer();
        if (!this.tempStorage || !layer) return;
        this.applyLayerEvent(layer, { type: "pointerUp" });
        this.blurCanvasTimeout.clear();
    }

    onWheel(rawEvent: WheelEvent) {
        if (!rawEvent.ctrlKey && !rawEvent.metaKey) return;
        rawEvent.preventDefault();

        if (rawEvent.deltaMode !== rawEvent.DOM_DELTA_PIXEL)
            errorNotification({
                error: null,
                title: "I don't know what WheelEvent.deltaMode means...",
                message:
                    "FYI, scaling the grid with scrolling might be buggy. Submit a bug report if you get this error.",
                forever: true,
            });

        const sign = rawEvent.deltaY / (Math.abs(rawEvent.deltaY) || 1);
        const { zoom, width } = canvasSizeProxy;
        // TODO: Eventually scale by the magnitude of deltaY and the size of the grid
        const newZoom = clamp(zoom - sign * 0.2, 0, 1);
        canvasSizeProxy.zoom = newZoom;

        const div = rawEvent.currentTarget as HTMLDivElement;
        const conWidth = div.getBoundingClientRect().width;

        const oldWidth = conWidth * (1 - zoom) + zoom * width;
        const newWidth = conWidth * (1 - newZoom) + newZoom * width;
        const ratio = newWidth / oldWidth;

        // TODO: Why is the scrolling position so stuttery?
        const { offsetX, offsetY } = rawEvent;
        const { scrollLeft, scrollTop } = div;
        const left = ratio * (offsetX + scrollLeft) - offsetX;
        const top = ratio * (offsetY + scrollTop) - offsetY;
        div.scroll({ left, top });
    }
}
