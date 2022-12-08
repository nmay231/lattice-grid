import { clamp } from "lodash";
import { getCanvasSize, setCanvasSize } from "../atoms/canvasSize";
import { Layers } from "../atoms/layers";
import { getSettings } from "../atoms/settings";
import { blocklyModalIsOpen, setBlocklyModalOpen } from "../components/Blockly/BlocklyModal";
import {
    CleanedDOMEvent,
    Layer,
    LayerEvent,
    LayerProps,
    PointerMoveOrDown,
    UnknownObject,
} from "../types";
import { errorNotification } from "../utils/DOMUtils";
import { keypressString } from "../utils/stringUtils";
import { PuzzleManager } from "./PuzzleManager";

export class ControlsManager {
    blurCanvasTimeoutId: number | undefined = undefined;
    tempStorage: Record<string, UnknownObject> | null = null;
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

    getCurrentLayer() {
        const { currentLayerId } = Layers.state;

        return currentLayerId === null ? null : this.puzzle.layers[currentLayerId];
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
        const { minX, minY, width, height } = this.puzzle.grid.getCanvasRequirements();
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
        const { grid, storage } = this.puzzle;
        const layerEvent: LayerEvent<LayerProps> = {
            ...event,
            grid,
            storage,
            settings: getSettings(),
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

        storage.addToHistory({ puzzle: this.puzzle, layerId: layer.id, actions: history });

        this.puzzle.renderChange({ type: "draw", layerIds: [layer.id] });
    }

    resetControls() {
        this.tempStorage = null;
    }

    selectLayer(...arg: Parameters<typeof Layers["selectLayer"]>) {
        const oldId = Layers.state.currentLayerId;
        const newId = Layers.selectLayer(...arg);
        if (oldId !== newId) {
            // TODO: This will eventually just change out the overlay blits instead of this
            this.puzzle.renderChange({ type: "switchLayer" });
        }
    }

    onPointerDown(rawEvent: React.PointerEvent) {
        // TODO: allow for two fingers to zoom
        if (!rawEvent.isPrimary) {
            return;
        }
        const layer = this.getCurrentLayer();
        if (!layer) return;
        this.tempStorage = {};
        const event = this.cleanPointerEvent("pointerDown", rawEvent);
        this.applyLayerEvent(layer, event);
    }

    onPointerMove(rawEvent: React.PointerEvent) {
        if (!rawEvent.isPrimary || !this.tempStorage) {
            return;
        }

        const layer = this.getCurrentLayer();
        if (!layer) return;
        const event = this.cleanPointerEvent("pointerMove", rawEvent);
        this.applyLayerEvent(layer, event);
    }

    onPointerUp(rawEvent: React.PointerEvent) {
        if (!rawEvent.isPrimary || !this.tempStorage) {
            return;
        }

        const layer = this.getCurrentLayer();
        if (!layer) return;
        this.applyLayerEvent(layer, { type: "pointerUp" });
    }

    onPointerLeave(rawEvent: React.PointerEvent) {
        if (!rawEvent.isPrimary || !this.tempStorage) {
            return;
        }

        window.clearTimeout(this.blurCanvasTimeoutId);
        const timeoutDelay = getSettings().actionWindowMs;
        this.blurCanvasTimeoutId = window.setTimeout(() => {
            const layer = this.getCurrentLayer();
            if (!layer) return;
            this.applyLayerEvent(layer, { type: "pointerUp" });
        }, timeoutDelay) as unknown as number;
    }

    onPointerEnter(event: React.PointerEvent) {
        if (!event.isPrimary || !this.tempStorage) {
            return;
        }

        window.clearTimeout(this.blurCanvasTimeoutId);
    }

    onContextMenu(event: React.MouseEvent) {
        event.preventDefault();
    }

    handleKeyDown(rawEvent: React.KeyboardEvent) {
        const keypress = keypressString(rawEvent);

        // TODO: Remove. It's just a temporary convenience
        if (keypress === "ctrl-p") {
            rawEvent.preventDefault();
            setBlocklyModalOpen((x) => !x);
        }

        // TODO: Check for when anything in the sidebar is focused
        if (blocklyModalIsOpen()) return; // Do not preventDefault when the puzzle is not focused

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

        let layer = this.getCurrentLayer();
        if (!layer) return;

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
            const { storage } = this.puzzle;
            const appliedActions =
                keypress === "ctrl-z"
                    ? storage.undoHistory(this.puzzle)
                    : storage.redoHistory(this.puzzle);

            if (appliedActions.length) {
                const newLayerId = appliedActions[appliedActions.length - 1].layerId;
                this.selectLayer({ id: newLayerId });

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

    onPointerUpOutside(rawEvent: React.PointerEvent) {
        if (rawEvent.isPrimary && (rawEvent.target as any)?.id === "canvas-container") {
            const layer = this.getCurrentLayer();
            if (!layer) return;
            this.applyLayerEvent(layer, { type: "cancelAction" });
        }
    }

    onWheel(rawEvent: WheelEvent) {
        if (!rawEvent.ctrlKey && !rawEvent.metaKey) return;
        rawEvent.preventDefault();

        if (rawEvent.deltaMode !== rawEvent.DOM_DELTA_PIXEL)
            // TODO: How to show only once?
            errorNotification({
                title: "I don't know what WheelEvent.deltaMode means...",
                message:
                    "FYI, scaling the grid with scrolling might be buggy. Submit a bug report if you get this error.",
                forever: true,
            });

        const sign = rawEvent.deltaY / (Math.abs(rawEvent.deltaY) || 1);
        const { zoom, width, ...theRest } = getCanvasSize();
        // TODO: Eventually scale by the magnitude of deltaY and the size of the grid
        const newZoom = clamp(zoom - sign * 0.2, 0, 1);
        setCanvasSize({ ...theRest, width, zoom: newZoom });

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

    onPageBlur() {
        if (!this.tempStorage) {
            return;
        }

        const layer = this.getCurrentLayer();
        if (!layer) return;
        this.applyLayerEvent(layer, { type: "pointerUp" });
        window.clearTimeout(this.blurCanvasTimeoutId);
    }
}
