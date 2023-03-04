import { clamp } from "lodash";
import { proxy } from "valtio";
import { euclidean } from "./algorithms/hopStraight";
import { PuzzleManager } from "./PuzzleManager";
import { canvasSizeProxy } from "./state/canvasSize";
import {
    CleanedDOMEvent,
    Layer,
    LayerEvent,
    LayerProps,
    PointerMoveOrDown,
    UnknownObject,
    Vector,
} from "./types";
import { errorNotification } from "./utils/DOMUtils";
import { focusProxy, _focusState } from "./utils/focusManagement";
import { LatestTimeout } from "./utils/LatestTimeout";
import { keypressString } from "./utils/stringUtils";

export type PartialPointerEvent = Pick<
    React.PointerEvent,
    "clientX" | "clientY" | "buttons" | "pointerId"
>;

// TODO: Maybe this should just be part of the Vector class, if I want to implement that
const diff = (a: Vector, b: Vector) => [a[0] - b[0], a[1] - b[1]] as Vector;

export class _PointerState {
    nPointers = 0;
    /**
     * 0, 1, 2, 4 are: nothing pressed yet, left click, right click, middle click, respectively.
     * Non-mouse pointers are mapped to their obvious matches by the browser
     */
    button: 0 | 1 | 2 | 4 = 0;

    /**
     * - **start**: No pointers down; or one pointer down and we don't know if it's a pan/zoom or not yet
     * - **panZoom**: Pan and zoom. Raising either pointer goes to the finished state
     * - **drawPan**: Switch between drawing and panning (using a skateboard-like interaction). Raising the first pointer goes to the finished state
     * - **finished**: The interaction is finished, but we are waiting for all pointers to leave the screen.
     */
    mode: "start" | "panZoom" | "drawPan" | "finished" = "start";

    onPointerDown(event: PartialPointerEvent) {
        this.nPointers += 1;
        if (this.mode === "finished") return ["ignore"] as const;

        const [which] = this._setPointer(event);

        // More than two pointers already
        if (which === "ignore") return ["ignore"] as const;

        switch (`${this.mode}+${which}` as const) {
            case "start+first": {
                if (!this.button) {
                    if (1 & event.buttons) this.button = 1; // left click
                    else if (2 & event.buttons) this.button = 2; // right click
                    else if (4 & event.buttons) this.button = 4; // middle click
                    else return ["ignore"] as const;
                }

                return [
                    "down",
                    { button: this.button, xy: [event.clientX, event.clientY] as Vector },
                ] as const;
            }
            case "start+second":
                this.mode = "panZoom";
                return ["ignore"] as const;
            case "drawPan+second":
                return ["ignore"] as const;
            case "panZoom+first":
            case "panZoom+second":
            case "drawPan+first": {
                // TODO: Remove once I add tests for this code.
                throw errorNotification({
                    error: null,
                    message: `Logical error in PointerState: mode=${this.mode}, whichPointer=${which}`,
                });
                // // These states should never happen.
                // return ["ignore"] as const;
            }
        }
    }

    onPointerMove(event: PartialPointerEvent) {
        if (this.mode === "finished" || !this.button) return ["ignore"] as const;

        const [which, pointer] = this._setPointer(event);

        // More than two pointers already
        if (which === "ignore") return ["ignore"] as const;

        switch (`${this.mode}+${which}` as const) {
            case "drawPan+first":
            case "start+first": {
                if (
                    this.mode === "start" &&
                    euclidean(...pointer.startClientXY, event.clientX, event.clientY) <= 20
                ) {
                    return ["ignore"] as const;
                }
                this.mode = "drawPan";
                return [
                    "drawPan",
                    { xy: [event.clientX, event.clientY] as Vector, panBy: [0, 0] as Vector },
                ] as const;
            }
            case "panZoom+first":
            case "panZoom+second":
            case "drawPan+second": {
                const panBy: Vector =
                    which === "first"
                        ? [0, 0]
                        : diff(pointer.clientXY, [event.clientX, event.clientY]);
                let scale = 1;
                if (this.mode === "panZoom") {
                    scale = 1; // TODO: Calculate by starting clientXY so that floating point error doesn't accumulate
                }
                return ["panZoom", { panBy, scale }] as const;
            }
            case "start+second": {
                // TODO: Remove once I add tests for this code.
                throw errorNotification({
                    error: null,
                    message: `Logical error in PointerInputState: mode=${this.mode}, whichPointer=${which}`,
                });
                // // These states should never happen.
                // return ["ignore"] as const;
            }
        }
    }

    onPointerUp(event: PartialPointerEvent) {
        this.nPointers -= 1;
        if (this.mode === "finished") {
            if (this.nPointers <= 0) this.mode = "start";
            return ["ignore"] as const;
        }

        const [which] = this._getPointer(event);
        // More than two pointers already
        if (which === "ignore") return ["ignore"] as const;

        const finish = () => {
            this.button = 0;
            this.mode = this.nPointers <= 0 ? "start" : "finished";
            this.firstPointer = this.secondPointer = null;
        };

        switch (`${this.mode}+${which}` as const) {
            case "drawPan+first":
            case "start+first": {
                finish();
                return ["up"] as const;
            }
            case "drawPan+second":
            case "panZoom+first":
            case "panZoom+second": {
                finish();
                return ["ignore"] as const;
            }
            case "start+second": {
                // TODO: Remove once I add tests for this code.
                throw errorNotification({
                    error: null,
                    message: `Logical error in PointerInputState: mode=${this.mode}, whichPointer=${which}`,
                });
                // // These states should never happen.
                // return ["ignore"] as const;
            }
        }
    }

    firstPointer: null | { pointerId: number; startClientXY: Vector; clientXY: Vector } = null;
    secondPointer: null | { pointerId: number; startClientXY: Vector; clientXY: Vector } = null;

    // TODO: split these into get and update so that it's more specific
    _setPointer({ pointerId, clientX, clientY }: PartialPointerEvent) {
        if (pointerId === this.firstPointer?.pointerId) {
            const old = this.firstPointer;
            this.firstPointer = { ...old, clientXY: [clientX, clientY] };
            return ["first", old] as const;
        } else if (pointerId === this.secondPointer?.pointerId) {
            const old = this.secondPointer;
            this.secondPointer = { ...old, clientXY: [clientX, clientY] };
            return ["second", old] as const;
        } else if (this.firstPointer === null) {
            const clientXY: Vector = [clientX, clientY];
            this.firstPointer = { pointerId, startClientXY: clientXY, clientXY };
            return ["first", this.firstPointer] as const;
        } else if (this.secondPointer === null) {
            const clientXY: Vector = [clientX, clientY];
            this.secondPointer = { pointerId, startClientXY: clientXY, clientXY };
            return ["second", this.secondPointer] as const;
        }
        return ["ignore"] as const;
    }

    _getPointer({ pointerId }: PartialPointerEvent) {
        if (pointerId === this.firstPointer?.pointerId) {
            return ["first", this.firstPointer] as const;
        }
        if (pointerId === this.secondPointer?.pointerId) {
            return ["second", this.secondPointer] as const;
        }
        return ["ignore"] as const;
    }
}
export class ControlsManager {
    blurCanvasTimeout = new LatestTimeout();
    tempStorage: Record<string, UnknownObject> | null = null;
    // This is a proxy to enable debugging pointer positions
    state = proxy(new _PointerState());

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
        clientXY: Vector,
        event: React.PointerEvent,
    ): PointerMoveOrDown {
        const [clientX, clientY] = clientXY;
        const {
            left,
            top,
            width: realWidth,
            height: realHeight,
        } = event.currentTarget.getBoundingClientRect();
        const { minX, minY, width, height } = this.puzzle.grid.getCanvasRequirements(this.puzzle);
        // These transformations convert dom coordinates to svg coords
        const x = minX + (clientX - left) * (height / realHeight);
        const y = minY + (clientY - top) * (width / realWidth);

        // TODO: Should I actually remember which meta keys were held down on pointer down?
        const { altKey, ctrlKey, shiftKey } = event;
        return {
            type,
            cursor: { x, y },
            altKey,
            ctrlKey,
            shiftKey,
            points: [], // Technically pointless (heh), but it's easier on typescript
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
        const [action, details] = this.state.onPointerDown(rawEvent);
        if (!layer || action === "ignore") return;

        this.tempStorage = {};
        const event = this.cleanPointerEvent("pointerDown", details.xy, rawEvent);
        this.applyLayerEvent(layer, event);
    }

    onPointerMove(rawEvent: React.PointerEvent) {
        const layer = this.getCurrentLayer();
        const [action, details] = this.state.onPointerMove(rawEvent);
        if (!layer || !this.tempStorage || action === "ignore") return;

        if (action === "panZoom") {
            // TODO:
            // canvasSizeProxy.zoom = this._newZoomFromScaleFactor(canvasSizeProxy.zoom,details.scale);
            this._scrollAfterZoom(() => rawEvent.currentTarget.scrollBy(...details.panBy));
        } else if (action === "drawPan") {
            rawEvent.currentTarget.scrollBy(...details.panBy);
            const event = this.cleanPointerEvent("pointerMove", details.xy, rawEvent);
            this.applyLayerEvent(layer, event);
        }
    }

    onPointerUp(rawEvent: React.PointerEvent) {
        const layer = this.getCurrentLayer();
        const [action] = this.state.onPointerUp(rawEvent);
        if (!layer || !this.tempStorage || action === "ignore") return;

        this.applyLayerEvent(layer, { type: "pointerUp" });
    }

    onPointerLeave(rawEvent: React.PointerEvent) {
        // const [action, details] = this.state.onPointerDown(rawEvent)
        if (!this.tempStorage) {
            return;
        }

        this.blurCanvasTimeout.after(this.puzzle.settings.actionWindowMs, () => {
            const layer = this.getCurrentLayer();
            if (!layer) return;
            this.applyLayerEvent(layer, { type: "pointerUp" });
        });
    }

    onPointerEnter(event: React.PointerEvent) {
        // const [action, details] = this.state.onPointerDown(rawEvent)
        if (!this.tempStorage) {
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
        } else if (keypress === "ctrl-`") {
            if (this.puzzle.settings.pageMode === "edit") {
                const nowDebugging = !this.puzzle.settings.debugging;
                this.puzzle.settings.debugging = nowDebugging;
                this.puzzle.layers.selectable = nowDebugging
                    ? () => true
                    : (layer) => !layer.ethereal;
            }
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

    onPageBlur() {
        const layer = this.getCurrentLayer();
        if (!this.tempStorage || !layer) return;
        this.applyLayerEvent(layer, { type: "pointerUp" });
        this.blurCanvasTimeout.clear();
    }

    onWheel(rawEvent: WheelEvent) {
        if (!rawEvent.ctrlKey && !rawEvent.metaKey) return;
        rawEvent.preventDefault();

        if (rawEvent.deltaMode !== rawEvent.DOM_DELTA_PIXEL) {
            throw errorNotification({
                error: null,
                title: "Submit a bug report if you get this error.",
                message: `TODO: I need to handle WheelEvent.deltaMode=${rawEvent.deltaMode}`,
                forever: true,
            });
        }

        const scrollArea = rawEvent.currentTarget as HTMLDivElement;
        const areaWidth = scrollArea.getBoundingClientRect().width;
        const { zoom, width } = canvasSizeProxy;

        // If the grid is large compared to the screen, you want to zoom in/out more than for smaller grids
        const gridPercentageKinda = clamp(areaWidth / width, 0, 1);

        // TODO: Make this a setting (values range from `(0, Infinity]`, if you ignore the fact that the values are clamped below)
        const zoomSensitivity = 1;
        // Faster scroll means quicker zoom
        const scrollSpeed = clamp((-rawEvent.deltaY * zoomSensitivity) / 200, -5, 5);

        const newZoom = clamp(zoom + gridPercentageKinda * scrollSpeed, 0, 1);
        canvasSizeProxy.zoom = newZoom;

        // Now that the scale has changed, we need to scroll so the cursor is still in the same position in the grid as before
        const oldWidth = areaWidth * (1 - zoom) + zoom * width;
        const newWidth = areaWidth * (1 - newZoom) + newZoom * width;
        const ratio = newWidth / oldWidth;

        const { offsetX, offsetY } = rawEvent;
        let { scrollLeft: left, scrollTop: top } = scrollArea;
        left += -offsetX + ratio * offsetX;
        top += -offsetY + ratio * offsetY;

        this._scrollAfterZoom(() => scrollArea.scrollTo({ left, top }));
    }

    _scrollAfterZoom(fn: () => void) {
        // Wrapping in microtasks twice runs the function after valtio triggers a rerender of zoom using a promise (first wrap) and after React finishes rendering (second wrap)
        queueMicrotask(() => queueMicrotask(fn));
    }
}
