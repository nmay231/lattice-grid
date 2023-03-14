import { SquareGrid } from "./SquareGrid";

describe("SquareGrid", () => {
    const common = { minX: 0, minY: 0, type: "square" as const };
    const smallGrid = new SquareGrid({ ...common, width: 2, height: 2 });
    const mediumGrid = new SquareGrid({ ...common, width: 10, height: 10 });

    it("knows points are within bounds", () => {
        expect([
            mediumGrid._outOfBounds({ x: 1, y: 1, type: "cells" }),
            mediumGrid._outOfBounds({ x: 1, y: 19, type: "cells" }),
            mediumGrid._outOfBounds({ x: 19, y: 1, type: "cells" }),
            mediumGrid._outOfBounds({ x: 19, y: 19, type: "cells" }),
        ]).toEqual([false, false, false, false]);
    });

    it("knows points are outside bounds", () => {
        expect([
            mediumGrid._outOfBounds({ x: -1, y: -1, type: "cells" }),
            mediumGrid._outOfBounds({ x: 10, y: 21, type: "edges" }),
            mediumGrid._outOfBounds({ x: 21, y: 10, type: "edges" }),
            mediumGrid._outOfBounds({
                x: 1000000,
                y: 1000000,
                type: "corners",
            }),
        ]).toEqual([true, true, true, true]);
    });

    it("generates all cell grid points", () => {
        const cells = smallGrid._getAllGridPoints("cells");
        expect(cells).toEqual([
            { type: "cells", x: 1, y: 1 },
            { type: "cells", x: 1, y: 3 },
            { type: "cells", x: 3, y: 1 },
            { type: "cells", x: 3, y: 3 },
        ]);
    });

    it("generates all corner grid points", () => {
        const corners = smallGrid._getAllGridPoints("corners");
        expect(corners).toEqual([
            { type: "corners", x: 0, y: 0 },
            { type: "corners", x: 0, y: 2 },
            { type: "corners", x: 0, y: 4 },
            { type: "corners", x: 2, y: 0 },
            { type: "corners", x: 2, y: 2 },
            { type: "corners", x: 2, y: 4 },
            { type: "corners", x: 4, y: 0 },
            { type: "corners", x: 4, y: 2 },
            { type: "corners", x: 4, y: 4 },
        ]);
    });

    it("generates all edge grid points", () => {
        const edges = smallGrid._getAllGridPoints("edges");
        expect(edges).toEqual([
            { type: "edges", x: 1, y: 0 },
            { type: "edges", x: 0, y: 1 },
            { type: "edges", x: 1, y: 2 },
            { type: "edges", x: 0, y: 3 },
            { type: "edges", x: 1, y: 4 },
            { type: "edges", x: 3, y: 0 },
            { type: "edges", x: 2, y: 1 },
            { type: "edges", x: 3, y: 2 },
            { type: "edges", x: 2, y: 3 },
            { type: "edges", x: 3, y: 4 },
            { type: "edges", x: 4, y: 1 },
            { type: "edges", x: 4, y: 3 },
        ]);
    });
});
