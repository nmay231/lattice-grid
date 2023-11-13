import { clamp } from "lodash";
import { proxy } from "valtio";
import { PuzzleManager } from "./PuzzleManager";
import { layerIsCurrentCharacterSetting } from "./layers/traits/currentCharacterSetting";
import { layerIsGOOFy } from "./layers/traits/gridOrObjectFirst";
import { canvasSizeProxy } from "./state/canvasSize";
import {
    CleanedDOMEvent,
    Layer,
    LayerEvent,
    LayerProps,
    PointerMoveOrDown,
    TupleVector,
    UnknownObject,
} from "./types";
import { _focusState, focusProxy } from "./utils/focusManagement";
import { Vec, euclidean } from "./utils/math";
import { notify } from "./utils/notifications";
import { DelayedCallback } from "./utils/primitiveWrappers";
import { keypressString } from "./utils/string";

export type PartialPointerEvent = Pick<
    React.PointerEvent,
    "clientX" | "clientY" | "buttons" | "pointerId"
>;

type PointerInfo = { pointerId: number; startClientXY: TupleVector; lastClientXY: TupleVector };

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
                    { button: this.button, xy: [event.clientX, event.clientY] as TupleVector },
                ] as const;
            }
            case "start+second":
                this.mode = "panZoom";
                // We send an "up" event because the layer should not receive a down event (which is still delayed since mode === "start")
                // The reason it's "up" instead of just "cancelDown" is so that there is always a up event for every down (even if the pair is never sent to the layer).
                return ["up", "cancelDown"] as const;
            case "drawPan+second":
                return ["ignore"] as const;
            case "panZoom+first":
            case "panZoom+second":
            case "drawPan+first": {
                return ["ignore", "!invalid state reached!"] as const;
            }
        }
    }

    onPointerMove(event: PartialPointerEvent) {
        if (this.mode === "finished" || !this.button) return ["ignore"] as const;

        const [which, pointer, otherPointer] = this._setPointer(event);

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
                const xy: TupleVector = [event.clientX, event.clientY];
                return ["draw", { xy, button: this.button }] as const;
            }
            case "drawPan+second": {
                const pan = Vec.from(pointer.lastClientXY).minus([event.clientX, event.clientY]).xy;
                return ["pan", { pan }] as const;
            }
            case "panZoom+first":
            case "panZoom+second": {
                // There is technically no panning, but that is handled by scaling in and out with two different origins
                if (!otherPointer) return ["ignore", "!invalid state reached!"] as const;
                const origin = otherPointer.lastClientXY;
                const from = pointer.lastClientXY;
                const to: TupleVector = [event.clientX, event.clientY];

                return ["scale", { origin, from, to }] as const;
            }
            case "start+second": {
                return ["ignore", "!invalid state reached!"] as const;
            }
        }
    }

    onPointerUp(event: PartialPointerEvent) {
        this.nPointers -= 1;
        if (this.mode === "finished") {
            if (this.nPointers <= 0) this.mode = "start";
            return ["ignore"] as const;
        }

        const [which, pointer] = this._getPointer(event);
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
                const mode = this.mode;
                finish();
                if (mode === "start") return ["up", { lastDraw: pointer.lastClientXY }] as const;
                return ["up"] as const;
            }
            case "drawPan+second": {
                this.secondPointer = null;
                return ["ignore"] as const;
            }
            case "panZoom+first":
            case "panZoom+second": {
                finish();
                return ["ignore"] as const;
            }
            case "start+second": {
                return ["ignore", "!invalid state reached!"] as const;
            }
        }
    }

    firstPointer: null | PointerInfo = null;
    secondPointer: null | PointerInfo = null;

    // TODO: split these into get and update so that it's more specific
    _setPointer({ pointerId, clientX, clientY }: PartialPointerEvent) {
        if (pointerId === this.firstPointer?.pointerId) {
            const old = this.firstPointer;
            this.firstPointer = { ...old, lastClientXY: [clientX, clientY] };
            return ["first", old, this.secondPointer] as const;
        } else if (pointerId === this.secondPointer?.pointerId) {
            const old = this.secondPointer;
            this.secondPointer = { ...old, lastClientXY: [clientX, clientY] };
            return ["second", old, this.firstPointer] as const;
        } else if (this.firstPointer === null) {
            const clientXY: TupleVector = [clientX, clientY];
            this.firstPointer = { pointerId, startClientXY: clientXY, lastClientXY: clientXY };
            return ["first", this.firstPointer, this.secondPointer] as const;
        } else if (this.secondPointer === null) {
            const clientXY: TupleVector = [clientX, clientY];
            this.secondPointer = { pointerId, startClientXY: clientXY, lastClientXY: clientXY };
            return ["second", this.secondPointer, this.firstPointer] as const;
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
    tempStorage: UnknownObject = {};
    state = proxy(new _PointerState()); // Wrapped in a proxy to enable debugging pointer positions

    // Canvas event listeners
    eventListeners = {
        onPointerDown: this.onPointerDown.bind(this),
        onPointerMove: this.onPointerMove.bind(this),
        onPointerUp: this.onPointerUp.bind(this),
        // I don't know how to handle leave events since touch interactions always call leave before up.
        // TODO: I will come back to this so that you don't get weird shenanigans when leaving the canvas when drawing with a mouse (it does still work with touch screens).
        // onPointerLeave: this.onPointerLeave.bind(this),
        // onPointerEnter: this.onPointerEnter.bind(this),
        onContextMenu: this.onContextMenu.bind(this),
    };

    constructor(public puzzle: PuzzleManager) {}

    // Is a pointer interaction currently occurring?
    get interactingPointers() {
        return !!this.state.nPointers; // TODO: Move to PointerState?
    }

    getCurrentLayer() {
        const id = this.puzzle.layers.currentKey;
        return id ? this.puzzle.layers.get(id) : null;
    }

    cleanPointerEvent(
        type: "pointerDown" | "pointerMove",
        clientXY: TupleVector,
        event: React.PointerEvent,
    ): PointerMoveOrDown {
        const dom = event.currentTarget.getBoundingClientRect();
        const canvas = canvasSizeProxy;
        const [x, y] = this._dom2svg({ dom, canvas, vector: clientXY });

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
            tempStorage: this.tempStorage,
        };

        if (layerEvent.type === "pointerDown" || layerEvent.type === "pointerMove") {
            const points = layer.gatherPoints(layerEvent);
            if (!points.length) {
                return;
            }
            layerEvent.points = points;
        }

        if (layerEvent.type === "pointerUp") {
            this.tempStorage = {};
        }

        const { history } = layer.handleEvent(layerEvent);

        this.puzzle.storage.addToHistory({
            puzzle: this.puzzle,
            layerId: layer.id,
            actions: history,
        });

        this.puzzle.renderChange({ type: "draw", layerIds: [layer.id] });
    }

    _downCB = new DelayedCallback();

    onPointerDown(rawEvent: React.PointerEvent) {
        this._drawingOnCanvas = true;
        const layer = this.getCurrentLayer();
        const [action, details] = this.state.onPointerDown(rawEvent);
        if (!layer || action === "ignore") return;

        if (action === "up" && details === "cancelDown") {
            // The previous down event was cancelled and changed to panZoom
            return this._downCB.set(null);
        }

        const event = this.cleanPointerEvent("pointerDown", details.xy, rawEvent);
        this._downCB.set(() => this.applyLayerEvent(layer, event));
    }

    _dom2svg({
        dom,
        canvas,
        vector,
    }: {
        dom: Record<"left" | "top" | "width" | "height", number>;
        canvas: Record<"minX" | "minY" | "width" | "height", number>;
        vector: TupleVector;
    }) {
        const { left, top, width: realWidth, height: realHeight } = dom;
        const { minX, minY, width, height } = canvas;
        const [clientX, clientY] = vector;
        // These transformations convert dom coordinates to svg coords
        const x = minX + (clientX - left) * (height / realHeight);
        const y = minY + (clientY - top) * (width / realWidth);
        return [x, y] as TupleVector;
    }

    onPointerMove(rawEvent: React.PointerEvent) {
        const layer = this.getCurrentLayer();
        const [action, details] = this.state.onPointerMove(rawEvent);
        if (!layer || action === "ignore") return;

        // TODO: Better way to access scrollArea (I don't care right now)
        const scrollArea = rawEvent.currentTarget.parentElement!.parentElement!.parentElement!;

        if (action === "pan") {
            scrollArea.scrollBy({
                left: details.pan[0],
                top: details.pan[1],
            });
        } else if (action === "scale") {
            const dom = scrollArea.getBoundingClientRect();
            const canvas = canvasSizeProxy;
            const { origin, from, to } = details;

            const originVector = Vec.from(origin);
            const scale = originVector.minus(to).size / originVector.minus(from).size;

            const unclampedZoom =
                (scale * canvas.zoom * canvas.width + (scale * (1 - canvas.zoom) - 1) * dom.width) /
                (canvas.width - dom.width);

            // TODO: Reimplement unclamped Zoom so you can "zoom in further than allowed". Requires PointerState acknowledging when panZoom is finished
            // canvas.unclampedZoom = unclampedZoom;
            canvas.zoom = clamp(unclampedZoom, 0, 1);
            // canvas.zoom = 1;

            const translate = Vec.from(from).minus(to).scale(0.5);
            let { scrollLeft: left, scrollTop: top } = scrollArea;
            if (0 < canvas.zoom && canvas.zoom < 1) {
                left = scale * left + originVector.scale(scale - 1).x + translate.x;
                top = scale * top + originVector.scale(scale - 1).y + translate.y;
            } else {
                left += translate.x;
                top += translate.y;
            }

            this._scrollAfterZoom(() => scrollArea.scrollTo({ left, top }));
        } else if (action === "draw") {
            this._downCB.call();
            const event = this.cleanPointerEvent("pointerMove", details.xy, rawEvent);
            this.applyLayerEvent(layer, event);
        }
    }

    onPointerUp(rawEvent: React.PointerEvent) {
        const layer = this.getCurrentLayer();
        const [action, details] = this.state.onPointerUp(rawEvent);
        if (!layer || action === "ignore") return;

        this._downCB.call();
        if (details) {
            // TODO: This is technically using the pointerUp event for some of the details, but it should be the same.
            const event = this.cleanPointerEvent("pointerMove", details.lastDraw, rawEvent);
            this.applyLayerEvent(layer, event);
        }
        this.applyLayerEvent(layer, { type: "pointerUp" });
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
            // Keyboard shortcuts should still be preventDefault'ed even if we are handling pointer events
            rawEvent.preventDefault();
        }

        if (this.interactingPointers) {
            // Ignore keyboard events if already handling pointer events
            return;
        }

        this.handleKeyPress(keypress);
    }

    handleKeyPress(keypress: string) {
        let layer = this.getCurrentLayer();
        if (!layer) return;

        if (keypress === "ctrl-`") {
            if (this.puzzle.settings.pageMode === "edit") {
                const nowDebugging = !this.puzzle.settings.debugging;
                this.puzzle.settings.debugging = nowDebugging;
                this.puzzle.layers.selectable = nowDebugging
                    ? () => true
                    : (layer) => !layer.klass.ethereal;
            }
        } else if (keypress === "ctrl-z" || keypress === "ctrl-y") {
            const { storage } = this.puzzle;
            const appliedActions =
                keypress === "ctrl-z"
                    ? storage.undoHistory(this.puzzle)
                    : storage.redoHistory(this.puzzle);

            if (appliedActions.length) {
                const lastAction = appliedActions[appliedActions.length - 1];
                this.puzzle.selectLayer(lastAction.layerId);
                this.puzzle.settings.editMode = lastAction.storageMode;

                layer = this.getCurrentLayer();
                if (layer)
                    this.applyLayerEvent(layer, {
                        type: "undoRedo",
                        actions: appliedActions,
                    });
            }
        } else if (layerIsGOOFy(layer)) {
            if (layerIsCurrentCharacterSetting(layer)) {
                const value = keypress === "Delete" ? null : keypress;
                if (layer.klass.isValidSetting("currentCharacter", value)) {
                    layer.settings.currentCharacter = value;
                }
            } else {
                return;
            }

            if (layer.settings.gridOrObjectFirst === "grid") {
                const { history } = layer.eventPlaceSinglePointObjects({
                    grid: this.puzzle.grid,
                    settings: this.puzzle.settings,
                    storage: this.puzzle.storage,
                });

                this.puzzle.storage.addToHistory({
                    puzzle: this.puzzle,
                    layerId: layer.id,
                    actions: history,
                });

                this.puzzle.renderChange({ type: "draw", layerIds: [layer.id] });
            }

            // TODO: Migrate the following to use the replacements for handleEvent
        } else if (keypress === "Escape") {
            this.applyLayerEvent(layer, { type: "cancelAction" });
        } else if (keypress === "Delete") {
            this.applyLayerEvent(layer, { type: "delete", keypress });
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
        if (!this.interactingPointers || !layer) return;
        this.applyLayerEvent(layer, { type: "pointerUp" });
        // this.blurCanvasTimeout.clear();
    }

    onWheel(rawEvent: WheelEvent) {
        if (!rawEvent.ctrlKey && !rawEvent.metaKey) return;
        rawEvent.preventDefault();

        if (this.interactingPointers) return; // Don't draw and zoom at the same time

        if (rawEvent.deltaMode !== rawEvent.DOM_DELTA_PIXEL) {
            throw notify.error({
                title: "Submit a bug report if you get this error.",
                message: `TODO: I need to handle WheelEvent.deltaMode=${rawEvent.deltaMode}`,
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
