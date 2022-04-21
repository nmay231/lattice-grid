import { HistorySlice, StorageManager } from "./StorageManager";

describe("StorageManager", () => {
    const getNormalStorage = () => {
        const normalStorage = new StorageManager();
        normalStorage.addStorage({
            grid: { id: "grid" },
            layer: { id: "layer1" },
        });
        normalStorage.addStorage({
            grid: { id: "grid" },
            layer: { id: "layer2" },
        });

        return normalStorage;
    };

    it("should add a new object correctly", () => {
        const storage = getNormalStorage();
        const { objects, renderOrder } = storage.getStored({
            grid: { id: "grid" },
            layer: { id: "layer1" },
        });
        const slice: HistorySlice = {
            id: "objectId",
            layerId: "layer1",
            undo: { object: null, renderIndex: -1 },
            redo: { object: { asdf: "something" }, renderIndex: 0 },
        };
        storage._ApplyHistoryAction(objects, renderOrder, slice, "redo");

        expect(storage.objects["grid"]["layer1"]).toMatchInlineSnapshot(`
            Object {
              "objects": Object {
                "objectId": Object {
                  "asdf": "something",
                  "id": "objectId",
                },
              },
              "renderOrder": Array [
                "objectId",
              ],
            }
        `);
    });

    it("should delete an object correctly", () => {
        const storage = getNormalStorage();
        const { objects, renderOrder } = storage.getStored({
            grid: { id: "grid" },
            layer: { id: "layer1" },
        });
        const slice: HistorySlice = {
            id: "objectId",
            layerId: "layer1",
            undo: { object: { asdf: "something" }, renderIndex: 0 },
            redo: { object: null, renderIndex: -1 },
        };
        storage._ApplyHistoryAction(objects, renderOrder, slice, "redo");

        expect(storage.objects["grid"]["layer1"]).toMatchInlineSnapshot(`
            Object {
              "objects": Object {},
              "renderOrder": Array [],
            }
        `);
    });

    it("object placement should be idempotent", () => {
        const storage = getNormalStorage();
        const { objects, renderOrder } = storage.getStored({
            grid: { id: "grid" },
            layer: { id: "layer1" },
        });
        const slice: HistorySlice = {
            id: "objectId",
            layerId: "layer1",
            undo: { object: null, renderIndex: -1 },
            redo: { object: { asdf: "something" }, renderIndex: 0 },
        };
        storage._ApplyHistoryAction(objects, renderOrder, slice, "redo");
        storage._ApplyHistoryAction(objects, renderOrder, slice, "redo");

        expect(storage.objects["grid"]["layer1"]).toMatchInlineSnapshot(`
            Object {
              "objects": Object {
                "objectId": Object {
                  "asdf": "something",
                  "id": "objectId",
                },
              },
              "renderOrder": Array [
                "objectId",
              ],
            }
        `);
    });

    it("object deletion should be idempotent", () => {
        const storage = getNormalStorage();
        const { objects, renderOrder } = storage.getStored({
            grid: { id: "grid" },
            layer: { id: "layer1" },
        });
        const slice: HistorySlice = {
            id: "objectId",
            layerId: "layer1",
            undo: { object: { asdf: "something" }, renderIndex: 0 },
            redo: { object: null, renderIndex: -1 },
        };
        storage._ApplyHistoryAction(objects, renderOrder, slice, "redo");
        storage._ApplyHistoryAction(objects, renderOrder, slice, "redo");

        expect(storage.objects["grid"]["layer1"]).toMatchInlineSnapshot(`
            Object {
              "objects": Object {},
              "renderOrder": Array [],
            }
        `);
    });

    it("should not undo or redo when empty", () => {
        const storage = getNormalStorage();
        storage.undoHistory("grid");
        expect(storage.histories).toMatchInlineSnapshot(`
            Object {
              "grid": Object {
                "actions": Array [],
                "index": 0,
              },
            }
        `);
        storage.redoHistory("grid");
        expect(storage.histories).toMatchInlineSnapshot(`
            Object {
              "grid": Object {
                "actions": Array [],
                "index": 0,
              },
            }
        `);
    });

    it("should undo/redo a batch of actions", () => {
        const storage = getNormalStorage();

        storage.addToHistory({ id: "grid" }, { id: "layer1" }, [
            { id: "id1", object: { asdf: "something1" } },
            { id: "id2", object: { asdf: "something2" }, batchId: 1 },
            { id: "id3", object: { asdf: "something3" }, batchId: 1 },
            { id: "id4", object: { asdf: "something4" } },
        ]);

        storage.undoHistory("grid");
        // Ensure the initial state is good
        expect(storage.objects).toMatchInlineSnapshot(`
            Object {
              "grid": Object {
                "layer1": Object {
                  "objects": Object {
                    "id1": Object {
                      "asdf": "something1",
                      "id": "id1",
                    },
                    "id2": Object {
                      "asdf": "something2",
                      "id": "id2",
                    },
                    "id3": Object {
                      "asdf": "something3",
                      "id": "id3",
                    },
                  },
                  "renderOrder": Array [
                    "id1",
                    "id2",
                    "id3",
                  ],
                },
                "layer2": Object {
                  "objects": Object {},
                  "renderOrder": Array [],
                },
              },
            }
        `);

        storage.undoHistory("grid");
        // Undo a batch of actions
        expect(storage.objects).toMatchInlineSnapshot(`
            Object {
              "grid": Object {
                "layer1": Object {
                  "objects": Object {
                    "id1": Object {
                      "asdf": "something1",
                      "id": "id1",
                    },
                  },
                  "renderOrder": Array [
                    "id1",
                  ],
                },
                "layer2": Object {
                  "objects": Object {},
                  "renderOrder": Array [],
                },
              },
            }
        `);

        storage.redoHistory("grid");
        // Undo a batch of actions
        expect(storage.objects).toMatchInlineSnapshot(`
            Object {
              "grid": Object {
                "layer1": Object {
                  "objects": Object {
                    "id1": Object {
                      "asdf": "something1",
                      "id": "id1",
                    },
                    "id2": Object {
                      "asdf": "something2",
                      "id": "id2",
                    },
                    "id3": Object {
                      "asdf": "something3",
                      "id": "id3",
                    },
                  },
                  "renderOrder": Array [
                    "id1",
                    "id2",
                    "id3",
                  ],
                },
                "layer2": Object {
                  "objects": Object {},
                  "renderOrder": Array [],
                },
              },
            }
        `);
    });

    // TODO
    it.todo("should not undo past the limits of history");
    it.todo("should not redo past the limits of history");
    it.todo(
        "should undo a single object action (make sure it is undoing/redoing right on the boundary to test that case as well)",
    );
    it.todo(
        "should redo a single object action (make sure it is undoing/redoing right on the boundary to test that case as well)",
    );
    it.todo(
        "should not undo actions that are not batched (handle both being undefined, one being undefined, both defined but not equal)",
    );
    it.todo(
        "should not redo actions that are not batched (handle both being undefined, one being undefined, both defined but not equal)",
    );
});
