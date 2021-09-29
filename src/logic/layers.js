export class CellOutlineLayer {
    // -- Identification --
    static id = "Cell Outline";
    static unique = true;
    hidden = true;

    // -- Controls --
    controls = "onePoint";
    pointTypes = ["cells"];
    states = [true, false];
    drawMultiple = true;

    // -- Encoding/decoding --
    // TODO: by the by: https://en.wikipedia.org/wiki/Vigen%C3%A8re_cipher
    encoderPrefix = "o";
    encode(grid, settings) {}
    decode(grid, settings) {}

    // -- Rendering --
    defaultRenderOrder = 2;
    getBlits(grid, storage) {
        const points = storage
            .getLayerObjects({ layer: this })
            .filter(({ state }) => !state)
            .map(({ point }) => point);
        const { cells, shrinkwrap } = grid.getPoints({
            selection: {
                cells: { edges: { self: { points: true } } },
                shrinkwrap: { self: { offset: -5 } },
            },
            blacklist: points,
        });

        const useThickEdges = {};
        for (let cell in cells) {
            if (cell in points) {
                continue;
            }
            for (let edge in cells[cell].edges) {
                /* If a cell does not share an edge with another cell, use a thick line. */
                if (useThickEdges[edge]) {
                    useThickEdges[edge] = false;
                } else {
                    useThickEdges[edge] = true;
                }
            }
        }

        const blitGroups = [
            {
                blitter: "line",
                blits: [],
                style: {
                    stroke: "black",
                    strokeWidth: 1,
                    strokeLinecap: "square",
                },
            },
            {
                blitter: "line",
                blits: [],
                style: {
                    stroke: "black",
                    strokeWidth: 10,
                    strokeLinecap: "square",
                },
            },
        ];
        for (let cellKey in cells) {
            for (let edgeKey in cells[cellKey].edges) {
                const { points } = cells[cellKey].edges[edgeKey];
                if (!useThickEdges[edgeKey]) {
                    blitGroups[0].blits.push(points);
                }
            }
        }
        for (let loop of shrinkwrap) {
            for (let index in loop) {
                blitGroups[1].blits.push([
                    loop[index],
                    loop[(1 * index + 1) % loop.length],
                ]);
            }
        }
        return blitGroups;
    }
}

export class SelectionLayer {
    static id = "Selections";
    static unique = true;

    hidden = true;
    controls = "onePoint";
    pointTypes = ["cells"];

    defaultRenderOrder = 9;
    encoderPrefix = "S";
    getBlits(grid, settings, change) {
        // TODO
        return [];
    }
}

export class ColorLayer {
    static id = "Background Color";
    static unique = false;

    hidden = false;
    controls = "onePoint";
    pointTypes = ["cells"];
    drawMultiple = true;

    defaultRenderOrder = 1;
    encoderPrefix = "c";

    getBlits(grid, settings, change) {
        const points = grid
            .getObjects({ layerId: this.id })
            .map(({ points }) => points[0]);
        const { cell: cells } = grid.getPoints({
            selection: { cell: { self: { svgOutline: true } } },
            points,
        });
        return [
            {
                blitter: "svgPath",
                style: { fillStyle: "blue" },
                blits: Object.keys(cells).map((key) => cells[key].svgOutline),
            },
        ];
    }
}

const layers = [CellOutlineLayer, ColorLayer, SelectionLayer];
export const availableLayers = {};
for (let layer of layers) {
    availableLayers[layer.id] = layer;
}

/* The following classes are only there to see what capabilities I expect of pointTypes */
export class MazeWallLayer {
    // These maze walls can only be drawn between two corners *across* an edge
    controls = "twoPoint";
    pointTypes = { corner: { edge: { corner: true } } };
}

export class MazePathLayer {
    // These maze paths can only be drawn between two centers *across* an edge
    controls = "twoPoint";
    pointTypes = { center: { edge: { center: true } } };
}

export class SudokuKillerSumLayer {
    // The arrow can only start on a center and end on a corner.
    controls = "twoPointOrdered";
    pointTypes = { center: { corner: true } };
}

export class SudokuArrowSumLayer {
    /* A sudoku arrow starts in a center and can cross an adjacent edge or corner to reach the next center */
    controls = "multiPointOrdered";
    pointTypes = { center: { corner: { center: true } } };
}

export class CellDividerLayer {
    // If on a square grid, this can be used for the walls puzzle invented by Naoki Inaba
    controls = "twoPoint";
    pointTypes = {
        edge: {
            center: { edge: true },
            corner: { edge: false },
        },
    };
}

/* This describes all of the properties of a layer. Doesn't actually do anything otherwise */
// eslint-disable-next-line no-unused-vars
class DummyLayer {
    /* Prevents objects from being placed in the same spot. Set to a symbol to allow multiple instances of this layer per grid or to a string to prevent it. */
    id = Symbol();
    /* A human readable string describing the layer with a short phrase. */
    displayName = "Displayed to the user in the sidebar (Do not use)";
    /* A function that optionally takes the displayName and returns a new name. Only set when duplicate layers are involved, or perhaps to allow users to name their layers. */
    // TODO: handle duplicate layers using this api
    actualDisplayName = (name) => `${name} (2nd layer of that type)`;

    /* If true, the layer is hidden from the sidebar. Otherwise, it's added to the "layer modifiers" list, if it's a new layer. Because that only applies to new layers, CellOutlineLayer and SelectionLayer are not listed as modifiers since they are added when the grid is created. */
    hidden = true;

    /* Lists the id(s) of parent and child layers. Even if a child layer is the current layer, certain operations are intercepted by the parent layer. These operations include how controls are handled, object storage and encoding, and possibly more. This is what makes things like layer modifiers and composite layers possible. For layers with onePoint controls, the parentLayer is set to SelectionLayer by default, and the layer is obviously added to SelectionLayer's childLayers. For other layers, a parent is usually assigned long after instantiation by adding a modifier that affects the layer. The modifier becomes the parent. */
    parentLayer;
    childLayers;

    /* Grids are represented by their lattice containing cells, edges, and corners. We define that cells, edges, and corners can be adjacent to each other, e.g. a cell is adjacent to the edges and corners surrounding it. But contrary to common definitions, a cell cannot be adjacent to another cell and same with edges to edges and corners to corners. Instead, a center is adjacent to an edge or corner which is adjacent to a center. This allows for more control over which lattice points are selected when a user is drawing the object. */

    /* controls categorizes objects by the number of lattice points required and if order matters. The options are: onePoint, twoPoint, multiPoint, multiPointOrdered, and custom. For example, sudoku digits are onePoint, one segment lines or simple arrows are twoPoint, multi-cell lines like German Whiskers and sudoku arrows are multiPointOrdered, and unordered collections of points like killer cages and selection boxes are multiPoint. Custom is special and will not be implemented for a while, but it will allow for things like using a custom image as the background, drawing with arbitrary bezier curves, etc. The layer itself will handle raw user input. */
    controls = "onePoint";

    /* For onePoint and multiPoint controls, you can simply list a subset of [cell, edge, corner] as points the layer can use. For twoPoint, twoPointOrdered, and multiPointOrdered, it is a bit more complicated because there is an inherit direction in how the object is drawn. To maximize control and generalization and minimize boilerplate, the layer whitelists or blacklists starting and ending points according to which points are adjacent to which. The best way to understand this is to read the code for existing layers and observe how they react to drawing motions. */
    pointTypes = ["cell"];

    /* Are you allowed to (un)draw multiple objects in one touch-drag */
    drawMultiple = true;

    /* `states` is only used for layers with onePoint controls. Not all onePoint layers have to use this interface. If states is defined, the first element is the default state placed in every point. The order of the states determines how states are cycled when clicked/tapped on repeatedly. If states is used, those are the only possible states for this layer. That might change in the future though, I'm not certain if it needs to remain that way... */
    states = [undefined, "on", "off", "a fourth state added later :)"];

    /* For onePoint layers, it can be convenient or even necessary to have a default state at every point. It must be a primitive type or a shallow object. Use a function if the default state depends on the grid parameters or if the state is nested. Cannot be used in conjunction with `states`. */
    defaultState = {
        prop1: true,
        asdf: 2,
        nestedObjectsAreNotAllowed: {
            useAFunctionInstead: true,
        },
    };

    /* storageParams allow a layer to specify a default object storage and encoding/decoding system. The core mechanics are partially restricted by what `controls` is set to, since it makes no sense to store onePoint data in multiPoint storage and vice versa. For onePoint layers, set this to an empty object; there are no parameters needed. If however, storageParams is not provided, the layer must define appropriate methods for storage, retrieval, encoding, and decoding. */
    storageParams = {
        /* Only applicable to twoPoint and multiPointOrdered layers.This is mostly used for determining if there is a duplicate object in the same spot. For example, it's reasonable for two arrows to be in the same spot facing opposite directions, but it isn't for two simple lines. */
        directional: false,
        /* Applicable to all but onePoint. Simply, are objects allowed to share any points? Note that overlapping is not the same as crossing over. For example, two lines can cross even if the set of points that define the lines don't intersection (overlap). */
        // TODO: consider replacing this value with a `maxOverlap` number to give more control.
        allowOverlap: false,
    };

    /* When a puzzle is encoded, each layer is encoded and then joined by exclamation marks. "Standard library" layers use a single char string to prefix its encoded layer string to mark which layer it is. "Preset" layers (which contain multiple layers) are namespaced with a single P (case sensitive) to avoid clashes with regular layers. External or modded layers are namespaced by an X. Therefore, PX would be an external preset.
    After the prefix, required modifiers are listed in a layer-agnostic format followed by optional params in a layer-specific format, followed finally by the data of the layer. The layer specific data must only contain characters from [0-9a-zA-Z().'_-].
    Example: ...!X<prefix>*<modifier1>*<modifier2>*<param1>.<param2>.<last-param>.<layer-data>!...
     */

    /* defaultRenderOrder determines what order layers are rendered *by default*. Users are allowed to reorder layers according to their needs. Smaller numbers are inserted into the layer array below larger ones. Sometimes render order is not enough to handle all rendering issues, e.g. ColorLayer might be drawn above CellOutlineLayer and has to deal with smaller cells around the edge of the grid (because the grid edge uses a thicker line). In this case, use occlusion tests. */
    // TODO: Always draw the thicker grid edges such that cells always have the same size. This helps with layers like ColorLayer, except maybe it doesn't matter at all... I will have a query system to get things like the largest circle or square possible in a cell/point, so I could simply have another for getting the cell outline as an svg path and simply avoid this whole issue. I'll probably do both and have cells be the same size as well as adding the cell outline query.
    defaultRenderOrder = 2;

    /* This is always a string. */
    encoderPrefix = "d";
    encode(grid, settings) {}
    decode(grid, settings) {}

    /* The main purpose of this function is to return all objects of the layer decomposed into individual "blits". Blits are simply ways to decompose objects into drawable parts. For example, a sudoku arrow is made of a circle and multiple lines marking the arrow's path and tip. For some layers, it might not make sense to try to use existing blitters, e.g. for a goats and sheep puzzle. In this case, a layer and a corresponding blitter must be added. Note: this function does not simply return an array of blits for a good reason. Blits are grouped by their respective object so that filters/modifiers/occlusionTests can change how objects are displayed, e.g. by hiding them, changing their color, offsetting them slightly, adding other blits to the object to make them more prominent, etc. After all these modifications are made, the blits are put into an array and finally drawn to the screen! Unfortunately, it's not as simple as that because there is a fair amount of ambiguity about what order they are drawn to the screen. Going back to sudoku arrows, let's say we want the path of arrow A to run under the circle of A (by drawing the path first), but it should be drawn on top of the circle of B. This is all hypothetical, but it is similar to the problem how to install circular dependencies in library packaging. For now, each object stored its blits in an array and for each object the blits in array position 0 are drawn, then position 1, etc. This might change in the future or have a method to change this behaviour. Eventually, I want to have this return diffs/changes of all the objects for optimization, but that requires the whole chain of operations to account for diffs and I'm not ready for that. */
    getBlits(grid, settings, change) {}
}
