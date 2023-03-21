import fc from "fast-check";
import { random, range, shuffle } from "lodash";
import { PartialPointerEvent, _PointerState as PointerState } from "./ControlsManager";
import { Vector } from "./types";
import { zip } from "./utils/data";
import { partialMock } from "./utils/testUtils";

// TODO: Move this definition and the corresponding test to a new file if used in other tests
// TODO: This assumes pointerId's are always incremented and never reused within a short timeframe. This might be true, but it is still an assumption

const asynchronousPointers = () => {
    return fc
        .array(
            fc.record({
                button: fc.constantFrom<1 | 2 | 4>(1, 2, 4),
                move: fc.tuple(fc.integer(), fc.integer()),
            }),
            { minLength: 2 },
        )
        .map((definition) => {
            // TODO: Currently, the random() and shuffle() calls are not determined by fast-check, which might mess with shrinking.
            let n = definition.length;
            const subLengths: number[] = [];
            while (n > 3) {
                const subLength = random(2, n - 2, false);
                subLengths.push(subLength);
                n -= subLength;
            }
            subLengths.push(n);

            const sortedIndexes = subLengths.flatMap((length, index) =>
                [...new Array(length)].map(() => index),
            );
            const randomIndexes = shuffle(sortedIndexes);

            const pointerInfo: Array<{ button: 1 | 2 | 4 }> = subLengths.map(() => ({
                button: 0 as 1,
            }));
            const events: Array<{
                xy: Vector;
                type: "up" | "down" | "move";
                button: 1 | 2 | 4;
                pointerId: number;
            }> = [];

            for (const [position, index, generated] of zip(
                range(randomIndexes.length),
                randomIndexes,
                definition,
            )) {
                const { button, move: xy } = generated;
                if (!pointerInfo[index].button) {
                    pointerInfo[index].button = button;
                    events.push({ pointerId: index + 2, type: "down", button, xy });
                } else if (position === randomIndexes.lastIndexOf(index)) {
                    const b = pointerInfo[index].button;
                    events.push({ pointerId: index + 2, type: "up", button: b, xy });
                } else {
                    const b = pointerInfo[index].button;
                    events.push({ pointerId: index + 2, type: "move", button: b, xy });
                }
            }

            return events;
        });
};

describe("asynchronousPointers", () => {
    it("generates realistic pointer events", () => {
        fc.assert(
            fc.property(asynchronousPointers(), (events) => {
                const nDown = events.filter(({ type }) => type === "down").length;
                const nUp = events.filter(({ type }) => type === "up").length;
                expect(nDown).toBe(nUp);

                const unique = new Set(events.map(({ pointerId }) => pointerId));
                for (const pointerId of unique) {
                    const eventsForPointer = events.filter(({ pointerId: id }) => id === pointerId);
                    expect(eventsForPointer.length).toBeGreaterThanOrEqual(2);

                    const [down, ..._tmp] = eventsForPointer;
                    const [up, ...moves] = [..._tmp].reverse();
                    moves.reverse();

                    expect(down.type).toBe("down");
                    expect(up.type).toBe("up");
                    if (moves.length) {
                        expect(new Set(moves.map(({ type }) => type))).toEqual(new Set(["move"]));
                    }
                }
            }),
        );
    });
});

describe("PointerState", () => {
    const getState = () => {
        const state = new PointerState();
        return { state };
    };

    type Arg1 = { id: number; button?: 1 | 2 | 4; xy?: Vector };
    const event = ({ id, button = 1, xy = [0, 0] }: Arg1) => {
        return partialMock<PartialPointerEvent>({
            buttons: button,
            clientX: xy[0],
            clientY: xy[1],
            pointerId: id,
        });
    };

    // To check that the state reset at the end of every interaction
    const stateOf = (state: PointerState) => JSON.stringify(state);
    const STARTING_STATE = stateOf(getState().state);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { nPointers: _1, ...tmp } = getState().state;
    tmp.mode = "finished";
    const _FINISHED = JSON.stringify(tmp);

    // To check that the state is finished and ignoring all other actions
    const finishedStateOf = (state: PointerState) => {
        const { nPointers, ...tmp } = state;
        const subset = JSON.stringify(tmp);
        return { nPointers, finished: subset === _FINISHED, subset };
    };

    it("handles a simple tap", () => {
        const { state } = getState();
        expect(state.onPointerDown(event({ id: 1, xy: [1, 2] }))).toEqual([
            "down",
            { button: 1, xy: [1, 2] },
        ]);
        expect(state.onPointerUp(event({ id: 1 }))).toEqual(["up", { lastDraw: [1, 2] }]);
        expect(stateOf(state)).toBe(STARTING_STATE);
    });

    it("handles a tap with some movement, which it ignores until pointer up", () => {
        const { state } = getState();
        expect(state.onPointerDown(event({ id: 1, xy: [1, 2] }))).toEqual([
            "down",
            { button: 1, xy: [1, 2] },
        ]);
        expect(state.onPointerMove(event({ id: 1, xy: [3, 4] }))).toEqual(["ignore"]);
        expect(state.onPointerUp(event({ id: 1 }))).toEqual(["up", { lastDraw: [3, 4] }]);
        expect(stateOf(state)).toBe(STARTING_STATE);
    });

    it("delays move events until moving a certain radius from the start", () => {
        const { state } = getState();
        expect(state.onPointerDown(event({ id: 1, xy: [0, 0] }))).toEqual([
            "down",
            { button: 1, xy: [0, 0] },
        ]);
        expect(state.onPointerMove(event({ id: 1, xy: [0, 0] }))).toEqual(["ignore"]);
        expect(state.onPointerMove(event({ id: 1, xy: [0, 19] }))).toEqual(["ignore"]);
        expect(state.onPointerMove(event({ id: 1, xy: [-19, 3] }))).toEqual(["ignore"]);
        expect(state.onPointerMove(event({ id: 1, xy: [17, 10] }))).toEqual(["ignore"]);
        expect(state.onPointerMove(event({ id: 1, xy: [17, 11] }))).toEqual([
            "draw",
            { button: 1, xy: [17, 11] },
        ]);
        expect(state.onPointerMove(event({ id: 1, xy: [17, 10] }))).toEqual([
            "draw",
            { button: 1, xy: [17, 10] },
        ]);
        expect(state.onPointerMove(event({ id: 1, xy: [0, 0] }))).toEqual([
            "draw",
            { button: 1, xy: [0, 0] },
        ]);
        expect(state.onPointerUp(event({ id: 1 }))).toEqual(["up"]);
        expect(stateOf(state)).toBe(STARTING_STATE);
    });

    it("allows panning while drawing (drawPan)", () => {
        const { state } = getState();

        // First pointer can draw
        expect(state.onPointerDown(event({ id: 1, xy: [0, 0] }))).toEqual([
            "down",
            { button: 1, xy: [0, 0] },
        ]);
        expect(state.onPointerMove(event({ id: 1, xy: [21, 0] }))).toEqual([
            "draw",
            { button: 1, xy: [21, 0] },
        ]);

        // Second pointer pans the screen
        expect(state.onPointerDown(event({ id: 2, xy: [10, 10] }))).toEqual(["ignore"]);
        expect(state.onPointerMove(event({ id: 2, xy: [11, 12] }))).toEqual([
            "pan",
            { pan: [-1, -2] },
        ]);
        expect(state.onPointerMove(event({ id: 2, xy: [16, 13] }))).toEqual([
            "pan",
            { pan: [-5, -1] },
        ]);

        // The first pointer can still draw
        expect(state.onPointerMove(event({ id: 1, xy: [1, 2] }))).toEqual([
            "draw",
            { button: 1, xy: [1, 2] },
        ]);

        // Lifting the second pointer still allows drawing
        expect(state.onPointerUp(event({ id: 2 }))).toEqual(["ignore"]);
        expect(state.onPointerMove(event({ id: 1, xy: [2, 1] }))).toEqual([
            "draw",
            { button: 1, xy: [2, 1] },
        ]);

        // Lifting the first pointer ends the interaction
        expect(state.onPointerUp(event({ id: 1 }))).toEqual(["up"]);
        expect(stateOf(state)).toBe(STARTING_STATE);
    });

    it("ignores all other input after the first pointer raises in drawPan mode", () => {
        // Given two pointers used in drawPan mode
        const { state } = getState();
        expect(state.onPointerDown(event({ id: 1, xy: [0, 0] }))).toEqual([
            "down",
            { button: 1, xy: [0, 0] },
        ]);
        // (trigger drawPan)
        expect(state.onPointerMove(event({ id: 1, xy: [21, 0] }))).toEqual([
            "draw",
            { button: 1, xy: [21, 0] },
        ]);
        expect(state.onPointerDown(event({ id: 2, xy: [10, 10] }))).toEqual(["ignore"]);

        // When the first pointer is raised
        expect(state.onPointerUp(event({ id: 1 }))).toEqual(["up"]);

        // Then all other input is ignored and the state is in the "finished" mode
        expect(finishedStateOf(state)).toMatchObject({ finished: true, nPointers: 1 });
        expect(state.onPointerMove(event({ id: 2, xy: [11, 12] }))).toEqual(["ignore"]);
        expect(finishedStateOf(state)).toMatchObject({ finished: true, nPointers: 1 });

        // Cleanup
        expect(state.onPointerUp(event({ id: 2 }))).toEqual(["ignore"]);
        expect(stateOf(state)).toBe(STARTING_STATE);
    });

    it("can begin panZoom with no initial movement", () => {
        const { state } = getState();
        expect(state.onPointerDown(event({ id: 1 }))).toEqual(["down", { button: 1, xy: [0, 0] }]);
        expect(state.onPointerDown(event({ id: 2 }))).toEqual(["up", "cancelDown"]);
        expect(state.mode).toBe("panZoom");
    });

    it("can begin panZoom with some initial movement", () => {
        const { state } = getState();
        expect(state.onPointerDown(event({ id: 1 }))).toEqual(["down", { button: 1, xy: [0, 0] }]);
        expect(state.onPointerMove(event({ id: 1, xy: [15, 0] }))).toEqual(["ignore"]);
        expect(state.onPointerDown(event({ id: 2 }))).toEqual(["up", "cancelDown"]);
        expect(state.mode).toBe("panZoom");
    });

    it("can panZoom with either pointer moving", () => {
        // Given state in panZoom mode
        const { state } = getState();
        state.onPointerDown(event({ id: 1, xy: [10, 11] }));
        state.onPointerDown(event({ id: 2, xy: [20, 21] }));
        expect(state.mode).toBe("panZoom");

        // When the first pointer moves, then it panZooms
        expect(state.onPointerMove(event({ id: 1, xy: [15, 17] }))).toEqual([
            "scale",
            {
                origin: [20, 21],
                from: [10, 11],
                to: [15, 17],
            },
        ]);

        // When the second pointer moves, then it panZooms
        expect(state.onPointerMove(event({ id: 2, xy: [-4, -2] }))).toEqual([
            "scale",
            {
                origin: [15, 17],
                from: [20, 21],
                to: [-4, -2],
            },
        ]);
    });

    it("cancels panZoom when the first pointer is raised", () => {
        // Given state in panZoom mode
        const { state } = getState();
        state.onPointerDown(event({ id: 1, xy: [10, 11] }));
        state.onPointerDown(event({ id: 2, xy: [20, 21] }));
        expect(state.mode).toBe("panZoom");

        // When the first pointer is raised
        expect(state.onPointerUp(event({ id: 1 }))).toEqual(["ignore"]);

        // Then we ignore all other input
        expect(finishedStateOf(state)).toMatchObject({ finished: true, nPointers: 1 });
        expect(state.onPointerMove(event({ id: 2, xy: [20, 22] }))).toEqual(["ignore"]);
        expect(state.mode).toBe("finished");
        expect(state.onPointerMove(event({ id: 2, xy: [10, 11] }))).toEqual(["ignore"]);
        expect(state.mode).toBe("finished");

        // Cleanup
        expect(state.onPointerUp(event({ id: 2 }))).toEqual(["ignore"]);
        expect(stateOf(state)).toBe(STARTING_STATE);
    });

    it("cancels panZoom when the second pointer is raised", () => {
        // Given state in panZoom mode
        const { state } = getState();
        // Just switch the ids to make this easier on myself.
        state.onPointerDown(event({ id: 2, xy: [10, 11] }));
        state.onPointerDown(event({ id: 1, xy: [20, 21] }));
        expect(state.mode).toBe("panZoom");

        // When the second pointer is raised
        expect(state.onPointerUp(event({ id: 1 }))).toEqual(["ignore"]);

        // Then we ignore all other input
        expect(finishedStateOf(state)).toMatchObject({ finished: true, nPointers: 1 });
        expect(state.onPointerMove(event({ id: 2, xy: [20, 22] }))).toEqual(["ignore"]);
        expect(state.mode).toBe("finished");
        expect(state.onPointerMove(event({ id: 2, xy: [10, 11] }))).toEqual(["ignore"]);
        expect(state.mode).toBe("finished");

        // Cleanup
        expect(state.onPointerUp(event({ id: 2 }))).toEqual(["ignore"]);
        expect(stateOf(state)).toBe(STARTING_STATE);
    });

    it("ignores any new pointers when in finished mode", () => {
        // Given state in finished mode
        const { state } = getState();
        state.onPointerDown(event({ id: 1, xy: [10, 11] }));
        state.onPointerDown(event({ id: 2 }));
        state.onPointerUp(event({ id: 2 }));
        expect(state.mode).toBe("finished");

        // Any new pointers do nothing
        expect(state.onPointerDown(event({ id: 3 }))).toEqual(["ignore"]);
        expect(finishedStateOf(state)).toMatchObject({ finished: true, nPointers: 2 });
        expect(state.onPointerMove(event({ id: 3 }))).toEqual(["ignore"]);
        expect(state.onPointerDown(event({ id: 4 }))).toEqual(["ignore"]);
        expect(finishedStateOf(state)).toMatchObject({ finished: true, nPointers: 3 });
        expect(state.onPointerUp(event({ id: 3 }))).toEqual(["ignore"]);
        expect(state.onPointerMove(event({ id: 4 }))).toEqual(["ignore"]);
        expect(finishedStateOf(state)).toMatchObject({ finished: true, nPointers: 2 });

        // Even after raising the original pointer, we ignore everything
        expect(state.onPointerUp(event({ id: 1 }))).toEqual(["ignore"]);
        expect(finishedStateOf(state)).toMatchObject({ finished: true, nPointers: 1 });
        expect(state.onPointerMove(event({ id: 4 }))).toEqual(["ignore"]);
        expect(state.onPointerDown(event({ id: 5 }))).toEqual(["ignore"]);
        expect(state.onPointerMove(event({ id: 5 }))).toEqual(["ignore"]);
        expect(finishedStateOf(state)).toMatchObject({ finished: true, nPointers: 2 });

        // Only when all pointers are raised will state reset to the starting mode
        expect(state.onPointerUp(event({ id: 4 }))).toEqual(["ignore"]);
        expect(finishedStateOf(state)).toMatchObject({ finished: true, nPointers: 1 });
        expect(state.onPointerUp(event({ id: 5 }))).toEqual(["ignore"]);
        expect(stateOf(state)).toBe(STARTING_STATE);
    });

    // TODO: Layers will eventually be able to opt in to move events when the pointer is not down
    it("ignores any pointer move events when the pointer is not down", () => {
        const { state } = getState();
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 1000 }),
                fc.constantFrom<1 | 2 | 4>(1, 2, 4), // Can't wait for typescript 5.0 const generics
                fc.tuple(fc.float(), fc.float()),
                (id, button, xy) => {
                    state.onPointerMove(event({ id, button, xy }));
                    expect(stateOf(state)).toBe(STARTING_STATE);
                },
            ),
        );
    });

    it("always sends an up event before the next down", () => {
        fc.assert(
            fc.property(asynchronousPointers(), (events) => {
                const { state } = getState();
                const actions: string[] = [];

                for (const { button, pointerId, type, xy } of events) {
                    const event: PartialPointerEvent = {
                        buttons: button,
                        clientX: xy[0],
                        clientY: xy[1],
                        pointerId,
                    };
                    let result: readonly [string, unknown] | readonly [string];
                    if (type === "down") {
                        result = state.onPointerDown(event);
                    } else if (type === "up") {
                        result = state.onPointerUp(event);
                    } else {
                        result = state.onPointerMove(event);
                    }
                    actions.push(result[0]);

                    if (result[0] === "ignore") {
                        // The second slot is reserved for internal errors, so if it is empty, there are no (obvious) errors
                        expect(result).toEqual(["ignore"]);
                    }
                }

                const downUp = actions.filter((action) => action === "down" || action === "up");
                expect(downUp.length % 2).toBe(0); // Should be even

                if (downUp.length) {
                    // If the first pair is [down, up]
                    expect(downUp.slice(0, 2)).toEqual(["down", "up"]);
                    // and every pair is equal to the next pair, then we alternate between down and up as expected
                    expect(downUp.slice(2)).toEqual(downUp.slice(0, downUp.length - 2));
                }

                expect(stateOf(state)).toBe(STARTING_STATE);
            }),
        );
    });

    it("only transitions to start mode when going from finished state", () => {
        fc.assert(
            fc.property(asynchronousPointers(), (events) => {
                const { state } = getState();

                let finished = false;
                for (const { button, pointerId, type, xy } of events) {
                    const event: PartialPointerEvent = {
                        buttons: button,
                        clientX: xy[0],
                        clientY: xy[1],
                        pointerId,
                    };
                    if (type === "down") {
                        state.onPointerDown(event);
                    } else if (type === "up") {
                        state.onPointerUp(event);
                    } else {
                        state.onPointerMove(event);
                    }

                    if (state.mode === "finished") {
                        finished = true;
                        expect(finishedStateOf(state)).toMatchObject({ finished: true });
                    } else if (finished) {
                        // Should only transition to start if from finished
                        expect(stateOf(state)).toBe(STARTING_STATE);
                        finished = false;
                    }
                }

                expect(stateOf(state)).toBe(STARTING_STATE);
            }),
        );
    });
});

describe("ControlsManager", () => {
    it.todo("sets the current layer when undoing/redoing");
});
