import { SquareGrid } from "./SquareGrid";

describe("SquareGrid", () => {
    const settings = {
        cellSize: 60,
        borderPadding: 10,
    };
    const smallGrid = new SquareGrid(settings, { width: 2, height: 2 });
    const mediumGrid = new SquareGrid(settings, { width: 10, height: 10 });

    it("knows points are within bounds", () => {
        expect(mediumGrid._outOfBounds({ x: 1, y: 1 })).toEqual(false);
        expect(mediumGrid._outOfBounds({ x: 1, y: 19 })).toEqual(false);
        expect(mediumGrid._outOfBounds({ x: 19, y: 1 })).toEqual(false);
        expect(mediumGrid._outOfBounds({ x: 19, y: 19 })).toEqual(false);
    });

    it("knows points are outside bounds", () => {
        expect(mediumGrid._outOfBounds({ x: -1, y: -1 })).toEqual(true);
        expect(mediumGrid._outOfBounds({ x: 10, y: 21 })).toEqual(true);
        expect(mediumGrid._outOfBounds({ x: 21, y: 10 })).toEqual(true);
        expect(mediumGrid._outOfBounds({ x: 1000000, y: 1000000 })).toEqual(
            true
        );
    });

    it("converts ids to points", () => {
        const points = mediumGrid.convertIdAndPoints({
            idToPoints: "1,1,1,3,1,5,3,5",
        } as any);
        expect(points).toEqual(["1,1", "1,3", "1,5", "3,5"]);
    });

    it("converts points to ids", () => {
        const ids = mediumGrid.convertIdAndPoints({
            pointsToId: ["1,1", "1,3", "1,5", "3,5"],
        } as any);
        expect(ids).toEqual("1,1,1,3,1,5,3,5");
    });

    it("generates all cell grid points", () => {
        const cells = smallGrid._getAllGridPoints("cells");
        expect(cells).toMatchInlineSnapshot(`
            Array [
              Object {
                "type": "cells",
                "x": 1,
                "y": 1,
              },
              Object {
                "type": "cells",
                "x": 1,
                "y": 3,
              },
              Object {
                "type": "cells",
                "x": 3,
                "y": 1,
              },
              Object {
                "type": "cells",
                "x": 3,
                "y": 3,
              },
            ]
        `);
    });

    it("generates all corner grid points", () => {
        const corners = smallGrid._getAllGridPoints("corners");
        expect(corners).toMatchInlineSnapshot(`
            Array [
              Object {
                "type": "corners",
                "x": 0,
                "y": 0,
              },
              Object {
                "type": "corners",
                "x": 0,
                "y": 2,
              },
              Object {
                "type": "corners",
                "x": 0,
                "y": 4,
              },
              Object {
                "type": "corners",
                "x": 2,
                "y": 0,
              },
              Object {
                "type": "corners",
                "x": 2,
                "y": 2,
              },
              Object {
                "type": "corners",
                "x": 2,
                "y": 4,
              },
              Object {
                "type": "corners",
                "x": 4,
                "y": 0,
              },
              Object {
                "type": "corners",
                "x": 4,
                "y": 2,
              },
              Object {
                "type": "corners",
                "x": 4,
                "y": 4,
              },
            ]
        `);
    });

    it("generates all edge grid points", () => {
        const edges = smallGrid._getAllGridPoints("edges");
        expect(edges).toMatchInlineSnapshot(`
            Array [
              Object {
                "type": "edges",
                "x": 1,
                "y": 0,
              },
              Object {
                "type": "edges",
                "x": 0,
                "y": 1,
              },
              Object {
                "type": "edges",
                "x": 1,
                "y": 2,
              },
              Object {
                "type": "edges",
                "x": 0,
                "y": 3,
              },
              Object {
                "type": "edges",
                "x": 1,
                "y": 4,
              },
              Object {
                "type": "edges",
                "x": 3,
                "y": 0,
              },
              Object {
                "type": "edges",
                "x": 2,
                "y": 1,
              },
              Object {
                "type": "edges",
                "x": 3,
                "y": 2,
              },
              Object {
                "type": "edges",
                "x": 2,
                "y": 3,
              },
              Object {
                "type": "edges",
                "x": 3,
                "y": 4,
              },
              Object {
                "type": "edges",
                "x": 4,
                "y": 1,
              },
              Object {
                "type": "edges",
                "x": 4,
                "y": 3,
              },
            ]
        `);
    });
});
