import { chunk } from "lodash";
import { PuzzleManager } from "../PuzzleManager";
import { hopStraight } from "../algorithms/hopStraight";
import type { EncodedColor, EncodedPointType } from "../encoding/puzzleEncoder";
import { Grid, Point, PointType, SVGGroup, TupleVector, type Color } from "../types";
import { COLOR_VALUE_TO_NAME, DEFAULT_COLORS } from "../utils/colors";
import { parseIntBase, zip } from "../utils/data";
import { Vec } from "../utils/math";
import { notify } from "../utils/notifications";
import { randomStringId, stringifyAnything } from "../utils/string";
import styles from "./styles.module.css";

export type SquareGridParams = {
    type: "square";
    width: number;
    height: number;
    minX: number;
    minY: number;
};

// TODO: Remove GridPoint type or replace with a thin wrapper around the Vector class. Or just straight up use _SquareGridPoints. I need an array most of the time anyways.
type GridPoint = { x: number; y: number; type: PointType };

// TODO: Eventually, there will be more generic types called GridTransformer and GridPoints that the _Square* variants will `implement`. But I don't know what their abstraction will be. I will wait until I add another grid type to decide on that (most likely hex grid).
// interface GridPoints<PT extends PointType = PointType> {
//     type: PT;
//     toSVGPoints(settings: Pick<PuzzleManager["settings"], "cellSize">): Map<FancyVector, Vector>;
// }

type Settings = Pick<PuzzleManager["settings"], "cellSize">;

class _SquareGridPoints<PT extends PointType = PointType> {
    constructor(
        public type: PT,
        public settings: Settings,
    ) {}

    points: Vec[] = [];

    adjacent(type: PointType) {
        const t2t = `${this.type}->${type}` as `${PointType}->${PointType}`;

        if (t2t === "cells->cells" || t2t === "corners->corners" || t2t === "edges->edges") {
            throw notify.error({ message: "trying to find points adjacent to its own type" });
        }

        const map = new Map<Vec, Vec[]>();

        if (t2t === "edges->cells" || t2t === "edges->corners") {
            const upDown: TupleVector[] = [
                [0, -1],
                [0, 1],
            ];
            const leftRight: TupleVector[] = [
                [-1, 0],
                [1, 0],
            ];

            for (const point of this.points) {
                // deltas = (t2t === edges->cells) XOR (x is even) ? upDown : leftRight
                const deltas = (type === "cells") !== !(point.x & 1) ? upDown : leftRight;

                const neighbors = deltas.map((delta) => point.plus(delta));
                map.set(point, neighbors);
            }
            return [map] as const;
        }

        let deltas: TupleVector[];
        if (t2t === "corners->cells" || t2t === "cells->corners") {
            deltas = [
                [1, 1],
                [-1, 1],
                [1, -1],
                [-1, -1],
            ];
        } else {
            deltas = [
                [0, 1],
                [0, -1],
                [1, 0],
                [-1, 0],
            ];
        }
        for (const point of this.points) {
            const neighbors = deltas.map((delta) => point.plus(delta));
            map.set(point, neighbors);
        }
        return [map] as const;
    }

    toSVGPoints() {
        const { cellSize } = this.settings;
        const halfCell = cellSize / 2;
        // TODO: Map.fromEntries()
        const map = new Map<Vec, TupleVector>();
        for (const point of this.points) {
            map.set(point, point.scale(halfCell).xy);
        }
        return map;
    }
}

// TODO: I don't have a clear sense on which methods should be in the transformer and which on GridPoints, as well as the general format of return types...
class _SquareGridTransformer {
    constructor(public settings: Settings) {}

    fromPoints<PT extends PointType = PointType>(type: PT, points: readonly Point[]) {
        const gp = new _SquareGridPoints<PT>(type, this.settings);
        const map = new Map<string, Vec>();
        for (const point of points) {
            const vec = Vec.from(point.split(",").map(parseIntBase(10)) as TupleVector);
            // TODO: Verify that `point` has PointType = `type`. How to deal with values that are not? Treat them as nulls or just filter?
            gp.points.push(vec);
            map.set(point, vec);
        }

        return [map, gp] as const;
    }

    // TODO: I only have this as a map because some grids in the future will have different sized cells. I could also have this as a method/attribute-property of _SquareGridPoints that is static for grid but dynamic for other grids.
    maxRadius({
        type,
        shape,
        size,
    }: {
        type: PointType;
        shape: "square" | "circle";
        size: "lg" | "md" | "sm";
    }) {
        // TODO: I'm literally making up these values as I go along... I need a more cohesive understanding of how these will be used before deciding on definite values. Alternatively, I can allow a value from [0%, 100%] and then it's up to the layer to provide sensible defaults.
        const shapeMap: Record<PointType, Record<typeof shape, number>> = {
            cells: { square: 1, circle: 1 },
            corners: { square: 0.9, circle: 1 },
            edges: { square: 0.8, circle: 0.8 },
        };
        const sizeMap: Record<PointType, Record<typeof size, number>> = {
            cells: { lg: 0.9, md: 0.5, sm: 0.2 },
            corners: { lg: 0.8, md: 0.4, sm: 0.1 },
            edges: { lg: 0.8, md: 0.4, sm: 0.2 },
        };

        return (this.settings.cellSize / 2) * shapeMap[type][shape] * sizeMap[type][size];
    }

    sorter({ direction = "NW" } = { direction: "NW" }) {
        type Sorter = (a: Vec, b: Vec) => number;
        const sorters: Record<string, Sorter> = {
            N: (a, b) => a.y - b.y,
            S: (a, b) => b.y - a.y,
            E: (a, b) => b.x - a.x,
            W: (a, b) => a.x - b.x,
        };
        const primary = sorters[direction[0]];
        const secondary = sorters[direction[1]];

        if (!primary || !secondary) {
            throw notify.error({
                message: `direction=${direction} must be two characters made from "NESW"`,
            });
        }

        return ((a, b) => primary(a, b) || secondary(a, b)) satisfies Sorter;
    }

    svgOutline(gp: _SquareGridPoints<"cells">) {
        const map = new Map<Vec, Vec[]>();
        for (const point of gp.points) {
            map.set(point, [
                point.plus([1, 1]).scale(this.settings.cellSize / 2),
                point.plus([1, -1]).scale(this.settings.cellSize / 2),
                point.plus([-1, -1]).scale(this.settings.cellSize / 2),
                point.plus([-1, 1]).scale(this.settings.cellSize / 2),
            ]);
        }
        return [map] as const;
    }

    shrinkwrap(gp: _SquareGridPoints<"cells">, { inset = 0 } = {}) {
        return Array.from(this._shrinkwrap({ inset, gp, halfCell: this.settings.cellSize / 2 }));
    }

    /*
     * Here is how inset is handled:
     *   Say we have a single group that loops around and has two corners that touch
     *   (asterisks are inside the group):
     *   **|
     *   --+--
     *     |**
     *
     *   When inset >= 0, then we get a nice drawing of two corners not touching.
     *   **|
     *   --.
     *       .--
     *       |**
     *
     *   But if inset > 0, then we would draw two corners overlapping, and that's ugly.
     *   So instead, we merge the corners taking the "intersection" of the two corners:
     *   ****|
     *   ****+--
     *   --+****
     *     |****
     *
     *   To find the lines in the correct order, we travel along the edges clockwise and
     *   pick the first edge from the counterclockwise direction when inset <= 0, and
     *   from the clockwise direction when inset > 0.
     */
    *_shrinkwrap(arg: { inset: number; gp: _SquareGridPoints<"cells">; halfCell: number }) {
        const { inset, gp, halfCell } = arg;
        if (!gp.points.length) return;
        const [edgeMap] = gp.adjacent("edges");

        // I really wish JS had a tuple type that worked with strict equality...
        // Because we don't, we must resort to string conversion when checking for equality.
        type Sadness = string;
        /** edgeString => [edge, cell] */
        const edgeShell = new Map<Sadness, [Vec, Vec]>();

        for (const [cell, edges] of edgeMap.entries()) {
            for (const edge of edges) {
                const edgeString = edge.xy.join(",");
                // Add edges only if there is one neighboring cell, otherwise delete
                if (!edgeShell.delete(edgeString)) edgeShell.set(edgeString, [edge, cell]);
            }
        }

        // eggShell, heh
        const TheEggShellWasEmpty = () =>
            notify.error({
                message: "Shrinkwrap: the generated edgeShell was unexpectedly empty",
            });

        const { value: start, done } = edgeShell.values().next();
        if (done) throw TheEggShellWasEmpty();
        let [edge, cell] = start;
        let startingEdge = edge;

        /** Array<[Corner, Normal]> */
        let cornersNormals: Array<[Vec, Vec]> = [];

        const nextEdgeDirection = inset >= 0 ? [1, 0, -1] : [-1, 0, 1];
        let maxIteration = 1000;

        while (--maxIteration > 0) {
            const normal = cell.drawTo(edge);
            const forward = normal.rotate90(1);
            const nextCorner = edge.plus(forward);
            cornersNormals.push([nextCorner, normal]);

            for (const rotation of nextEdgeDirection) {
                const nextEdge = nextCorner.plus(forward.rotate90(rotation));
                const nextValue = edgeShell.get(nextEdge.xy.join(","));
                if (!nextValue) continue;
                [edge, cell] = nextValue;
                break;
            }
            edgeShell.delete(edge.xy.join(","));
            if (edge === startingEdge) {
                // We closed the loop and must yield this section of loop, after applying inset
                const corners: Vec[] = [];

                let nextNormal = cornersNormals[0][1];
                cornersNormals.reverse();

                for (const [corner, normal] of cornersNormals) {
                    if (!normal.equals(nextNormal)) {
                        corners.push(
                            corner.scale(halfCell).minus(normal.plus(nextNormal).scale(inset)),
                        );
                    }
                    nextNormal = normal;
                }
                corners.reverse();
                cornersNormals = [];

                yield corners.map((vec) => vec.xy.join(",")) satisfies string[];
                if (!edgeShell.size) return;

                const { value, done } = edgeShell.values().next();
                if (done) throw TheEggShellWasEmpty();
                [edge, cell] = value;
                startingEdge = edge;
            }
        }
        throw notify.error({ message: "Max iteration reached in shrinkwrap algorithm" });
    }

    /**
     * Detects if the points are orthogonally connected or not, false if more than one group.
     * TODO: deprecate once I decide on how I'm gonna write pt.adjacencyTrees() or whatever its name ends up being.
     */
    isFullyConnected(cellMap: Map<string, Vec>): boolean {
        if (cellMap.size <= 1) return true;

        cellMap = new Map(cellMap.entries());

        const stillLeft = [cellMap.keys().next().value as string];
        let next;

        while ((next = stillLeft.pop()) !== undefined) {
            const point = cellMap.get(next);
            if (!point) continue;
            cellMap.delete(next);

            const adjacent = [
                point.plus([0, 2]),
                point.plus([2, 0]),
                point.plus([0, -2]),
                point.plus([-2, 0]),
            ].map((cell) => cell.xy.join(","));
            for (const adj of adjacent) {
                if (cellMap.has(adj)) {
                    stillLeft.push(adj);
                }
            }
        }

        return cellMap.size === 0;
    }
}

class _SquareGridEncoder {
    constructor(
        public params: SquareGridParams,
        public settings: Settings,
    ) {}

    // TODO: Assumes grid points are inside the grid
    encodeGridPointsInsideGrid(gp: _SquareGridPoints) {
        return this._encodeGridPointsInsideGrid(gp.type, gp.points);
    }

    // TODO: Maybe I don't need the above method for this purpose. I don't know...
    _encodeGridPointsInsideGrid(pointType: PointType, points: Vec[]) {
        if (pointType !== "cells" && pointType !== "corners") {
            throw Error("Only supports cells and corners for now");
        }

        const map = new Map<Vec, number>();
        const { minX, minY, width: _width } = this.params;
        const width = pointType === "corners" ? _width + 1 : _width;

        for (const point of points) {
            const { x, y } = point;
            map.set(point, width * ((y >> 1) - minY) + ((x >> 1) - minX));
        }
        return map;
    }

    decodeGridPointsInsideGrid(pointType: PointType, points: number[]) {
        if (pointType !== "cells" && pointType !== "corners") {
            throw Error("Only supports cells and corners for now");
        }

        const map = {} as Record<number, Vec>;
        const offset = pointType === "corners" ? 0 : 1;
        const minX = (this.params.minX << 1) + offset;
        const minY = (this.params.minY << 1) + offset;
        const width = this.params.width + 1 - offset;
        for (const n of points) {
            // TODO: Assumes cellSize is always 2. Should I just do that from now on?
            map[n] = new Vec((n % width << 1) + minX, ((n / width) << 1) + minY);
        }
        return map;
    }

    // TODO: _SquareGridAdjacentPoints or something like that
    encodeAdjacentGridPointsInsideGrid(pointType: PointType, points: Array<[Vec, Vec]>) {
        if (pointType !== "cells" && pointType !== "corners") {
            throw Error("Only supports cells and corners for now");
        }

        const down = new Vec(0, 2);
        const right = new Vec(2, 0);
        const CHUNK_SIZE = 8;
        const downRightBitmap = [];

        // TODO: Because SimpleLine sorts points as strings, it will draw the line (11,y) to (9,y) backwards (not going down or right)
        points = points.map((pair) => pair.sort((a, b) => a.x - b.x || a.y - b.y));

        for (const byte of chunk(points, CHUNK_SIZE)) {
            let bitmap = 0;
            for (const [start, end] of byte) {
                bitmap <<= 1;

                if (start.plus(down).equals(end)) {
                    bitmap |= 1;
                } else if (!start.plus(right).equals(end)) {
                    throw notify.error(
                        `Encoding adjacent points failed. Ending point not down or right of start: ${stringifyAnything(
                            [start, end],
                        )}`,
                    );
                }
            }

            if (byte.length < CHUNK_SIZE) {
                bitmap <<= CHUNK_SIZE - byte.length;
            }
            downRightBitmap.push(bitmap);
        }

        const startingPointVecs = points.map(([start]) => start);
        const pointMap = this._encodeGridPointsInsideGrid(pointType, startingPointVecs);
        const startingPoints = startingPointVecs.map((vec) => pointMap.get(vec)!);

        return {
            startingPoints,
            downRightBitmap: Uint8Array.from(downRightBitmap),
        };
    }

    decodeAdjacentGridPointsInsideGrid(
        pointType: PointType,
        points: number[],
        downRightBitmap: Uint8Array,
    ) {
        if (pointType !== "cells" && pointType !== "corners") {
            throw Error("Only supports cells and corners for now");
        }
        const downRightArray = [...downRightBitmap]
            .flatMap((byte) => [
                byte & (1 << 7),
                byte & (1 << 6),
                byte & (1 << 5),
                byte & (1 << 4),
                byte & (1 << 3),
                byte & (1 << 2),
                byte & (1 << 1),
                byte & (1 << 0),
            ])
            .map(Boolean);

        const diff = downRightArray.length - points.length;
        if (diff < 0 || diff >= 8) {
            throw Error("Length of points and bitmap do not match closely enough");
        }

        const down = new Vec(0, 2);
        const right = new Vec(2, 0);

        const numberToVec = this.decodeGridPointsInsideGrid(pointType, points);
        const pairs = [] as Array<[Vec, Vec]>;

        for (const [n, downRight] of zip(points, downRightArray)) {
            const point = numberToVec[n];
            pairs.push([point, point.plus(downRight ? down : right)]);
        }
        return pairs;
    }

    // Don't want to be greedy, but these should be safe: !@#$&*()_-+=;':?,./~
    _baseCharacters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    // TODO: Constant across all grids
    /** @deprecated - I don't know if I need these methods yet... I'm not using them, so I'm not going to test them until I do (I'll hopefully remember since I added this "deprecation" warning) */
    encodeNonNegativeNumbersAsBaseConversion(numbers: number[], base: number): Uint8Array {
        const base16 = this.baseConvert(numbers, base, 16);

        if (base16.length & 1) {
            base16.unshift(1);
        } else if (base16.length && (base16[0] === 1 || (base16[0] === 0 && base16[1] === 0))) {
            base16.unshift(0, 0);
        }

        const base256 = new Uint8Array(base16.length / 2);
        for (let i = 0; i < base16.length; i += 2) {
            base256[i / 2] = 16 * base16[i] + base16[i + 1];
        }
        return base256;
    }

    /** @deprecated */
    decodeNonNegativeNumbersAsBaseConversion(numbers: Uint8Array, base: number): number[] {
        if (!numbers.length) return [];

        const base16 = [] as number[];
        for (const x of numbers) {
            base16.push(x >> 4, x & 0b1111);
        }

        if (numbers[0] === 0) {
            base16.splice(0, 2);
        } else if (base16[0] === 1) {
            base16.shift();
        }
        return this.baseConvert(base16, 16, base);
    }

    /** @deprecated */
    baseConvert(digits: number[], currentBase: number, targetBase: number): number[] {
        if (currentBase <= 1 || currentBase > 36 || targetBase <= 1 || targetBase > 36) {
            throw Error("Bases must be between 2, 36 inclusive");
        }
        const singleCharDigits =
            currentBase <= 10 ? digits : digits.map((char) => this._baseCharacters[char]);
        const base10 = parseInt(singleCharDigits.join(""), currentBase);

        // Efficiency? What is that?
        return [...base10.toString(targetBase).toUpperCase()].map((char) =>
            this._baseCharacters.indexOf(char),
        );
    }

    encodePointType(pointType: PointType): EncodedPointType {
        switch (pointType) {
            case "cells":
                return { cells: true };
            case "corners":
                return { corners: true };
            case "edges":
                // TODO: This is me reading old code, but I think the reason I
                // haven't encoded edges is because this actually should not be
                // pointType, but rather a relation of pointTypes (or a singular
                // one, as it is for now).
                throw Error(
                    "TODO: We failed and I don't even know if this method should be part of SquareGridEncoder",
                );
        }
    }

    decodePointType(pointType: EncodedPointType): PointType {
        if (pointType.cells) {
            return "cells";
        } else if (pointType.corners) {
            return "corners";
        } else {
            throw Error(
                "TODO: We failed and I don't even know if this method should be part of SquareGridEncoder",
            );
        }
    }

    // TODO: I should probably just stick to one function to stop premature optimizations
    encodeColor(color: Color): EncodedColor {
        return { [COLOR_VALUE_TO_NAME[color]]: true };
    }

    // Perhaps color enum values can be interned at startup?
    decodeColor(color: EncodedColor): Color {
        const enumVariant = Object.keys(color)[0];
        if (enumVariant in DEFAULT_COLORS) {
            return DEFAULT_COLORS[enumVariant as keyof typeof DEFAULT_COLORS];
        } else {
            throw Error(`Unknown color enum value: ${stringifyAnything(color)}`);
        }
    }
}

export class SquareGrid implements Grid {
    id = `SquareGrid-${randomStringId([])}`; // TODO: Filter other grid ids
    width = 1;
    height = 1;
    x0 = 0;
    y0 = 0;
    constructor(params?: SquareGridParams) {
        this.setParams(params);
    }

    getParams(): SquareGridParams {
        return {
            type: "square",
            width: this.width,
            height: this.height,
            minX: this.x0,
            minY: this.y0,
        };
    }

    setParams(params?: SquareGridParams) {
        this.width = params?.width ?? 1;
        this.height = params?.height ?? 1;
        this.x0 = params?.minX ?? 0;
        this.y0 = params?.minY ?? 0;
    }

    getCanvasRequirements: Grid["getCanvasRequirements"] = ({ settings }) => {
        const { cellSize, borderPadding } = settings;
        return {
            minX: this.x0 * cellSize - borderPadding,
            minY: this.y0 * cellSize - borderPadding,
            width: this.width * cellSize + 2 * borderPadding,
            height: this.height * cellSize + 2 * borderPadding,
        };
    };

    getCanvasResizers() {
        // TODO: introduce corner resizers that resize two sides at the same time.
        return [
            {
                name: "Top",
                x: 5,
                y: 0,
                rotate: 0,
                resize: (amount: number) => {
                    this.y0 -= amount;
                    this.height += amount;
                },
            },
            {
                name: "Right",
                x: 10,
                y: 5,
                rotate: 90,
                resize: (amount: number) => {
                    this.width += amount;
                },
            },
            {
                name: "Bottom",
                x: 5,
                y: 10,
                rotate: 180,
                resize: (amount: number) => {
                    this.height += amount;
                },
            },
            {
                name: "Left",
                x: 0,
                y: 5,
                rotate: 270,
                resize: (amount: number) => {
                    this.x0 -= amount;
                    this.width += amount;
                },
            },
        ];
    }

    selectPointsWithCursor: Grid["selectPointsWithCursor"] = ({
        settings,
        cursor: { x, y },
        pointTypes,
        deltas: dxy,
        previousPoint = null,
    }) => {
        const { cellSize } = settings;
        const halfCell = cellSize / 2;

        let deltas = dxy.map(({ dx, dy }) => new Vec(dx, dy));
        const cursor = new Vec(x / halfCell, y / halfCell);

        const firstPoint = new Vec(Math.floor(cursor.x), Math.floor(cursor.y));
        const targets = [
            firstPoint,
            firstPoint.plus([1, 0]),
            firstPoint.plus([0, 1]),
            firstPoint.plus([1, 1]),
        ].filter((p) => pointTypes.includes(this._stringToGridPoint(p.xy.join(",")).type));

        let start: Vec | undefined = undefined;
        if (previousPoint) {
            start = Vec.from(previousPoint.split(",").map(parseIntBase(10)) as TupleVector);

            // Filter any deltas that would backtrack
            const direction = start.drawTo(cursor);
            deltas = deltas.filter((vec) => vec.positiveAngleTo(direction) < Math.PI / 2);
        }

        const points = hopStraight({
            start,
            cursor,
            deltas,
            toString: (vec) => vec.xy.join(","),
            targets,
        });

        // TODO: Temporary hack to prevent selecting points outside the grid.
        return points.filter((point) => !this._outOfBounds(this._stringToGridPoint(point)));
    };

    getEncoder(settings: Settings) {
        return new _SquareGridEncoder(this.getParams(), settings);
    }

    getPointTransformer(settings: Settings) {
        return new _SquareGridTransformer(settings);
    }

    _outOfBounds(gridPoint: GridPoint) {
        const x = gridPoint.x / 2 - this.x0;
        const y = gridPoint.y / 2 - this.y0;
        return x < 0 || x > this.width || y < 0 || y > this.height;
    }

    _stringToGridPoint(point: Point): GridPoint {
        const [, x_, y_] = /^(-?\d+),(-?\d+)$/.exec(point) || [];
        const x = parseInt(x_);
        const y = parseInt(y_);
        const xEven = (x >> 1) << 1 === x,
            yEven = (y >> 1) << 1 === y;
        if (xEven && yEven) {
            return { x, y, type: "corners" };
        } else if (!xEven && !yEven) {
            return { x, y, type: "cells" };
        } else {
            return { x, y, type: "edges" };
        }
    }

    _getAllGridPoints(type: PointType): GridPoint[] {
        if (type === "cells") {
            const arr = [];
            for (let x = this.x0; x < this.x0 + this.width; x += 1) {
                for (let y = this.y0; y < this.y0 + this.height; y += 1) {
                    arr.push({ x: 2 * x + 1, y: 2 * y + 1, type });
                }
            }
            return arr;
        } else if (type === "corners") {
            const arr = [];
            for (let x = this.x0; x <= this.x0 + this.width; x += 1) {
                for (let y = this.y0; y <= this.y0 + this.height; y += 1) {
                    arr.push({ x: 2 * x, y: 2 * y, type });
                }
            }
            return arr;
        } else if (type === "edges") {
            const arr = [];
            for (let x = this.x0; x <= this.x0 + this.width; x += 1) {
                for (let y = this.y0; y <= this.y0 + this.height; y += 1) {
                    if (x < this.x0 + this.width) arr.push({ x: 2 * x + 1, y: 2 * y, type });

                    if (y < this.y0 + this.height) arr.push({ x: 2 * x, y: 2 * y + 1, type });
                }
            }
            return arr;
        } else {
            throw notify.error({ message: `Unrecognized point type=${type}` });
        }
    }

    getAllPoints(type: PointType) {
        return this._getAllGridPoints(type).map(({ x, y }) => `${x},${y}`);
    }

    _getSVG: Grid["_getSVG"] = ({ blacklist, settings }) => {
        const pt = this.getPointTransformer(settings);
        const minX = 2 * this.x0 - 1;
        const minY = 2 * this.y0 - 1;
        const maxX = 2 * (this.x0 + this.width) + 1;
        const maxY = 2 * (this.y0 + this.height) + 1;

        // TODO: CellOutline should be filtering out of bound points from being selected in the first place, but this solves any duplication issues for now.
        const outside = new Set([...blacklist]);
        for (let x = minX; x <= maxX; x += 2) {
            outside.add(`${x},${minY}`);
            outside.add(`${x},${maxY}`);
        }
        for (let y = minY; y <= maxY; y += 2) {
            outside.add(`${minX},${y}`);
            outside.add(`${maxX},${y}`);
        }
        const [, cells] = pt.fromPoints("cells", [...outside]);

        // We get the main border of the grid by shrinkwraping the cells just outside the grid + any cells removed by the user (blacklist)
        // This is generally faster than processing all the cells in the grid, `2x + 2y + 4` vs `x * y`.
        const inset = 4;
        const shrinkwrap = pt.shrinkwrap(cells, { inset });
        // ... but that adds an extra shell that needs to be removed; we do that here.
        const hc = settings.cellSize / 2;
        let outlierCorner: string | null = `${hc * (minX - 1) + inset},${hc * (minY - 1) + inset}`;

        for (const [index, group] of Object.entries(shrinkwrap)) {
            if (group.includes(outlierCorner)) {
                shrinkwrap.splice(parseInt(index), 1);
                outlierCorner = null;
                break;
            }
        }
        if (outlierCorner) {
            notify.error({ message: "Could not remove extra grid border" });
        }
        const outline: SVGGroup["elements"] = new Map();
        for (const [key, points] of Object.entries(shrinkwrap)) {
            outline.set(key, { points: points.join(" "), className: styles.gridSolidOutline });
        }

        const edgeBlacklist = new Set<Point>();
        for (const point of cells.points) {
            edgeBlacklist.add(point.plus([-1, 0]).xy.join(","));
            edgeBlacklist.add(point.plus([1, 0]).xy.join(","));
            edgeBlacklist.add(point.plus([0, -1]).xy.join(","));
            edgeBlacklist.add(point.plus([0, 1]).xy.join(","));
        }

        const edges: SVGGroup["elements"] = new Map();
        const edgePoints = this.getAllPoints("edges").filter((edge) => !edgeBlacklist.has(edge));
        const [edgeMap] = pt.fromPoints("edges", edgePoints);

        const halfCell = settings.cellSize / 2;
        for (const [key, edge] of edgeMap.entries()) {
            const cornerOffset: TupleVector = edge.x & 1 ? [1, 0] : [0, 1];
            const a = edge.minus(cornerOffset).scale(halfCell);
            const b = edge.plus(cornerOffset).scale(halfCell);
            edges.set(key, {
                x1: a.x,
                y1: a.y,
                x2: b.x,
                y2: b.y,
                className: styles.gridInternalLines,
            });
        }

        return [
            {
                id: "grid",
                type: "line",
                elements: edges,
            },
            {
                id: "outline",
                type: "polygon",
                elements: outline,
            },
        ];

        // Potentially better, but not simple method of getting the edge blits
        // Blacklist the corners
        // const filterX = new DefaultMap<number, Set<number>>(() => new Set());
        // const filterY = new DefaultMap<number, Set<number>>(() => new Set());
        // for (const { x, y } of cells.points) {
        //     filterX.get(x - 1).add(y - 1, y + 1);
        //     filterX.get(x + 1).add(y - 1, y + 1);
        //     filterY.get(y - 1).add(x - 1, x + 1);
        //     filterY.get(y + 1).add(x - 1, x + 1);
        // }

        // ,const edges: LineBlits["blits"] = {};
        // for (let x = minX; x <= maxX; x += 2) {
        //     outside.add(`${x},${minY}`);
        //     outside.add(`${x},${maxY}`);
        // }
        // for (let y = minY; y <= maxY; y += 2) {
        //     outside.add(`${minX},${y}`);
        //     outside.add(`${maxX},${y}`);
        // }
    };
}
